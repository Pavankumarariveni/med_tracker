import { db } from "../database/init.js";

export const getDailyTablets = async (req, res) => {
  try {
    const { date, user_id: userIdQuery } = req.query;
    if (!date) {
      return res.status(400).json({ error: "Date is required (YYYY-MM-DD)" });
    }
    const userId = parseInt(userIdQuery) || req.user.id;

    // If caretaker is querying another user's data, verify access
    if (userId !== req.user.id) {
      if (req.user.role !== "caretaker") {
        return res
          .status(403)
          .json({ error: "Unauthorized to access this user's data" });
      }
      const mapping = await db.get(
        "SELECT * FROM user_caretaker_mappings WHERE caretaker_id = ? AND patient_id = ?",
        [req.user.id, userId]
      );
      if (!mapping) {
        return res
          .status(403)
          .json({ error: "Not authorized to access this patient's data" });
      }
    }

    const schedules = await db.all(
      `
      SELECT ums.id AS schedule_id, ums.dose_time, ums.expected_time, ums.start_date, ums.end_date,
             st.tablet_id, t.name, t.dosage, t.type, st.quantity, ml.is_taken, ml.taken_at, ml.photo_path
      FROM user_medication_schedules ums
      JOIN schedule_tablets st ON ums.id = st.schedule_id
      JOIN tablets t ON st.tablet_id = t.id
      LEFT JOIN medication_logs ml ON ums.id = ml.schedule_id AND ml.log_date = ?
      WHERE ums.user_id = ? AND ums.start_date <= ? AND (ums.end_date IS NULL OR ums.end_date >= ?)
      ORDER BY ums.expected_time
      `,
      [date, userId, date, date]
    );

    res.json(schedules);
  } catch (error) {
    console.error("Error fetching daily tablets:", error);
    res.status(500).json({ error: "Failed to fetch daily tablets" });
  }
};

// export const addMedicationSchedule = async (req, res) => {
//   try {
//     const { user_id, dose_time, expected_time, start_date, end_date, tablets } =
//       req.body;
//     if (
//       !user_id ||
//       !dose_time ||
//       !start_date ||
//       !tablets ||
//       !Array.isArray(tablets)
//     ) {
//       return res
//         .status(400)
//         .json({ error: "Required fields missing or invalid" });
//     }

//     // Verify target user is a patient
//     const targetUser = await db.get("SELECT role FROM users WHERE id = ?", [
//       user_id,
//     ]);
//     if (!targetUser || targetUser.role !== "patient") {
//       return res.status(400).json({ error: "Target user is not a patient" });
//     }

//     // Verify caretaker is assigned to patient
//     const mapping = await db.get(
//       "SELECT * FROM user_caretaker_mappings WHERE caretaker_id = ? AND patient_id = ?",
//       [req.user.id, user_id]
//     );
//     if (!mapping) {
//       return res
//         .status(403)
//         .json({ error: "Not authorized to manage this patient's schedule" });
//     }

//     // Insert schedule
//     const scheduleResult = await db.run(
//       "INSERT INTO user_medication_schedules (user_id, dose_time, expected_time, start_date, end_date) VALUES (?, ?, ?, ?, ?)",
//       [user_id, dose_time, expected_time, start_date, end_date]
//     );
//     console.log("res_back", scheduleResult);
//     // Insert tablets for the schedule
//     for (const tablet of tablets) {
//       const { tablet_id, quantity } = tablet;
//       if (!tablet_id || !quantity) {
//         continue; // Skip invalid tablets
//       }
//       await db.run(
//         "INSERT INTO schedule_tablets (schedule_id, tablet_id, quantity) VALUES (?, ?, ?)",
//         [scheduleResult.lastID, tablet_id, quantity]
//       );
//     }

//     const schedule = await db.get(
//       "SELECT * FROM user_medication_schedules WHERE id = ?",
//       [scheduleResult.lastID]
//     );
//     const assignedTablets = await db.all(
//       "SELECT st.*, t.name, t.dosage, t.type FROM schedule_tablets st JOIN tablets t ON st.tablet_id = t.id WHERE st.schedule_id = ?",
//       [scheduleResult.lastID]
//     );

//     res.status(201).json({ schedule, tablets: assignedTablets });
//   } catch (error) {
//     console.error("Error adding medication schedule:", error);
//     res.status(500).json({ error: "Failed to add medication schedule" });
//   }
// };

export const addMedicationSchedule = async (req, res) => {
  let transaction;
  try {
    const { user_id, dose_time, expected_time, start_date, end_date, tablets } =
      req.body;

    // Validation
    if (
      !user_id ||
      !dose_time ||
      !start_date ||
      !tablets ||
      !Array.isArray(tablets)
    ) {
      return res
        .status(400)
        .json({ error: "Required fields missing or invalid" });
    }

    // Verify target user is a patient
    const targetUser = await db.get("SELECT role FROM users WHERE id = ?", [
      user_id,
    ]);
    if (!targetUser || targetUser.role !== "patient") {
      return res.status(400).json({ error: "Target user is not a patient" });
    }

    // Verify caretaker is assigned to patient
    const mapping = await db.get(
      "SELECT * FROM user_caretaker_mappings WHERE caretaker_id = ? AND patient_id = ?",
      [req.user.id, user_id]
    );
    if (!mapping) {
      return res
        .status(403)
        .json({ error: "Not authorized to manage this patient's schedule" });
    }

    // Validate tablet_ids
    for (const tablet of tablets) {
      if (!tablet.tablet_id || !tablet.quantity || tablet.quantity <= 0) {
        return res.status(400).json({ error: "Invalid tablet_id or quantity" });
      }
      const tabletExists = await db.get("SELECT id FROM tablets WHERE id = ?", [
        tablet.tablet_id,
      ]);
      if (!tabletExists) {
        return res
          .status(400)
          .json({ error: `Tablet ID ${tablet.tablet_id} does not exist` });
      }
    }

    // Start transaction
    await db.run("BEGIN TRANSACTION");
    transaction = true;

    // Insert schedule
    const scheduleResult = await db.run(
      "INSERT INTO user_medication_schedules (user_id, dose_time, expected_time, start_date, end_date) VALUES (?, ?, ?, ?, ?)",
      [user_id, dose_time, expected_time, start_date, end_date]
    );

    // Debug: Log result
    console.log("Schedule insert result:", scheduleResult);

    // Get the last inserted ID
    const idResult = await db.get("SELECT last_insert_rowid() as lastID");
    console.log("Last insert ID result:", idResult);

    // Check if ID is valid
    if (
      !idResult ||
      typeof idResult.lastID !== "number" ||
      idResult.lastID === 0
    ) {
      throw new Error(
        "Failed to retrieve schedule ID: Invalid or missing last_insert_rowid()"
      );
    }

    const schedule_id = idResult.lastID;

    // Insert tablets for the schedule
    for (const tablet of tablets) {
      const { tablet_id, quantity } = tablet;
      await db.run(
        "INSERT INTO schedule_tablets (schedule_id, tablet_id, quantity) VALUES (?, ?, ?)",
        [schedule_id, tablet_id, quantity]
      );
    }

    // Fetch the inserted schedule and tablets
    const schedule = await db.get(
      "SELECT * FROM user_medication_schedules WHERE id = ?",
      [schedule_id]
    );
    if (!schedule) {
      throw new Error("Failed to fetch inserted schedule");
    }

    const assignedTablets = await db.all(
      "SELECT st.*, t.name, t.dosage, t.type FROM schedule_tablets st JOIN tablets t ON st.tablet_id = t.id WHERE st.schedule_id = ?",
      [schedule_id]
    );

    // Commit transaction
    await db.run("COMMIT");

    res.status(201).json({ schedule, tablets: assignedTablets });
  } catch (error) {
    // Rollback transaction on error
    if (transaction) {
      await db.run("ROLLBACK").catch((rollbackErr) => {
        console.error("Rollback error:", rollbackErr);
      });
    }
    console.error("Error adding medication schedule:", error);
    res.status(500).json({ error: "Failed to add medication schedule" });
  }
};
export const markTabletTaken = async (req, res) => {
  try {
    const { schedule_id, log_date, is_taken, taken_at } = req.body;
    if (!schedule_id || !log_date || is_taken === undefined) {
      return res.status(400).json({ error: "Required fields missing" });
    }

    // Verify schedule belongs to the user
    const schedule = await db.get(
      "SELECT user_id FROM user_medication_schedules WHERE id = ?",
      [schedule_id]
    );
    if (!schedule || schedule.user_id !== req.user.id) {
      return res
        .status(403)
        .json({ error: "Unauthorized to update this schedule" });
    }

    const photoPath = req.file ? path.join("uploads", req.file.filename) : null;

    await db.run(
      `
      INSERT OR REPLACE INTO medication_logs (schedule_id, log_date, is_taken, taken_at, photo_path)
      VALUES (?, ?, ?, ?, ?)
      `,
      [schedule_id, log_date, is_taken, taken_at || null, photoPath]
    );

    const log = await db.get(
      "SELECT * FROM medication_logs WHERE schedule_id = ? AND log_date = ?",
      [schedule_id, log_date]
    );
    res.json(log);
  } catch (error) {
    console.error("Error marking tablet as taken:", error);
    res.status(500).json({ error: "Failed to mark tablet as taken" });
  }
};

export const getAdherenceStats = async (req, res) => {
  try {
    const { start_date, end_date, user_id: userIdQuery } = req.query;
    if (!start_date || !end_date) {
      return res
        .status(400)
        .json({ error: "Start and end dates are required" });
    }
    const userId = parseInt(userIdQuery) || req.user.id;

    // If caretaker is querying another user's data, verify access
    if (userId !== req.user.id) {
      if (req.user.role !== "caretaker") {
        return res
          .status(403)
          .json({ error: "Unauthorized to access this user's data" });
      }
      const mapping = await db.get(
        "SELECT * FROM user_caretaker_mappings WHERE caretaker_id = ? AND patient_id = ?",
        [req.user.id, userId]
      );
      if (!mapping) {
        return res
          .status(403)
          .json({ error: "Not authorized to access this patient's data" });
      }
    }

    const schedules = await db.all(
      "SELECT id FROM user_medication_schedules WHERE user_id = ?",
      [userId]
    );

    const adherenceData = await Promise.all(
      schedules.map(async (schedule) => {
        const tablets = await db.all(
          `
          SELECT t.name, t.dosage, t.type, st.quantity
          FROM schedule_tablets st
          JOIN tablets t ON st.tablet_id = t.id
          WHERE st.schedule_id = ?
          `,
          [schedule.id]
        );

        const totalDoses = await db.get(
          `
          SELECT COUNT(*) as count
          FROM medication_logs
          WHERE schedule_id = ? AND log_date BETWEEN ? AND ?
          `,
          [schedule.id, start_date, end_date]
        );

        const takenDoses = await db.get(
          `
          SELECT COUNT(*) as count
          FROM medication_logs
          WHERE schedule_id = ? AND log_date BETWEEN ? AND ? AND is_taken = 1
          `,
          [schedule.id, start_date, end_date]
        );

        return {
          schedule_id: schedule.id,
          tablets,
          total_doses: totalDoses.count,
          taken_doses: takenDoses.count,
          adherence_percentage:
            totalDoses.count > 0
              ? (takenDoses.count / totalDoses.count) * 100
              : 0,
        };
      })
    );

    const totalDoses = adherenceData.reduce(
      (sum, sch) => sum + sch.total_doses,
      0
    );
    const takenDoses = adherenceData.reduce(
      (sum, sch) => sum + sch.taken_doses,
      0
    );
    const overallAdherence =
      totalDoses > 0 ? (takenDoses / totalDoses) * 100 : 0;

    res.json({
      overallAdherence: Number(overallAdherence.toFixed(2)),
      schedules: adherenceData,
      period: { start_date, end_date },
    });
  } catch (error) {
    console.error("Error fetching adherence data:", error);
    res.status(500).json({ error: "Failed to fetch adherence data" });
  }
};

export const getMedicationLogs = async (req, res) => {
  try {
    const { start_date, end_date, user_id: userIdQuery } = req.query;
    if (!start_date || !end_date) {
      return res
        .status(400)
        .json({ error: "Start and end dates are required" });
    }
    const userId = parseInt(userIdQuery) || req.user.id;

    // If caretaker is querying another user's data, verify access
    if (userId !== req.user.id) {
      if (req.user.role !== "caretaker") {
        return res
          .status(403)
          .json({ error: "Unauthorized to access this user's data" });
      }
      const mapping = await db.get(
        "SELECT * FROM user_caretaker_mappings WHERE caretaker_id = ? AND patient_id = ?",
        [req.user.id, userId]
      );
      if (!mapping) {
        return res
          .status(403)
          .json({ error: "Not authorized to access this patient's data" });
      }
    }

    const logs = await db.all(
      `
      SELECT ml.*, ums.dose_time, ums.expected_time, t.name, t.dosage, t.type, st.quantity
      FROM medication_logs ml
      JOIN user_medication_schedules ums ON ml.schedule_id = ums.id
      JOIN schedule_tablets st ON ums.id = st.schedule_id
      JOIN tablets t ON st.tablet_id = t.id
      WHERE ums.user_id = ? AND ml.log_date BETWEEN ? AND ?
      ORDER BY ml.log_date, ums.expected_time
      `,
      [userId, start_date, end_date]
    );

    res.json(logs);
  } catch (error) {
    console.error("Error fetching medication logs:", error);
    res.status(500).json({ error: "Failed to fetch medication logs" });
  }
};

export const getTablets = async (req, res) => {
  try {
    const tablets = await db.all("SELECT id, name, dosage, type FROM tablets");
    res.json(tablets);
  } catch (error) {
    console.error("Error fetching tablets:", error);
    res.status(500).json({ error: "Failed to fetch tablets" });
  }
};
