// import express from "express";
// import { db } from "../database/init.js";
// import { verifyCaretaker } from "../middleware/auth.js";

// const router = express.Router();

// // Get assigned patients for a caretaker
// router.get("/", verifyCaretaker, async (req, res) => {
//   try {
//     const patients = await db.all(
//       `
//       SELECT u.id, u.username, u.email
//       FROM user_caretaker_mappings ucm
//       JOIN users u ON ucm.patient_id = u.id
//       WHERE ucm.caretaker_id = ?
//       `,
//       [req.user.id]
//     );

//     res.json(patients);
//   } catch (error) {
//     console.error("Get patients error:", error);
//     res.status(500).json({ error: "Failed to fetch patients" });
//   }
// });

// export default router;

import express from "express";
import { verifyCaretaker } from "../middleware/auth.js";
import { getAssignedPatients } from "../controller/patientController.js";

const router = express.Router();

// Get assigned patients for a caretaker
router.get("/", verifyCaretaker, getAssignedPatients);


export default router;
