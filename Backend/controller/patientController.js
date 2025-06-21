import { db } from "../database/init.js";

export const getAssignedPatients = async (req, res) => {
  try {
    const patients = await db.all(
      `
      SELECT u.id, u.username, u.email
      FROM user_caretaker_mappings ucm
      JOIN users u ON ucm.patient_id = u.id
      WHERE ucm.caretaker_id = ?
      `,
      [req.user.id]
    );

    res.json(patients);
  } catch (error) {
    console.error("Get patients error:", error);
    res.status(500).json({ error: "Failed to fetch patients" });
  }
};


