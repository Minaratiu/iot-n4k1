const API_BASE_URL = "http://localhost:8080";

// Lấy JWT đã lưu sau khi đăng nhập
function getToken() {
  return localStorage.getItem("token");
}

// Hàm dùng chung để gọi API cần đăng nhập
async function request(path, options = {}) {
  const token = getToken();

  const headers = {
    ...(options.headers || {}),
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok || data.success === false) {
    throw new Error(data.message || `HTTP ${response.status}`);
  }

  return data;
}

// ==========================================
// NHÓM 4 — ĐĂNG NHẬP / ĐĂNG XUẤT
// ==========================================

// API-01: Đăng nhập
export async function login(username, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username,
      password,
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Đăng nhập thất bại");
  }

  return data;
}

// API-02: Đăng xuất
export async function logout() {
  return request("/auth/logout", {
    method: "POST",
  });
}

// ==========================================
// NHÓM 1 — DASHBOARD
// ==========================================

// API-03: Lấy cảm biến mới nhất
export async function getLatestSensors() {
  return request("/dashboard/sensors/latest");
}

// API-04: Lấy dữ liệu vẽ 3 biểu đồ
export async function getChartData(limit = 20) {
  return request(`/dashboard/sensors/chart?limit=${limit}`);
}

// ==========================================
// NHÓM 2 — THIẾT BỊ + LED
// ==========================================

// API-09: Lấy danh sách thiết bị
export async function getDevices() {
  return request("/devices");
}

// API-10: Điều khiển thiết bị (Bật/Tắt)
export async function controlDevice(deviceId, action) {
  return request(`/devices/${deviceId}/control`, {
    method: "POST",
    body: JSON.stringify({
      action, // 'on' hoặc 'off'
    }),
  });
}

// API-11: Cập nhật trạng thái thiết bị
export async function updateDeviceStatus(deviceId, status) {
  return request(`/devices/${deviceId}/status`, {
    method: "PATCH",
    body: JSON.stringify({
      status,
    }),
  });
}

// ==========================================
// NHÓM 3 — LỊCH SỬ BẬT/TẮT (ACTION HISTORY)
// ==========================================
// API-12: Lấy lịch sử bật/tắt thiết bị
export async function getDeviceHistory({
  deviceId = "",
  action = "",
  status = "",
  page = 0,
  size = 10,
} = {}) {
  const query = new URLSearchParams();

  if (deviceId !== "" && deviceId != null) {
    query.append("deviceId", deviceId);
  }

  if (action !== "" && action != null) {
    query.append("action", action);
  }

  if (status !== "" && status != null) {
    query.append("status", status);
  }

  query.append("page", page);
  query.append("size", size);

  return request(`/devices/history?${query.toString()}`);
}

// ==========================================
// MỞ RỘNG — PROFILE
// ==========================================

// API-14: Lấy thông tin cá nhân
export async function getProfile() {
  return request("/profile");
}

// API-15: Cập nhật thông tin cá nhân
export async function updateProfile(profileData) {
  return request("/profile", {
    method: "PUT",
    body: JSON.stringify(profileData),
  });
}

// API-16: Đổi mật khẩu
export async function changePassword(oldPassword, newPassword) {
  return request("/profile/password", {
    method: "PATCH",
    body: JSON.stringify({
      oldPassword,
      newPassword,
    }),
  });
}

// API-17: Đổi ảnh đại diện
export async function uploadAvatar(formData) {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/profile/avatar`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      // Không set Content-Type để trình duyệt tự thêm boundary cho FormData
    },
    body: formData,
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Tải ảnh thất bại");
  }
  return data;
}

// ==========================================
// NHÓM 5 — LỊCH SỬ CẢM BIẾN
// ==========================================

// API-18: Lấy lịch sử dữ liệu cảm biến
export async function getDataSensors(params = {}) {
  const query = new URLSearchParams();

  if (params.sensor_id) {
    query.append("sensor_id", params.sensor_id);
  }

  if (params.from) {
    query.append("from", params.from);
  }

  if (params.to) {
    query.append("to", params.to);
  }

  if (params.min_value !== "" && params.min_value != null) {
    query.append("min_value", params.min_value);
  }

  if (params.max_value !== "" && params.max_value != null) {
    query.append("max_value", params.max_value);
  }

  query.append("page", params.page || 1);
  query.append("limit", params.limit || 20);
  query.append("sort", params.sort || "desc");

  return request(`/datasensor?${query.toString()}`);
}