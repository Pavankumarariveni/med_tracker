import jwt from "jsonwebtoken";
import { db } from "../database/init.js";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

export function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(403).json({ error: "Token expired" });
      }
      return res.status(403).json({ error: "Invalid token" });
    }

    req.user = user;
    next();
  });
}

export function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "24h" }
  );
}

export const verifyCaretaker = async (req, res, next) => {
  if (req.user.role !== "caretaker") {
    return res
      .status(403)
      .json({ error: "Only caretakers can perform this action" });
  }
  next();
};

export const verifyCaretakerPatient = async (req, res, next) => {
  const { patientId } = req.params;
  try {
    const mapping = await db.get(
      `SELECT * FROM user_caretaker_mappings WHERE caretaker_id = ? AND patient_id = ?`,
      [req.user.id, patientId]
    );
    if (!mapping) {
      return res
        .status(403)
        .json({ error: "Not authorized to access this patient's data" });
    }
    next();
  } catch (err) {
    console.error("Error verifying caretaker-patient mapping:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
