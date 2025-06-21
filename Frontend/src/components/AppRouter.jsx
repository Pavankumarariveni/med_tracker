import React from "react";
import { useAuth } from "../contexts/AuthContext";
import AuthPage from "../pages/AuthPage";
import Dashboard from "../pages/Dashboard";
import LoadingSpinner from "./LoadingSpinner";

export default function AppRouter() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return isAuthenticated ? <Dashboard /> : <AuthPage />;
}
