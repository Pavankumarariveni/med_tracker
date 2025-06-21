// import express from "express";
// import bcrypt from "bcrypt";
// import { db } from "../database/init.js";
// import { generateToken } from "../middleware/auth.js";

// const router = express.Router();

// // Login
// router.post("/login", async (req, res) => {
//   try {
//     const { username, password } = req.body;
//     if (!username || !password) {
//       return res.status(400).json({ error: "Email and password are required" });
//     }

//     const user = await db.get(
//       "SELECT * FROM users WHERE username = ? OR email = ?",
//       [username, username]
//     );
//     if (!user) {
//       return res.status(401).json({ error: "Invalid credentials" });
//     }

//     const isValid = await bcrypt.compare(password, user.password);
//     if (!isValid) {
//       return res.status(401).json({ error: "Invalid credentials" });
//     }

//     function excludePassword(user) {
//       // Create a shallow copy of the user object
//       const { password, ...userWithoutPassword } = user;
//       return userWithoutPassword;
//     }

//     const userDetails = excludePassword(user);

//     const token = generateToken(user);
//     res.json({ token, user: userDetails });
//   } catch (error) {
//     console.error("Login error:", error);
//     res.status(500).json({ error: "Failed to login" });
//   }
// });

// // Register (for testing or admin use)
// router.post("/register", async (req, res) => {
//   try {
//     const { username, email, password, role } = req.body;
//     if (!username || !email || !password || !role) {
//       return res.status(400).json({ error: "All fields are required" });
//     }
//     if (!["patient", "caretaker"].includes(role)) {
//       return res.status(400).json({ error: "Invalid role" });
//     }

//     const existingUser = await db.get("SELECT * FROM users WHERE email = ?", [
//       email,
//     ]);
//     if (existingUser) {
//       return res.status(409).json({ error: "Email already registered" });
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);
//     const result = await db.run(
//       "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)",
//       [username, email, hashedPassword, role]
//     );

//     const user = await db.get(
//       "SELECT id, username, email, role FROM users WHERE email = ?",
//       [email]
//     );
//     const token = generateToken(user);

//     function excludePassword(user) {
//       // Create a shallow copy of the user object
//       const { password, ...userWithoutPassword } = user;
//       return userWithoutPassword;
//     }

//     const userDetails = excludePassword(user);
//     res.status(201).json({ token, user: userDetails });
//   } catch (error) {
//     console.error("Registration error:", error);
//     res.status(500).json({ error: "Failed to register" });
//   }
// });

// export default router;

import express from "express";
import { login, register } from "../controller/authController.js";

const router = express.Router();

// Login
router.post("/login", login);

// Register (for testing or admin use)
router.post("/register", register);

export default router;
