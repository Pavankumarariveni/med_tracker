import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { medicationApi, patientApi } from "../utils/api";
import {
  Calendar,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  User,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  startOfWeek,
  endOfWeek,
  startOfWeek as startOfWeekFn,
  differenceInDays,
} from "date-fns";
import LoadingSpinner from "../components/LoadingSpinner";

export default function CaretakerDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const queryClient = useQueryClient();

  // Fetch patients
  const { data: patients, isLoading: patientsLoading } = useQuery({
    queryKey: ["patients"],
    queryFn: patientApi.getPatients,
  });

  // Fetch tablets
  const { data: tablets, isLoading: tabletsLoading } = useQuery({
    queryKey: ["tablets"],
    queryFn: medicationApi.getTablets,
  });
  const tabletOptions = tablets || [];

  // Calculate date range for the current month
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = format(monthStart, "yyyy-MM-dd");
  const endDate = format(monthEnd, "yyyy-MM-dd");
  const todayStr = format(new Date(), "yyyy-MM-dd");

  // Fetch daily tablets for selected patient
  const { data: schedules, isLoading: schedulesLoading } = useQuery({
    queryKey: ["daily-tablets", todayStr, selectedPatientId],
    queryFn: () => medicationApi.getDailyTablets(todayStr, selectedPatientId),
    enabled: !!selectedPatientId,
  });

  // Fetch adherence data for selected patient
  const { data: adherenceData, isLoading: adherenceLoading } = useQuery({
    queryKey: ["adherence", startDate, endDate, selectedPatientId],
    queryFn: () =>
      medicationApi.getAdherence(startDate, endDate, selectedPatientId),
    enabled: !!selectedPatientId,
  });

  // Fetch medication logs for selected patient
  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ["medication-logs", startDate, endDate, selectedPatientId],
    queryFn: () => medicationApi.getLogs(startDate, endDate, selectedPatientId),
    enabled: !!selectedPatientId,
  });

  // Calendar logic
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  // State for Add Medication Schedule form
  const [formData, setFormData] = useState({
    dose_time: "",
    expected_time: "",
    start_date: "",
    end_date: "",
    tablets: [{ tablet_id: "", quantity: "" }],
  });
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigateMonth = (direction) => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(
        direction === "prev" ? prev.getMonth() - 1 : prev.getMonth() + 1
      );
      return newDate;
    });
  };

  // const getDayStatus = (date) => {
  //   const dateStr = format(date, "yyyy-MM-dd");
  //   const dayLogs = logs?.filter((log) => log.log_date === dateStr) || [];

  //   if (dayLogs.some((log) => log.is_taken)) return "taken";
  //   if (dayLogs.some((log) => !log.is_taken)) return "missed";
  //   return "none";
  // };

  const getDayStatus = (date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const dayLogs = logs?.filter((log) => log.log_date === dateStr) || [];

    console.log("fi_logs", dayLogs);

    const isTaken = dayLogs.some((log) => log.is_taken);
    const isMissed = dayLogs.some((log) => !log.is_taken);

    if (isMissed) return "missed"; // Return "missed" if there are any logs not taken
    if (isTaken) return "taken";
    return "none"; // Return "not taken" if there are no logs taken
  };

  // Calculate metrics
  const calculateCurrentStreak = () => {
    if (!logs || !schedules || schedules.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    const sortedLogs = [...logs].sort(
      (a, b) => new Date(b.log_date) - new Date(a.log_date)
    );

    for (let i = 0; i < differenceInDays(today, monthStart) + 1; i++) {
      const currentDay = format(
        new Date(today.getTime() - i * 24 * 60 * 60 * 1000),
        "yyyy-MM-dd"
      );
      const dayLogs = sortedLogs.filter((log) => log.log_date === currentDay);

      const schedulesTaken = schedules.every((sch) =>
        dayLogs.some(
          (log) => log.schedule_id === sch.schedule_id && log.is_taken
        )
      );

      if (!schedulesTaken) break;
      streak++;
    }
    return streak;
  };

  const calculateMissedThisMonth = () => {
    if (!logs || !schedules || schedules.length === 0) return 0;

    const monthLogs = logs.filter(
      (log) =>
        new Date(log.log_date) >= monthStart &&
        new Date(log.log_date) <= monthEnd
    );
    const missedDays = new Set(
      monthLogs.filter((log) => !log.is_taken).map((log) => log.log_date)
    );
    return missedDays.size;
  };

  const calculateTakenThisWeek = () => {
    if (!logs || !schedules || schedules.length === 0) return 0;

    const weekStart = startOfWeekFn(new Date(), { weekStartsOn: 0 });
    const weekLogs = logs.filter(
      (log) =>
        new Date(log.log_date) >= weekStart &&
        new Date(log.log_date) <= new Date()
    );
    return weekLogs.filter((log) => log.is_taken).length;
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle tablet input changes
  const handleTabletChange = (index, field, value) => {
    setFormData((prev) => {
      const tablets = [...prev.tablets];
      tablets[index] = { ...tablets[index], [field]: value };
      return { ...prev, tablets };
    });
  };

  // Add new tablet entry
  const addTablet = () => {
    setFormData((prev) => ({
      ...prev,
      tablets: [...prev.tablets, { tablet_id: "", quantity: "" }],
    }));
  };

  // Remove tablet entry
  const removeTablet = (index) => {
    setFormData((prev) => ({
      ...prev,
      tablets: prev.tablets.filter((_, i) => i !== index),
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    setIsSubmitting(true);

    // Basic validation
    if (!selectedPatientId) {
      setFormError("Please select a patient first.");
      setIsSubmitting(false);
      return;
    }
    if (
      !formData.dose_time ||
      !formData.start_date ||
      !formData.tablets.every((t) => t.tablet_id && t.quantity)
    ) {
      setFormError(
        "Please fill in all required fields (dose time, start date, and tablet details)."
      );
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = {
        user_id: parseInt(selectedPatientId),
        dose_time: formData.dose_time,
        expected_time: formData.expected_time || null,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        tablets: formData.tablets.map((t) => ({
          tablet_id: parseInt(t.tablet_id),
          quantity: parseInt(t.quantity),
        })),
      };
      console.log("Submitting payload:", payload);
      await medicationApi.addSchedule(payload, parseInt(selectedPatientId));

      // Invalidate queries to refresh dashboard data
      queryClient.invalidateQueries([
        "daily-tablets",
        todayStr,
        selectedPatientId,
      ]);
      queryClient.invalidateQueries([
        "adherence",
        startDate,
        endDate,
        selectedPatientId,
      ]);
      queryClient.invalidateQueries([
        "medication-logs",
        startDate,
        endDate,
        selectedPatientId,
      ]);

      // Reset form
      setFormData({
        dose_time: "",
        expected_time: "",
        start_date: "",
        end_date: "",
        tablets: [{ tablet_id: "", quantity: "" }],
      });
      setFormSuccess("Medication schedule added successfully!");
    } catch (error) {
      console.error("Add schedule error:", error, error.response);
      setFormError(
        error.response?.data?.error || "Failed to add medication schedule."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const overallAdherence = adherenceData?.overallAdherence || 0;
  const currentStreak = calculateCurrentStreak();
  const missedThisMonth = calculateMissedThisMonth();
  const takenThisWeek = calculateTakenThisWeek();

  const recentActivity = logs
    ? [...logs]
        .sort((a, b) => new Date(b.log_date) - new Date(a.log_date))
        .slice(0, 5)
        .map((log) => {
          const dateValid = log.log_date && !isNaN(new Date(log.log_date));
          const timeValid = log.taken_at && !isNaN(new Date(log.taken_at));
          return {
            date: dateValid
              ? format(new Date(log.log_date), "EEEE, MMMM d")
              : "Invalid Date",
            time: timeValid ? format(new Date(log.taken_at), "h:mm a") : null,
            status: log.is_taken ? "completed" : "missed",
            medication: log.name,
          };
        })
    : [];

  if (patientsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-green-500 via-teal-500 to-blue-600 rounded-2xl p-4 sm:p-6 lg:p-8 mb-8 text-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-center mb-6 gap-4">
            <div className="flex items-center w-full sm:w-auto">
              <div className="bg-white bg-opacity-20 p-3 rounded-lg mr-4">
                <User className="w-4 h-4 md:h-6 md:w-6" />
              </div>
              <div className="flex-1">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">
                  Caretaker Dashboard
                </h1>
                <p className="text-green-100 text-sm">
                  Monitoring medication adherence
                </p>
              </div>
            </div>
            <div className="w-full sm:w-64">
              <select
                value={selectedPatientId || ""}
                onChange={(e) => setSelectedPatientId(e.target.value || null)}
                className="w-full px-3 py-2 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-lg text-black focus:ring-2 focus:ring-white focus:border-white text-sm"
              >
                <option value="" disabled>
                  Select a patient
                </option>
                {patients?.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.username}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedPatientId && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white bg-opacity-10 rounded-xl p-4 sm:p-6">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
                  {overallAdherence}%
                </div>
                <div className="text-green-100 text-sm">Adherence Rate</div>
              </div>
              <div className="bg-white bg-opacity-10 rounded-xl p-4 sm:p-6">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
                  {currentStreak}
                </div>
                <div className="text-green-100 text-sm">Current Streak</div>
              </div>
              <div className="bg-white bg-opacity-10 rounded-xl p-4 sm:p-6">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
                  {missedThisMonth}
                </div>
                <div className="text-green-100 text-sm">Missed This Month</div>
              </div>
              <div className="bg-white bg-opacity-10 rounded-xl p-4 sm:p-6">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
                  {takenThisWeek}
                </div>
                <div className="text-green-100 text-sm">Taken This Week</div>
              </div>
            </div>
          )}
        </div>

        {selectedPatientId ? (
          <>
            {/* Navigation Tabs */}
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-1 mb-8 bg-white rounded-lg p-1 shadow-sm border border-gray-200 overflow-x-auto">
              {[
                { id: "overview", label: "Overview" },
                { id: "activity", label: "Recent Activity" },
                { id: "calendar", label: "Calendar View" },
                { id: "add-schedule", label: "Add Medication Schedule" },
                { id: "notifications", label: "Notifications" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors text-sm sm:text-base whitespace-nowrap ${
                    activeTab === tab.id
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 hover:text-blue-600"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                {/* Today's Status */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                  <div className="flex items-center mb-4 sm:mb-6">
                    <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 mr-3" />
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                      Today's Status
                    </h2>
                  </div>

                  <div className="space-y-4">
                    {schedulesLoading || adherenceLoading || logsLoading ? (
                      <LoadingSpinner size="md" />
                    ) : schedules && schedules.length > 0 ? (
                      schedules.map((schedule) => (
                        <div
                          key={schedule.schedule_id}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-gray-50 rounded-lg"
                        >
                          <div className="mb-2 sm:mb-0">
                            <h3 className="font-medium text-gray-900 text-sm sm:text-base">
                              {schedule.name}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600">
                              {schedule.dosage} - {schedule.quantity}{" "}
                              {schedule.type || "tablet"}(s) -{" "}
                              {schedule.dose_time} (
                              {schedule.expected_time || "Anytime"})
                            </p>
                          </div>
                          {schedule.is_taken ? (
                            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs sm:text-sm font-medium">
                              Taken
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs sm:text-sm font-medium">
                              Pending
                            </span>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-600 text-center text-sm">
                        No medications scheduled for today
                      </p>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">
                    Quick Actions
                  </h2>

                  <div className="space-y-4">
                    <button
                      onClick={() => setActiveTab("calendar")}
                      className="w-full flex items-center p-4 text-left hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mr-3" />
                      <span className="font-medium text-gray-900 text-sm sm:text-base">
                        View Full Calendar
                      </span>
                    </button>
                    <button
                      onClick={() => setActiveTab("add-schedule")}
                      className="w-full flex items-center p-4 text-left hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mr-3" />
                      <span className="font-medium text-gray-900 text-sm sm:text-base">
                        Add Medication Schedule
                      </span>
                    </button>
                  </div>
                </div>

                {/* Monthly Adherence Progress */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">
                    Monthly Adherence Progress
                  </h2>

                  <div className="mb-4">
                    <div className="flex justify-between text-xs sm:text-sm text-gray-600 mb-2">
                      <span>Overall Progress</span>
                      <span>{overallAdherence}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
                      <div
                        className="bg-gradient-to-r from-green-500 to-blue-600 h-2 sm:h-3 rounded-full transition-all duration-300"
                        style={{ width: `${overallAdherence}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-xl sm:text-2xl font-bold text-green-600">
                        {adherenceData?.schedules.reduce(
                          (sum, sch) => sum + sch.taken_doses,
                          0
                        ) || 0}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600">
                        Doses Taken
                      </div>
                    </div>
                    <div>
                      <div className="text-xl sm:text-2xl font-bold text-red-600">
                        {missedThisMonth}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600">
                        Days Missed
                      </div>
                    </div>
                    <div>
                      <div className="text-xl sm:text-2xl font-bold text-blue-600">
                        {differenceInDays(monthEnd, new Date()) + 1}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600">
                        Days Remaining
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "activity" && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">
                  Recent Medication Activity
                </h2>

                <div className="space-y-4">
                  {schedulesLoading || adherenceLoading || logsLoading ? (
                    <LoadingSpinner size="md" />
                  ) : recentActivity.length > 0 ? (
                    recentActivity.map((activity, index) => (
                      <div
                        key={index}
                        className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg ${
                          activity.status === "completed"
                            ? "bg-green-50"
                            : "bg-red-50"
                        }`}
                      >
                        <div className="flex items-center mb-2 sm:mb-0">
                          <div
                            className={`p-2 rounded-lg mr-4 ${
                              activity.status === "completed"
                                ? "bg-green-100"
                                : "bg-red-100"
                            }`}
                          >
                            {activity.status === "completed" ? (
                              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                            ) : (
                              <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900 text-sm sm:text-base">
                              {activity.medication} - {activity.date}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600">
                              {activity.status === "completed"
                                ? `Taken at ${activity.time}`
                                : "Medication missed"}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                            activity.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {activity.status === "completed"
                            ? "Completed"
                            : "Missed"}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-600 text-center text-sm">
                      No recent activity available
                    </p>
                  )}
                </div>
              </div>
            )}

            {activeTab === "calendar" && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                  <div className="lg:col-span-2">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">
                      Medication Calendar Overview
                    </h2>

                    {/* Calendar Header */}
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={() => navigateMonth("prev")}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                      </button>
                      <span className="text-base sm:text-lg font-medium text-gray-900">
                        {format(currentDate, "MMMM yyyy")}
                      </span>
                      <button
                        onClick={() => navigateMonth("next")}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                      </button>
                    </div>

                    {/* Day Headers */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                        <div
                          key={day}
                          className="p-2 text-center text-xs sm:text-sm font-medium text-gray-600"
                        >
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Calendar Days */}
                    <div className="grid grid-cols-7 gap-1">
                      {calendarDays.map((day) => {
                        const status = getDayStatus(day);
                        const isCurrentMonth = isSameMonth(day, currentDate);
                        const isTodayDate = isToday(day);

                        return (
                          <div
                            key={day.toISOString()}
                            className={`aspect-square flex items-center justify-center text-xs sm:text-sm rounded-lg relative ${
                              isCurrentMonth ? "text-gray-900" : "text-gray-400"
                            } ${
                              isTodayDate
                                ? "bg-blue-600 text-white font-semibold"
                                : ""
                            } ${
                              status === "taken" && !isTodayDate
                                ? "bg-green-100"
                                : ""
                            } ${
                              status === "missed" && !isTodayDate
                                ? "bg-red-100"
                                : ""
                            }`}
                          >
                            {format(day, "d")}
                          </div>
                        );
                      })}
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap justify-center gap-4 mt-4 text-xs sm:text-sm">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-500 rounded-full mr-2" />
                        <span className="text-gray-600">Medication taken</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-red-500 rounded-full mr-2" />
                        <span className="text-gray-600">Missed medication</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-blue-600 rounded-full mr-2" />
                        <span className="text-gray-600">Today</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
                      Details for {format(new Date(), "MMMM d, yyyy")}
                    </h3>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="space-y-2">
                        {schedulesLoading || adherenceLoading || logsLoading ? (
                          <LoadingSpinner size="md" />
                        ) : schedules && schedules.length > 0 ? (
                          schedules.map((schedule) => (
                            <div
                              key={schedule.schedule_id}
                              className="flex items-center justify-between"
                            >
                              <div>
                                <p className="text-xs sm:text-sm font-medium text-blue-900">
                                  {schedule.name}
                                </p>
                                <p className="text-xs text-blue-800">
                                  {schedule.dosage} - {schedule.quantity}{" "}
                                  {schedule.type || "tablet"}(s) -{" "}
                                  {schedule.dose_time}
                                </p>
                              </div>
                              <p className="text-xs sm:text-sm text-blue-800">
                                {schedule.is_taken ? "Taken" : "Pending"}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs sm:text-sm text-blue-800">
                            No medications scheduled
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">
                  Notification Preferences
                </h2>

                <div className="space-y-6">
                  {/* Email Notifications */}
                  <div className="border border-gray-200 rounded-lg p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-medium text-gray-900 text-sm sm:text-base">
                          Email Notifications
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600">
                          Receive medication alerts via email
                        </p>
                      </div>
                      <div className="relative">
                        <input
                          type="checkbox"
                          className="sr-only"
                          defaultChecked
                        />
                        <div className="w-10 sm:w-12 h-5 sm:h-6 bg-blue-600 rounded-full shadow-inner">
                          <div className="w-5 sm:w-6 h-5 sm:h-6 bg-white rounded-full shadow transform translate-x-5 sm:translate-x-6 transition-transform"></div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        defaultValue="caretaker@example.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                  </div>

                  {/* Missed Medication Alerts */}
                  <div className="border border-gray-200 rounded-lg p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-medium text-gray-900 text-sm sm:text-base">
                          Missed Medication Alerts
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600">
                          Get notified when medication is not taken on time
                        </p>
                      </div>
                      <div className="relative">
                        <input
                          type="checkbox"
                          className="sr-only"
                          defaultChecked
                        />
                        <div className="w-10 sm:w-12 h-5 sm:h-6 bg-blue-600 rounded-full shadow-inner">
                          <div className="w-5 sm:w-6 h-5 sm:h-6 bg-white rounded-full shadow transform translate-x-5 sm:translate-x-6 transition-transform"></div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                          Alert me if medication isn't taken within
                        </label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm">
                          <option>2 hours</option>
                          <option>1 hour</option>
                          <option>30 minutes</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                          Daily reminder time
                        </label>
                        <input
                          type="time"
                          defaultValue="08:00"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Time to check if today's medication was taken
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Email Preview */}
                  <div className="border border-gray-200 rounded-lg p-4 sm:p-6">
                    <h3 className="font-medium text-gray-900 mb-4 text-sm sm:text-base">
                      📧 Email Preview
                    </h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-xs sm:text-sm">
                        <div className="font-medium mb-2">
                          Subject: Medication Alert - Eleanor Thompson
                        </div>
                        <div className="text-gray-600 mb-2">Hello,</div>
                        <div className="text-gray-600 mb-2">
                          This is a reminder that Eleanor Thompson has not taken
                          her medication today.
                        </div>
                        <div className="text-gray-600 mb-2">
                          Please check with her to ensure she takes her
                          prescribed medication.
                        </div>
                        <div className="text-gray-600 mb-2">
                          Current adherence rate: 85% (5 day streak)
                        </div>
                      </div>
                    </div>
                  </div>

                  <button className="w-full bg-green-600 text-white py-2 sm:py-3 rounded-lg font-medium hover:bg-green-700 transition-colors text-sm sm:text-base">
                    Save Notification Settings
                  </button>
                </div>
              </div>
            )}

            {activeTab === "add-schedule" && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">
                  Add Medication Schedule
                </h2>

                {tabletsLoading ? (
                  <LoadingSpinner size="md" />
                ) : (
                  <form
                    onSubmit={handleSubmit}
                    className="gap-4 grid grid-cols-1 sm:grid-cols-2"
                  >
                    {/* Error/Success Messages */}
                    {formError && (
                      <div className="bg-red-50 text-red-700 p-4 rounded-lg col-span-1 sm:col-span-2">
                        {formError}
                      </div>
                    )}
                    {formSuccess && (
                      <div className="bg-green-50 text-green-700 p-4 rounded-lg col-span-1 sm:col-span-2">
                        {formSuccess}
                      </div>
                    )}

                    {/* Patient ID (Read-only) */}
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                        Patient
                      </label>
                      <input
                        type="text"
                        value={
                          patients?.find(
                            (p) => p.id === parseInt(selectedPatientId)
                          )?.username || ""
                        }
                        disabled
                        className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>

                    {/* Dose Time */}
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                        Dose Time (e.g., Morning, Afternoon) *Required
                      </label>
                      <select
                        name="dose_time"
                        value={formData.dose_time}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      >
                        <option value="">Select Dose Time</option>
                        <option value="Morning">Morning</option>
                        <option value="Afternoon">Afternoon</option>
                        <option value="Evening">Evening</option>
                        <option value="Night">Night</option>
                      </select>
                    </div>

                    {/* Expected Time */}
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                        Expected Time (optional)
                      </label>
                      <input
                        type="time"
                        name="expected_time"
                        value={formData.expected_time}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>

                    {/* Start Date */}
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                        Start Date *Required
                      </label>
                      <input
                        type="date"
                        name="start_date"
                        value={formData.start_date}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>

                    {/* End Date */}
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                        End Date (optional)
                      </label>
                      <input
                        type="date"
                        name="end_date"
                        value={formData.end_date}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>

                    {/* Tablets */}
                    <div className="col-span-1 sm:col-span-2">
                      <div className="flex justify-between items-center mb-4">
                        <label className="block text-xs sm:text-sm font-medium text-gray-700">
                          Tablets *Required
                        </label>
                        <button
                          type="button"
                          onClick={addTablet}
                          className="text-blue-600 hover:text-blue-700 text-xs sm:text-sm font-medium"
                        >
                          + Add Another Tablet
                        </button>
                      </div>
                      {formData.tablets.map((tablet, index) => (
                        <div
                          key={index}
                          className="grid grid-cols-2 md:grid-cols-3 gap-4 md:mb-4"
                        >
                          <div className="flex-1">
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                              Tablet
                            </label>
                            <select
                              value={tablet.tablet_id}
                              onChange={(e) =>
                                handleTabletChange(
                                  index,
                                  "tablet_id",
                                  e.target.value
                                )
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            >
                              <option value="">Select Tablet</option>
                              {tabletOptions.map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                  {opt.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="w-full sm:w-32">
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                              Quantity
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={tablet.quantity}
                              onChange={(e) =>
                                handleTabletChange(
                                  index,
                                  "quantity",
                                  e.target.value
                                )
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                          </div>
                          {formData.tablets.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeTablet(index)}
                              className="text-red-600 hover:text-red-700 px-3 py-2 text-xs sm:text-sm"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`w-full py-2 sm:py-3 px-4 rounded-lg font-medium text-white text-sm sm:text-base ${
                        isSubmitting
                          ? "bg-gray-500 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700"
                      } transition-colors`}
                    >
                      {isSubmitting
                        ? "Adding Schedule..."
                        : "Add Medication Schedule"}
                    </button>
                  </form>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 text-center">
            <p className="text-gray-600 text-sm sm:text-base">
              Please select a patient to view their medication details.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
