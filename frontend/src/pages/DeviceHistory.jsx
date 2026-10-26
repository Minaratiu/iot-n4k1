import { useEffect, useMemo, useState } from "react";
import { Copy } from "lucide-react";

import {
  getDeviceHistory,
  getDevices,
} from "../services/api";

import "./DeviceHistory.css";

// ======================================================
// CẤU HÌNH
// ======================================================

// Số bản ghi lấy trong mỗi request backend
const FETCH_SIZE = 100;

// Số bản ghi hiển thị trên mỗi trang
const PAGE_SIZE_OPTIONS = [5, 10, 15];

// Trạng thái hiển thị trên giao diện
const STATUS_OPTIONS = [
  { value: "LOADING", label: "LOADING" },
  { value: "SUCCESS", label: "SUCCEEDED" },
  { value: "FAILED", label: "FAILED" },
];

// Các hành động điều khiển thiết bị
const ACTION_OPTIONS = ["ON", "OFF"];

// Bộ lọc ban đầu
const INITIAL_FILTERS = {
  device: "all",
  action: "all",
  status: "all",
  time: "",
};

// ======================================================
// FORMAT THỜI GIAN
// ======================================================

function formatTime(value) {
  if (!value) return "";

  // Jackson có thể trả LocalDateTime dạng mảng
  if (Array.isArray(value)) {
    const [y, mo, d, h = 0, mi = 0, s = 0] = value;
    const pad = (n) => String(n).padStart(2, "0");

    return `${y}-${pad(mo)}-${pad(d)} ${pad(h)}:${pad(mi)}:${pad(s)}`;
  }

  // Backend trả thời gian dạng chuỗi
  let str = String(value)
    .replace("T", " ")
    .slice(0, 19);

  if (str.length === 16) {
    str += ":00";
  }

  return str;
}

// ======================================================
// CHUYỂN STATUS BACKEND → STATUS HIỂN THỊ
// ======================================================

function getDisplayStatus(action, backendStatus) {
  const a = String(action ?? "").toUpperCase();
  const s = String(backendStatus ?? "").toUpperCase();

  if (s === "LOADING") {
    return "LOADING";
  }

  if (s === "SUCCESS" || s === "SUCCEEDED") {
    return "SUCCEEDED";
  }

  if (s === "FAILED" || s === "FAILURE") {
    return "FAILED";
  }

  return s || (a ? "UNKNOWN" : "");
}

// ======================================================
// LẤY TOÀN BỘ LỊCH SỬ TỪ BACKEND
// ======================================================

async function fetchAllHistory({ device, action, status }) {
  const all = [];

  let pageIndex = 0;
  let totalPages = 1;

  // Chuyển hành động sang định dạng backend
  const backendAction =
    action === "all" ? "" : action.toLowerCase();

  // Chuyển trạng thái sang định dạng backend
  let backendStatus = "";

  if (status === "LOADING") {
    backendStatus = "loading";
  } else if (status === "SUCCESS") {
    backendStatus = "success";
  } else if (status === "FAILED") {
    backendStatus = "failed";
  }

  // Lấy từng trang backend, tối đa 100 bản ghi/request
  do {
    const res = await getDeviceHistory({
      deviceId: device === "all" ? "" : device,
      action: backendAction,
      status: backendStatus,
      page: pageIndex,
      size: FETCH_SIZE,
    });

    const data = res?.data;

    all.push(...(data?.content ?? []));

    totalPages = data?.totalPages ?? 1;
    pageIndex++;
  } while (pageIndex < totalPages && pageIndex < 50);

  // Chuẩn hóa dữ liệu trả về cho giao diện
  return all.map((record) => {
    const actionValue = String(
      record.action ?? ""
    ).toUpperCase();

    const backendStatusValue = String(
      record.status ?? ""
    ).toUpperCase();

    return {
      id: record.id,
      deviceId: record.deviceId,
      deviceName: record.deviceName ?? "",
      action: actionValue,
      status: getDisplayStatus(
        actionValue,
        backendStatusValue
      ),
      userName: record.username ?? "Không xác định",
      time: formatTime(record.createdAt),
    };
  });
}

// ======================================================
// THÔNG BÁO LỖI
// ======================================================

function friendlyError(error) {
  const message = String(error?.message ?? "");

  if (
    /HTTP (401|403)|Unexpected end of JSON/i.test(message)
  ) {
    return "Chưa đăng nhập hoặc phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.";
  }

  if (
    /Failed to fetch|NetworkError|Load failed/i.test(message)
  ) {
    return "Không kết nối được máy chủ. Hãy kiểm tra backend (cổng 8080) và cấu hình CORS.";
  }

  return message || "Đã có lỗi xảy ra.";
}

// ======================================================
// VALIDATE THỜI GIAN
// ======================================================

const TIME_PATTERN =
  /^\d{1,4}(-\d{1,2}(-\d{1,2}([ T]\d{1,2}(:\d{1,2}(:\d{1,2})?)?)?)?)?$/;

// ======================================================
// CHUẨN HÓA INPUT THỜI GIAN
// ======================================================

function normalizeTimeInput(raw) {
  return raw
    .trim()
    .replace(/[\s:*\\-]+$/, "")
    .replace("T", " ");
}

// ======================================================
// THÊM SỐ 0 VÀO PHẦN THỜI GIAN
// ======================================================

function padTimeParts(str) {
  return str.replace(
    /(^|[-: ])(\d)(?=$|[-: ])/g,
    (_, separator, digit) => `${separator}0${digit}`
  );
}

// ======================================================
// CLASS CHO TAG
// ======================================================

function tagClass(value) {
  if (value === "ON") return "dh-on";
  if (value === "OFF") return "dh-off";
  if (value === "SUCCEEDED") return "dh-success";
  if (value === "FAILED") return "dh-failed";
  if (value === "LOADING") return "dh-loading";

  return "";
}

// ======================================================
// NHÃN TRẠNG THÁI HIỂN THỊ
// ======================================================

const STATUS_LABELS = {
  LOADING: "LOADING",
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
};

// ======================================================
// ICON TÌM KIẾM
// ======================================================

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

// ======================================================
// ICON PHÂN TRANG
// ======================================================

function ChevronIcon({ direction }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {direction === "left" ? (
        <path d="m15 5-7 7 7 7" />
      ) : (
        <path d="m9 5 7 7-7 7" />
      )}
    </svg>
  );
}

// ======================================================
// COMPONENT DEVICE HISTORY
// ======================================================

export default function DeviceHistory() {
  // Bộ lọc người dùng đang nhập
  const [draft, setDraft] = useState(INITIAL_FILTERS);
  const [timeError, setTimeError] = useState("");

  // Bộ lọc đã áp dụng
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  // Phân trang giao diện
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Danh sách thiết bị
  const [devices, setDevices] = useState([]);

  // Dữ liệu lịch sử và trạng thái tải
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ====================================================
  // SAO CHÉP THỜI GIAN
  // ====================================================

  async function handleCopyTime(time) {
    if (!time) return;

    try {
      await navigator.clipboard.writeText(time);
    } catch (err) {
      console.error("Không thể sao chép thời gian:", err);
    }
  }

  // ====================================================
  // LẤY DANH SÁCH THIẾT BỊ
  // ====================================================

  useEffect(() => {
    let cancelled = false;

    getDevices()
      .then((res) => {
        if (cancelled) return;

        setDevices(
          (res?.data ?? []).map((device) => ({
            id: device.id,
            name: device.name,
          }))
        );
      })
      .catch(() => {
        if (cancelled) return;
        setDevices([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // ====================================================
  // LẤY LỊCH SỬ
  // ====================================================

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError("");

    fetchAllHistory(filters)
      .then((list) => {
        if (cancelled) return;

        setRecords(list);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;

        setRecords([]);
        setError(friendlyError(err));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filters]);

  // ====================================================
  // LỌC THỜI GIAN Ở FRONTEND
  // ====================================================

  const filtered = useMemo(() => {
    if (filters.time === "") {
      return records;
    }

    return records.filter((record) =>
      record.time.startsWith(filters.time)
    );
  }, [records, filters.time]);

  // ====================================================
  // TÍNH TOÁN PHÂN TRANG
  // ====================================================

  const total = filtered.length;

  const totalPages = Math.max(
    1,
    Math.ceil(total / pageSize)
  );

  const currentPage = Math.min(page, totalPages);

  const start = (currentPage - 1) * pageSize;

  const rows = filtered.slice(
    start,
    start + pageSize
  );

  // ====================================================
  // THAY ĐỔI FILTER
  // ====================================================

  function handleDraftChange(field, value) {
    setDraft((previous) => ({
      ...previous,
      [field]: value,
    }));

    if (field === "time") {
      setTimeError("");
    }
  }

  // ====================================================
  // TÌM KIẾM
  // ====================================================

  function handleSearch() {
    setTimeError("");

    const timeQuery = normalizeTimeInput(draft.time);

    if (
      timeQuery !== "" &&
      !TIME_PATTERN.test(timeQuery)
    ) {
      setTimeError(
        "Nhập theo dạng năm-tháng-ngày giờ:phút:giây, VD: 2024-11-18 08:00:00"
      );
      return;
    }

    setFilters({
      ...draft,
      time: padTimeParts(timeQuery),
    });

    setPage(1);
  }

  // ====================================================
  // ĐỔI SỐ BẢN GHI MỖI TRANG
  // ====================================================

  function handlePageSizeChange(event) {
    setPageSize(Number(event.target.value));
    setPage(1);
  }

  // ====================================================
  // TRANG TRƯỚC
  // ====================================================

  function handlePrevious() {
    if (currentPage <= 1 || loading) return;

    setPage((previous) => Math.max(1, previous - 1));
  }

  // ====================================================
  // TRANG SAU
  // ====================================================

  function handleNext() {
    if (currentPage >= totalPages || loading) return;

    setPage((previous) =>
      Math.min(totalPages, previous + 1)
    );
  }

  // ====================================================
  // GIAO DIỆN
  // ====================================================

  return (
    <div className="dh-page">
      {/* HEADER */}
      <div className="dh-header">
        <h1 className="dh-title">
          Lịch sử bật tắt thiết bị
        </h1>
      </div>

      {/* BỘ LỌC */}
      <div className="dh-filter-card">
        <div className="dh-filter-grid">
          {/* THIẾT BỊ */}
          <div className="dh-filter-item">
            <label htmlFor="dh-device">Thiết bị</label>

            <select
              id="dh-device"
              className={
                draft.device === "all"
                  ? "dh-placeholder"
                  : ""
              }
              value={draft.device}
              onChange={(event) =>
                handleDraftChange("device", event.target.value)
              }
            >
              <option value="all">Tất cả</option>

              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name}
                </option>
              ))}
            </select>
          </div>

          {/* HÀNH ĐỘNG */}
          <div className="dh-filter-item">
            <label htmlFor="dh-action">Hành động</label>

            <select
              id="dh-action"
              className={
                draft.action === "all"
                  ? "dh-placeholder"
                  : ""
              }
              value={draft.action}
              onChange={(event) =>
                handleDraftChange("action", event.target.value)
              }
            >
              <option value="all">Tất cả</option>

              {ACTION_OPTIONS.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </div>

          {/* TRẠNG THÁI */}
          <div className="dh-filter-item">
            <label htmlFor="dh-status">Trạng thái</label>

            <select
              id="dh-status"
              className={
                draft.status === "all"
                  ? "dh-placeholder"
                  : ""
              }
              value={draft.status}
              onChange={(event) =>
                handleDraftChange("status", event.target.value)
              }
            >
              <option value="all">Tất cả</option>

              {STATUS_OPTIONS.map((status) => (
                <option
                  key={status.value}
                  value={status.value}
                >
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {/* THỜI GIAN */}
          <div className="dh-filter-item">
            <label htmlFor="dh-time">Thời gian</label>

            <input
              id="dh-time"
              type="text"
              value={draft.time}
              placeholder="YYYY-MM-DD HH:mm:ss"
              onChange={(event) =>
                handleDraftChange("time", event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSearch();
                }
              }}
            />

            {timeError && (
              <div className="dh-time-error">
                {timeError}
              </div>
            )}
          </div>

          {/* NÚT TÌM KIẾM */}
          <div className="dh-filter-actions">
            <button
              type="button"
              className="dh-search-btn"
              onClick={handleSearch}
              disabled={loading}
            >
              <SearchIcon />
              Tìm kiếm
            </button>
          </div>
        </div>
      </div>

      {/* THÔNG BÁO LỖI */}
      {error && (
        <div className="dh-error">
          {error}
        </div>
      )}

      {/* BẢNG LỊCH SỬ */}
      <div className="dh-table-card">
        {loading ? (
          <div className="dh-state">
            Đang tải lịch sử...
          </div>
        ) : rows.length === 0 ? (
          <div className="dh-state">
            Không có dữ liệu lịch sử.
          </div>
        ) : (
          <div className="dh-table-wrapper">
            <table className="dh-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Tên thiết bị</th>
                  <th>Hành động</th>
                  <th>Trạng thái</th>
                  <th>Người thực hiện</th>
                  <th>Thời gian</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((record, index) => (
                  <tr key={record.id}>
                    <td>
                      <span className="dh-stt">
                        {start + index + 1}
                      </span>
                    </td>

                    <td>
                      <span className="dh-device-name">
                        {record.deviceName ||
                          `Thiết bị ${record.deviceId}`}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`dh-tag ${tagClass(record.action)}`}
                      >
                        {record.action}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`dh-tag ${tagClass(record.status)}`}
                      >
                        {STATUS_LABELS[record.status] ??
                          record.status}
                      </span>
                    </td>

                    <td>
                      <span className="dh-device-name">
                        {record.userName}
                      </span>
                    </td>

                    {/* THỜI GIAN + NÚT SAO CHÉP */}
                    <td>
                      <div className="dh-time-cell">
                        <span>{record.time}</span>

                        <button
                          type="button"
                          className="dh-copy-btn"
                          onClick={() =>
                            handleCopyTime(record.time)
                          }
                          title="Sao chép thời gian"
                          aria-label="Sao chép thời gian"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* FOOTER / PHÂN TRANG */}
        {!loading && (
          <div className="dh-table-footer">
            {/* SỐ BẢN GHI VÀ TỔNG */}
            <div className="dh-summary">
              <span>Hiển thị</span>

              <select
                id="dh-page-size"
                className="dh-page-size"
                value={pageSize}
                onChange={handlePageSizeChange}
                aria-label="Số bản ghi mỗi trang"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>

              <span>bản ghi / {total} bản ghi</span>
            </div>

            {/* NÚT PHÂN TRANG */}
            <div className="dh-pagination">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={currentPage <= 1 || loading}
              >
                <ChevronIcon direction="left" />
                Trước
              </button>

              <span>
                Trang {total === 0 ? 0 : currentPage} /{" "}
                {total === 0 ? 0 : totalPages}
              </span>

              <button
                type="button"
                onClick={handleNext}
                disabled={
                  currentPage >= totalPages ||
                  total === 0 ||
                  loading
                }
              >
                Sau
                <ChevronIcon direction="right" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
 