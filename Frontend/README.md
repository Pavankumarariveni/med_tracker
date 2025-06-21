# MedTracker Frontend

**MedTracker** is a modern React-based frontend application designed to manage medication schedules and track adherence for patients and caretakers. Built with **Vite**, **Tailwind CSS**, **React Query**, and **Lucide React**, it offers a responsive and intuitive user experience for both patients and caretakers.

---

## 📄 Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Project Setup](#project-setup)

  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Application](#running-the-application)

- [Tailwind CSS Setup](#tailwind-css-setup)
- [File Structure](#file-structure)
- [Component Overview](#component-overview)
- [Responsive Design](#responsive-design)
- [Authentication Flow](#authentication-flow)
- [Medication Management](#medication-management)
- [Environment Variables](#environment-variables)
- [Dependencies](#dependencies)
- [Scripts](#scripts)
- [Contributing](#contributing)
- [License](#license)

---

## 🌐 Project Overview

MedTracker is a medication management platform with role-based dashboards:

- **Patients** can:

  - View and mark their daily medication.
  - Upload verification photos.
  - Track adherence using a calendar.

- **Caretakers** can:

  - Manage patient medication schedules.
  - Monitor adherence metrics.
  - Configure notification alerts.

The frontend is optimized for all devices with smooth UI transitions, gradient backgrounds, and responsive layouts using Tailwind CSS.

---

## ⚙️ Tech Stack

- **React**: Frontend UI library
- **Vite**: Fast development build tool
- **Tailwind CSS**: Utility-first CSS
- **React Query (Tanstack)**: API data fetching
- **Lucide React**: Icon components
- **React Context API**: Authentication state
- **Date-fns**: Date manipulation and formatting

---

## 📊 Project Setup

### Prerequisites

- Node.js (v18+)
- npm (v8+)
- Git
- Compatible backend API (e.g., Node.js/Express)

### Installation

```bash
git clone <repository-url>
cd Frontend
npm install
```

Create a `.env` file and configure your environment variables (see [Environment Variables](#environment-variables)).

```
VITE_API_URL=http://localhost:3001/api
```

### Running the Application

```bash
npm run dev
```

The app will be served at [http://localhost:5173](http://localhost:5173)

To build for production:

```bash
npm run build
```

To preview production build:

```bash
npm run preview
```

---

## 🎨 Tailwind CSS Setup

`tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
```

`src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## 📁 File Structure

```
Frontend/
├── public/
├── src/
│   ├── components/
│   │   ├── AppRouter.jsx
│   │   ├── Header.jsx
│   │   ├── InputField.jsx
│   │   ├── LoadingSpinner.jsx
│   │   ├── SelectField.jsx
│   ├── contexts/
│   │   ├── AuthContext.jsx
│   ├── pages/
│   │   ├── AuthPage.jsx
│   │   ├── CaretakerDashboard.jsx
│   │   ├── Dashboard.jsx
│   │   ├── PatientDashboard.jsx
│   ├── utils/
│   │   ├── api.js
│   ├── App.jsx
│   ├── index.css
│   ├── main.jsx
├── .env
├── .gitignore
├── eslint.config.js
├── index.html
├── package.json
├── package-lock.json
├── tailwind.config.js
├── vite.config.js
└── README.md

```

---

## 🛠️ Component Overview

### AuthPage.jsx

Handles user authentication with form validation, login/signup toggle, and role selection. Uses `AuthContext` and includes reusable components like `InputField` and `SelectField`.

### CaretakerDashboard.jsx

Caretaker view for selecting patients, viewing adherence, adding schedules, and managing notifications. Uses tabs and React Query for data fetching.

### PatientDashboard.jsx

Displays patient-specific schedules, allows marking medication as taken, and provides calendar tracking with upload support.

### Header.jsx

Navigation bar with logo, user name, and logout functionality. Adjusts for mobile view.

### InputField.jsx & SelectField.jsx

Reusable form input and select components with icons, validation error display, and responsive padding.

---

## 🌐 Responsive Design

- **Mobile**: Single-column layouts, compact padding, and touch-friendly buttons.
- **Tablet**: Multi-column support, adjusted padding and font sizes.
- **Desktop**: Expanded grids and readable text.

Responsive techniques include Tailwind breakpoints, adaptive grid layouts, and font scaling.

---

## 🔐 Authentication Flow

- **Login/Signup** via `AuthPage.jsx`.
- Uses `AuthContext` to store auth tokens and user roles.
- Redirects based on role:

  - Patients ➔ `PatientDashboard`
  - Caretakers ➔ `CaretakerDashboard`

---

## 💊 Medication Management

### Patient Dashboard

- Daily medication view
- Mark as taken
- Upload verification photos
- View calendar status and adherence metrics

### Caretaker Dashboard

- Patient selector
- Add medication schedules
- View adherence metrics
- Set up notifications

Uses `api.js` with React Query for:

- `/patients`
- `/tablets`
- `/schedules`
- `/adherence`
- `/logs`

---

## 📝 Environment Variables

Create a `.env` file in root:

```bash
VITE_API_BASE_URL=http://localhost:3000/api
```

Ensure `api.js` reads from `import.meta.env.VITE_API_BASE_URL`

---

## 📊 Dependencies

```json
"dependencies": {
    "@tanstack/react-query": "^5.80.10",
    "autoprefixer": "^10.4.21",
    "axios": "^1.10.0",
    "date-fns": "^4.1.0",
    "lucide-react": "^0.522.0",
    "postcss": "^8.5.6",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-router-dom": "^7.6.2",
    "tailwindcss": "^4.1.10"
  },
  "devDependencies": {
    "@eslint/js": "^9.25.0",
    "@types/react": "^19.1.2",
    "@types/react-dom": "^19.1.2",
    "@vitejs/plugin-react": "^4.5.2",
    "@vitejs/plugin-react-swc": "^3.9.0",
    "eslint": "^9.25.0",
    "eslint-plugin-react-hooks": "^5.2.0",
    "eslint-plugin-react-refresh": "^0.4.19",
    "globals": "^16.0.0",
    "vite": "^6.3.5"
  }
```

Install with:

```bash
npm install
```

---

## 🔄 Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
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
