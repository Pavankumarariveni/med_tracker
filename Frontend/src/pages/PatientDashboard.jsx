import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { medicationApi } from "../utils/api";
import {
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
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
  differenceInDays,
} from "date-fns";
import LoadingSpinner from "../components/LoadingSpinner";

export default function PatientDashboard() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [photoFiles, setPhotoFiles] = useState({}); // Store photo files for each schedule
  const queryClient = useQueryClient();

  // Calculate date range for the current month
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = format(monthStart, "yyyy-MM-dd");
  const endDate = format(monthEnd, "yyyy-MM-dd");
  const todayStr = format(new Date(), "yyyy-MM-dd");

  // Fetch daily tablets for today
  const { data: schedules, isLoading: schedulesLoading } = useQuery({
    queryKey: ["daily-tablets", todayStr],
    queryFn: () => medicationApi.getDailyTablets(todayStr),
  });

  // Fetch adherence data for the current month
  const { data: adherenceData, isLoading: adherenceLoading } = useQuery({
    queryKey: ["adherence", startDate, endDate],
    queryFn: () => medicationApi.getAdherence(startDate, endDate),
  });

  // Fetch medication logs for the current month
  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ["medication-logs", startDate, endDate],
    queryFn: () => medicationApi.getLogs(startDate, endDate),
  });

  const markTakenMutation = useMutation({
    mutationFn: ({ scheduleId, photoFile }) =>
      medicationApi.markTaken(
        scheduleId,
        {
          log_date: todayStr,
          is_taken: true,
          taken_at: new Date().toISOString(),
        },
        photoFile
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["adherence", startDate, endDate],
      });
      queryClient.invalidateQueries({
        queryKey: ["medication-logs", startDate, endDate],
      });
      queryClient.invalidateQueries({
        queryKey: ["daily-tablets", todayStr],
      });
    },
  });

  const handleMarkTaken = (scheduleId) => {
    const photoFile = photoFiles[scheduleId] || null;
    markTakenMutation.mutate({ scheduleId, photoFile });
    setPhotoFiles((prev) => ({ ...prev, [scheduleId]: null })); // Clear photo after upload
  };

  const handlePhotoChange = (scheduleId, event) => {
    const file = event.target.files[0];
    setPhotoFiles((prev) => ({ ...prev, [scheduleId]: file }));
  };

  // Calendar logic
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

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

  //   console.log("fi_logs", dayLogs);
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

  // Calculate day streak
  const calculateDayStreak = () => {
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

      // Check if all schedules for the day were taken
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning!";
    if (hour < 17) return "Good Afternoon!";
    return "Good Evening!";
  };

  const overallAdherence = adherenceData?.overallAdherence || 0;
  const dayStreak = calculateDayStreak();
  const monthlyRate = overallAdherence;

  if (schedulesLoading || adherenceLoading || logsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-500 via-teal-500 to-green-500 rounded-2xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 text-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-center mb-4 sm:mb-6 gap-4">
            <div className="bg-white bg-opacity-20 p-2 sm:p-3 rounded-lg mr-0 sm:mr-4">
              <User className="w-4 h-4 md:h-6 md:w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">
                {getGreeting()}
              </h1>
              <p className="text-blue-100 text-sm sm:text-base">
                Ready to stay on track with your medication?
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-white bg-opacity-10 rounded-xl p-4 sm:p-6">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
                {dayStreak}
              </div>
              <div className="text-blue-100 text-sm sm:text-base">
                Day Streak
              </div>
            </div>
            <div className="bg-white bg-opacity-10 rounded-xl p-4 sm:p-6">
              <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-white bg-opacity-20 rounded-full mb-2">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="text-blue-100 text-sm sm:text-base">
                Today's Status
              </div>
            </div>
            <div className="bg-white bg-opacity-10 rounded-xl p-4 sm:p-6">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
                {monthlyRate}%
              </div>
              <div className="text-blue-100 text-sm sm:text-base">
                Monthly Rate
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {/* Today's Medication */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center mb-4 sm:mb-6">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 mr-3" />
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                Today's Medication
              </h2>
            </div>

            {schedules && schedules.length > 0 ? (
              <div className="space-y-4 sm:space-y-6">
                {schedules.map((schedule, index) => {
                  const isTaken = schedule.is_taken;

                  return (
                    <div
                      key={schedule.schedule_id}
                      className="flex flex-col p-4 bg-blue-50 rounded-lg"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2">
                        <div className="flex items-center mb-2 sm:mb-0">
                          <div className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center font-semibold mr-4 text-sm sm:text-base">
                            {index + 1}
                          </div>
                          <div>
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
                        </div>
                        <div className="block md:hidden pl-2">
                          {!isTaken && (
                            <div className="mt-2">
                              <label className="block text-xs sm:text-sm text-gray-600 mb-1">
                                Upload Photo (Optional)
                              </label>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) =>
                                  handlePhotoChange(schedule.schedule_id, e)
                                }
                                className="text-xs sm:text-sm text-gray-600 file:mr-4 file:py-2 file:px-6 file:rounded-lg file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                              />
                              {photoFiles[schedule.schedule_id] && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Selected:{" "}
                                  {photoFiles[schedule.schedule_id].name}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center text-xs sm:text-sm text-gray-600">
                          {isTaken ? (
                            <span className="text-green-600 font-medium">
                              Taken
                            </span>
                          ) : (
                            <button
                              onClick={() =>
                                handleMarkTaken(schedule.schedule_id)
                              }
                              disabled={markTakenMutation.isPending}
                              className="flex items-center px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-xs sm:text-sm"
                            >
                              {markTakenMutation.isPending ? (
                                <LoadingSpinner size="sm" />
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Mark Taken
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="hidden md:block pl-12">
                        {!isTaken && (
                          <div className="mt-2">
                            <label className="block text-xs sm:text-sm text-gray-600 mb-1">
                              Upload Photo (Optional)
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) =>
                                handlePhotoChange(schedule.schedule_id, e)
                              }
                              className="text-xs sm:text-sm text-gray-600 file:mr-4 file:py-2 file:px-6 file:rounded-lg file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            {photoFiles[schedule.schedule_id] && (
                              <p className="text-xs text-gray-500 mt-1">
                                Selected:{" "}
                                {photoFiles[schedule.schedule_id].name}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8">
                <p className="text-gray-600 text-sm sm:text-base">
                  No medications scheduled for today
                </p>
              </div>
            )}
          </div>

          {/* Medication Calendar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">
              Medication Calendar
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
                      isTodayDate ? "bg-blue-600 text-white font-semibold" : ""
                    }`}
                  >
                    {format(day, "d")}
                    {isCurrentMonth && status !== "none" && !isTodayDate && (
                      <div
                        className={`absolute bottom-1 right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                          status === "taken" ? "bg-green-500" : "bg-red-500"
                        }`}
                      />
                    )}
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
        </div>
      </div>
    </div>
  );
}
