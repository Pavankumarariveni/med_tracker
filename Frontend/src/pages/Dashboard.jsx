import React from "react";
import { useAuth } from "../contexts/AuthContext";
import Header from "../components/Header";
import PatientDashboard from "./PatientDashboard";
import CaretakerDashboard from "./CaretakerDashboard";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      {user?.role === "patient" ? <PatientDashboard /> : <CaretakerDashboard />}
    </div>
  );
}
