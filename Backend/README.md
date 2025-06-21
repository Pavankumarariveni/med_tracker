# Medication Tracker System

A comprehensive medication management system with patient and caretaker roles, medication scheduling, adherence tracking, and reporting capabilities.

## Features

### Authentication & Authorization

- User registration (patient/caretaker roles)
- JWT-based authentication
- Role-based access control
- Secure password hashing

### Medication Management

- Create and manage medication schedules
- Track daily medication intake
- Mark medications as taken with optional photo verification
- View medication adherence statistics
- Generate medication logs and reports

### Patient Management (for caretakers)

- View assigned patients
- Manage patient medication schedules
- Monitor patient adherence

### Database

- SQLite database with proper schema
- Tables for users, medications, schedules, and logs
- Indexes for performance optimization
- Transaction support for critical operations

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Create `.env` file based on `.env.example`
4. Start the server:
   - Start Server: `npm start`

## API Endpoints

### Auth Controller

- `POST /auth/login` - User login
- `POST /auth/register` - User registration

### Medication Controller

- `GET /medications/daily` - Get daily medication schedule
- `POST /medications/schedule` - Add new medication schedule
- `PUT /medications/taken` - Mark medication as taken
- `GET /medications/stats` - Get adherence statistics
- `GET /medications/logs` - Get medication logs
- `GET /medications/tablets` - Get available tablets

### Patient Controller

- `GET /patients` - Get assigned patients (caretakers only)

## Database Schema

```sql
-- Users table
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT CHECK(role IN ('patient', 'caretaker')) NOT NULL
);

-- Tablets table (Master Tablet Catalog)
CREATE TABLE tablets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  type TEXT
);

-- User Medication Schedules
CREATE TABLE user_medication_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  dose_time TEXT NOT NULL,
  expected_time TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Schedule Tablets
CREATE TABLE schedule_tablets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  schedule_id INTEGER NOT NULL,
  tablet_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (schedule_id) REFERENCES user_medication_schedules(id) ON DELETE CASCADE,
  FOREIGN KEY (tablet_id) REFERENCES tablets(id) ON DELETE CASCADE
);

-- Medication Logs
CREATE TABLE medication_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  schedule_id INTEGER NOT NULL,
  log_date TEXT NOT NULL,
  is_taken BOOLEAN NOT NULL,
  taken_at TEXT,
  photo_path TEXT,
  FOREIGN KEY (schedule_id) REFERENCES user_medication_schedules(id) ON DELETE CASCADE
);

-- User Caretaker Mappings
CREATE TABLE user_caretaker_mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  caretaker_id INTEGER NOT NULL,
  patient_id INTEGER NOT NULL,
  FOREIGN KEY (caretaker_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(caretaker_id, patient_id)
);
```

## Dependencies

This project utilizes several key dependencies to enhance functionality and security:

- **bcrypt** (`^6.0.0`): A library to help hash passwords securely. It uses a strong hashing algorithm to protect user passwords, making it difficult for attackers to retrieve the original password even if they gain access to the database.

- **cors** (`^2.8.5`): A middleware for enabling Cross-Origin Resource Sharing (CORS) in Express applications. It allows the server to specify which domains are permitted to access resources, enhancing security and flexibility for API consumption.

- **dotenv** (`^16.5.0`): A module that loads environment variables from a `.env` file into `process.env`. This is useful for managing configuration settings, such as database paths and secret keys, without hardcoding them into the source code.

- **express** (`^5.1.0`): A fast, unopinionated, minimalist web framework for Node.js. It simplifies the process of building web applications and APIs by providing robust routing and middleware support.

- **express-validator** (`^7.2.1`): A set of middlewares for validating and sanitizing user input in Express applications. It helps ensure that incoming data meets specified criteria, reducing the risk of invalid data and potential security vulnerabilities.

- **jsonwebtoken** (`^9.0.2`): A library for creating and verifying JSON Web Tokens (JWT). It is used for secure authentication and authorization, allowing users to log in and access protected resources.

- **multer** (`^2.0.1`): A middleware for handling `multipart/form-data`, which is primarily used for uploading files. It simplifies the process of handling file uploads in Express applications.

- **sqlite3** (`^5.1.7`): A library for interacting with SQLite databases in Node.js. It provides a lightweight and efficient way to store and retrieve data, making it ideal for small to medium-sized applications.

These dependencies work together to create a secure, efficient, and user-friendly medication tracking system.

## .env.example

```
# Server Configuration
PORT=3001

# JWT Secret (Change this in production!)
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Database
DATABASE_URL=./medication_tracker.db

```

## Default Credentials (or) Logins

```
CARETAKER -> username: caretaker1
             email: caretaker1@gmail.com
             password: Password@123

PATIENT   -> username: patient1
             email: patient1@gmail.com
             password: Password@123

PATIENT   -> username: patient2
             email: patient2@gmail.com
             password: Password@123

PATIENT   -> username: patient3
             email: patient3@gmail.com
             password: Password@123

```
