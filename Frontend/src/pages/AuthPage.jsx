import React, { useState } from "react";
import { Pill, UserPlus, LogIn } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "../utils/api";
import InputField from "../components/InputField";
import SelectField from "../components/SelectField";
import LoadingSpinner from "../components/LoadingSpinner";
import { Mail, Lock, User, Shield } from "lucide-react";

export default function AuthPage() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "patient",
  });
  const [errors, setErrors] = useState({});

  const { login } = useAuth();

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      login(data.user, data.token);
    },
    onError: (error) => {
      // Map backend error messages to user-friendly messages
      const errorMessage = error.message.toLowerCase();
      if (errorMessage.includes("user not found")) {
        setErrors({
          general: "User not found. Please check your username or email.",
        });
      } else if (errorMessage.includes("invalid credentials")) {
        setErrors({ general: "Incorrect password. Please try again." });
      } else if (errorMessage.includes("email and password are required")) {
        setErrors({
          general: "Please provide both username/email and password.",
        });
      } else {
        setErrors({ general: "Login failed. Please try again later." });
      }
    },
  });

  const signupMutation = useMutation({
    mutationFn: authApi.signup,
    onSuccess: (data) => {
      login(data.user, data.token);
    },
    onError: (error) => {
      // Map backend error messages to user-friendly messages
      const errorMessage = error.message.toLowerCase();
      if (errorMessage.includes("email already registered")) {
        setErrors({
          general: "This email is already registered. Please use another.",
        });
      } else if (errorMessage.includes("all fields are required")) {
        setErrors({ general: "Please fill in all required fields." });
      } else if (errorMessage.includes("invalid role")) {
        setErrors({
          general: "Please select a valid role (Patient or Caretaker).",
        });
      } else {
        setErrors({ general: "Registration failed. Please try again later." });
      }
    },
  });

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    }

    if (!isLoginMode) {
      if (!formData.email.trim()) {
        newErrors.email = "Email is required";
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = "Please enter a valid email";
      }
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (!isLoginMode && formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!isLoginMode && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (isLoginMode) {
      loginMutation.mutate({
        username: formData.username,
        password: formData.password,
      });
    } else {
      signupMutation.mutate({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear specific field error and general error on input change
    if (errors[name] || errors.general) {
      setErrors((prev) => ({ ...prev, [name]: "", general: "" }));
    }
  };

  const isLoading = loginMutation.isPending || signupMutation.isPending;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-xs sm:max-w-sm md:max-w-md">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-600 p-2 sm:p-3 rounded-full">
              <Pill className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            MedTracker
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            {isLoginMode ? "Welcome back!" : "Start your medication journey"}
          </p>
        </div>

        {/* Form */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100">
          <div className="flex mb-4 sm:mb-6">
            <button
              type="button"
              onClick={() => setIsLoginMode(true)}
              className={`flex-1 py-2 px-3 sm:px-4 rounded-lg font-medium transition-colors text-xs sm:text-sm ${
                isLoginMode
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:text-blue-600"
              }`}
            >
              <LogIn className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1 sm:mr-2" />
              Login
            </button>
            <button
              type="button"
              onClick={() => setIsLoginMode(false)}
              className={`flex-1 py-2 px-3 sm:px-4 rounded-lg font-medium transition-colors text-xs sm:text-sm ${
                !isLoginMode
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:text-blue-600"
              }`}
            >
              <UserPlus className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1 sm:mr-2" />
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <InputField
              icon={User}
              label="Username or Email"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              error={errors.username}
              placeholder="Enter your username or email"
            />

            {!isLoginMode && (
              <InputField
                icon={Mail}
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                error={errors.email}
                placeholder="Enter your email"
              />
            )}

            {!isLoginMode && (
              <SelectField
                icon={Shield}
                label="Role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                options={[
                  { value: "patient", label: "Patient" },
                  { value: "caretaker", label: "Caretaker" },
                ]}
              />
            )}

            <InputField
              icon={Lock}
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              error={errors.password}
              placeholder="Enter your password"
            />

            {!isLoginMode && (
              <InputField
                icon={Lock}
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                error={errors.confirmPassword}
                placeholder="Confirm your password"
              />
            )}

            {errors.general && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2 sm:p-3">
                <p className="text-red-600 text-xs sm:text-sm">
                  {errors.general}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 sm:py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm sm:text-base"
            >
              {isLoading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  {isLoginMode ? (
                    <>
                      <LogIn className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      Login
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      Create Account
                    </>
                  )}
                </>
              )}
            </button>
            {isLoginMode && (
              <div>
                Default credentials <br /> caretaker - caretaker1 , Password@123{" "}
                <br /> patient - patient1 , Password@123 <br /> patient -
                patient2 , Password@123 <br /> patient - patient3 , Password@123
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
