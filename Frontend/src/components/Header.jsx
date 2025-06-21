import React, { useState } from "react";
import { LogOut, Users, Menu, Pill } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function Header() {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 w-full">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo Section */}
          <div className="flex items-center">
            {/* <div
              className="p-2 rounded-lg"
              style={{
                backgroundImage: "linear-gradient(to right, teal, blue)",
              }}
            >
              <span className="text-white font-bold text-base sm:text-lg">
                M
              </span>
            </div> */}
            <div className="bg-blue-600 p-2 sm:p-3 rounded-full">
              <Pill className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <span className="ml-3 text-sm sm:text-lg md:text-xl font-bold text-gray-900">
              MedTracker
            </span>
          </div>

          {/* Mobile Menu Button */}
          <div className="sm:hidden">
            <button
              onClick={toggleMenu}
              className="text-gray-700 hover:text-gray-900 p-2 rounded transition"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>

          {/* Desktop Menu */}
          <div className="hidden sm:flex items-center space-x-4">
            <div className="flex items-center text-sm text-gray-700">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              <span className="font-medium truncate max-w-[100px]">
                {user?.username}
              </span>
            </div>
            <button
              onClick={logout}
              className="flex items-center px-3 py-2 text-sm text-gray-700 hover:text-red-600 hover:bg-gray-100 rounded-lg transition"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Logout
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMenuOpen && (
          <div className="sm:hidden border-t border-gray-200 py-2">
            <div className="px-4 py-2 flex items-center text-sm text-gray-700">
              <Users className="w-4 h-4 mr-2" />
              <span className="font-medium">{user?.username}</span>
            </div>
            <div className="px-4 py-2">
              <button
                onClick={logout}
                className="w-full flex items-center py-2 text-sm text-gray-700 hover:text-red-600 hover:bg-gray-100 rounded-lg transition"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
