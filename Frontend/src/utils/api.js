const API_BASE_URL = `${import.meta.env.VITE_API_URL}`;

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem("authToken");
};

// Create headers with auth token
const createHeaders = (isMultipart = false) => {
  const token = getAuthToken();
  return {
    ...(isMultipart ? {} : { "Content-Type": "application/json" }),
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// Generic API request function
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = createHeaders(options.isMultipart);

  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Network error" }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Auth API
export const authApi = {
  login: async (credentials) => {
    return apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  },

  signup: async (userData) => {
    return apiRequest("/auth/register", {
      // Updated to /register
      method: "POST",
      body: JSON.stringify(userData),
    });
  },
};

// Patient API
export const patientApi = {
  getPatients: async () => {
    return apiRequest("/patients");
  },
};

// Medication API
export const medicationApi = {
  getDailyTablets: async (date, userId) => {
    const params = new URLSearchParams({ date });
    if (userId) params.append("user_id", userId);
    return apiRequest(`/medications/daily?${params.toString()}`);
  },

  addSchedule: async (scheduleData, userId) => {
    return apiRequest(`/medications/schedule`, {
      method: "POST",
      body: JSON.stringify({ ...scheduleData, user_id: userId }),
    });
  },

  markTaken: async (scheduleId, data, photoFile) => {
    const formData = new FormData();
    formData.append("schedule_id", scheduleId);
    formData.append("log_date", data.log_date);
    formData.append("is_taken", data.is_taken);
    if (data.taken_at) formData.append("taken_at", data.taken_at);
    if (photoFile) formData.append("photo", photoFile);

    return apiRequest(`/medications/mark-taken`, {
      method: "POST",
      body: formData,
      isMultipart: true,
    });
  },

  getAdherence: async (startDate, endDate, userId) => {
    const params = new URLSearchParams();
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    if (userId) params.append("user_id", userId);

    return apiRequest(`/medications/adherence?${params.toString()}`);
  },

  getLogs: async (startDate, endDate, userId) => {
    const params = new URLSearchParams();
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    if (userId) params.append("user_id", userId);

    return apiRequest(`/medications/logs?${params.toString()}`);
  },
  getTablets: async () => {
    return apiRequest("/medications/tablets");
  },
};
