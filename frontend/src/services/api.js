
const API_BASE_URL = "http://localhost:8080";

// ======================================================
// 1. JWT
// ======================================================

function getToken() {
  return localStorage.getItem("token");
}

// ======================================================
// 2. HÀM GỌI API DÙNG CHUNG
// ======================================================

async function request(path, options = {}) {
  const token = getToken();

  const headers = {
    ...(options.headers || {}),
  };

  // Không ghi đè Content-Type nếu đang gửi FormData.
  const isFormData =
    typeof FormData !== "undefined" &&
    options.body instanceof FormData;

  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch (error) {
    console.error("Không kết nối được backend:", {
      path,
      message: error.message,
    });

    throw new Error(
      "Không kết nối được backend. Hãy kiểm tra Spring Boot và cổng 8080."
    );
  }

  // Đọc text trước để tránh lỗi khi response rỗng.
  const responseText = await response.text();

  let data = null;

  if (responseText.trim() !== "") {
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error("Backend trả dữ liệu không phải JSON:", {
        path,
        status: response.status,
        responseText,
      });

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status} ${response.statusText}`
        );
      }

      throw new Error(
        `Backend trả dữ liệu không hợp lệ (HTTP ${response.status})`
      );
    }
  }

  // Xử lý lỗi HTTP kể cả khi response không có body.
  if (!response.ok) {
    const message =
      data?.message ||
      data?.error ||
      `HTTP ${response.status} ${response.statusText}`;

    console.error("API request thất bại:", {
      path,
      status: response.status,
      message,
    });

    throw new Error(message);
  }

  // Xử lý lỗi nghiệp vụ theo cấu trúc ApiResponse của backend.
  if (data?.success === false) {
    throw new Error(data.message || "Yêu cầu thất bại");
  }

  return data;
}

// ======================================================
// NHÓM 1 — ĐĂNG NHẬP / ĐĂNG XUẤT
// ======================================================

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
  }).catch((error) => {
    console.error("Lỗi kết nối khi đăng nhập:", error.message);

    throw new Error(
      "Không kết nối được backend. Hãy kiểm tra Spring Boot."
    );
  });

  const responseText = await response.text();
  let data = null;

  if (responseText.trim()) {
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error(
        `Response đăng nhập không hợp lệ (HTTP ${response.status})`
      );
    }
  }

  if (!response.ok || data?.success === false || !data) {
    throw new Error(
      data?.message ||
      `Đăng nhập thất bại (HTTP ${response.status})`
    );
  }

  return data;
}

// API-02: Đăng xuất
export async function logout() {
  return request("/auth/logout", {
    method: "POST",
  });
}

// ======================================================
// NHÓM 2 — DASHBOARD / CẢM BIẾN
// ======================================================

// API-03: Lấy dữ liệu cảm biến mới nhất
export async function getLatestSensors() {
  return request("/dashboard/sensors/latest");
}

// API-04: Lấy dữ liệu biểu đồ
export async function getChartData(limit = 20) {
  return request(
    `/dashboard/sensors/chart?limit=${encodeURIComponent(limit)}`
  );
}

// ======================================================
// NHÓM 3 — THIẾT BỊ / LED
// ======================================================

// API-09: Lấy danh sách thiết bị
export async function getDevices() {
  return request("/devices");
}

// API-10: Gửi lệnh bật/tắt thiết bị
// action phải là "on" hoặc "off".
export async function controlDevice(deviceId, action) {
  if (!["on", "off"].includes(action)) {
    throw new Error("Action phải là 'on' hoặc 'off'");
  }

  return request(
    `/devices/${encodeURIComponent(deviceId)}/control`,
    {
      method: "POST",
      body: JSON.stringify({ action }),
    }
  );
}

// API-11: Cập nhật trạng thái thiết bị
export async function updateDeviceStatus(deviceId, status) {
  return request(
    `/devices/${encodeURIComponent(deviceId)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }
  );
}

// ======================================================
// NHÓM 4 — LỊCH SỬ BẬT/TẮT
// ======================================================

// API-12: Lấy lịch sử điều khiển thiết bị
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

// ======================================================
// NHÓM 5 — PROFILE
// ======================================================

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

// API-17: Upload ảnh đại diện
export async function uploadAvatar(formData) {
  if (!(formData instanceof FormData)) {
    throw new Error("Dữ liệu upload phải là FormData");
  }

  return request("/profile/avatar", {
    method: "POST",
    body: formData,
  });
}

// ======================================================
// NHÓM 6 — LỊCH SỬ CẢM BIẾN
// ======================================================

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

  query.append("page", params.page ?? 1);
  query.append("limit", params.limit ?? 20);
  query.append("sort", params.sort || "desc");

  return request(`/datasensor?${query.toString()}`);
}
