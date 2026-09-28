import { useEffect, useMemo, useState } from "react";

import {
  getDeviceHistory,
  getDevices,
} from "../services/api";

import "./DeviceHistory.css";

// ======================================================
// CẤU HÌNH
// ======================================================

// Backend cho phép size tối đa 100
const FETCH_SIZE = 100;

// Số dòng hiển thị trên 1 trang giao diện
const PAGE_SIZE = 5;

// Trạng thái hiển thị trên giao diện
const STATUS_OPTIONS = ["LOADING", "ON", "OFF"];

// Hành động
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

  // Trường hợp Jackson trả LocalDateTime dạng mảng
  // Ví dụ: [2026, 9, 21, 15, 30, 20]
  if (Array.isArray(value)) {
    const [y, mo, d, h = 0, mi = 0, s = 0] = value;

    const pad = (n) => String(n).padStart(2, "0");

    return `${y}-${pad(mo)}-${pad(d)} ${pad(h)}:${pad(mi)}:${pad(s)}`;
  }

  // Trường hợp backend trả String
  let str = String(value)
    .replace("T", " ")
    .slice(0, 19);

  // Nếu chỉ có yyyy-MM-dd HH:mm
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

  // Chưa nhận được phản hồi từ ESP
  if (s === "LOADING") {
    return "LOADING";
  }

  // ESP phản hồi thành công
  // ON + SUCCESS → ON
  // OFF + SUCCESS → OFF
  if (s === "SUCCESS") {
    return a;
  }

  // Trường hợp backend báo thất bại
  if (s === "FAILED") {
    return "FAILED";
  }

  return s;
}

// ======================================================
// LẤY LỊCH SỬ
// ======================================================

async function fetchAllHistory({
  device,
  action,
  status,
}) {
  const all = [];

  let pageIndex = 0;
  let totalPages = 1;

  // ====================================================
  // CHUYỂN FILTER GIAO DIỆN → FILTER BACKEND
  // ====================================================

  let backendAction =
    action === "all"
      ? ""
      : action.toLowerCase();

  let backendStatus = "";

  // UI: LOADING
  // Backend: status=loading
  if (status === "LOADING") {
    backendStatus = "loading";
  }

  // UI: ON
  // Backend: action=on + status=success
  else if (status === "ON") {
    backendAction = "on";
    backendStatus = "success";
  }

  // UI: OFF
  // Backend: action=off + status=success
  else if (status === "OFF") {
    backendAction = "off";
    backendStatus = "success";
  }

  // ====================================================
  // LẤY TỪNG TRANG BACKEND
  // ====================================================

  do {
    const res = await getDeviceHistory({
      deviceId:
        device === "all"
          ? ""
          : device,

      action: backendAction,

      status: backendStatus,

      // Backend page bắt đầu từ 0
      page: pageIndex,

      // Backend cho phép tối đa 100
      size: FETCH_SIZE,
    });

    const data = res?.data;

    // Spring Page trả content
    all.push(...(data?.content ?? []));

    totalPages = data?.totalPages ?? 1;

    pageIndex++;
  } while (
    pageIndex < totalPages &&
    pageIndex < 50
  );

  // ====================================================
  // CHUẨN HÓA DỮ LIỆU CHO UI
  // ====================================================

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
// ERROR
// ======================================================

function friendlyError(error) {
  const message = String(
    error?.message ?? ""
  );

  if (
    /HTTP (401|403)|Unexpected end of JSON/i.test(
      message
    )
  ) {
    return "Chưa đăng nhập hoặc phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.";
  }

  if (
    /Failed to fetch|NetworkError|Load failed/i.test(
      message
    )
  ) {
    return "Không kết nối được máy chủ. Hãy kiểm tra backend (cổng 8080) và cấu hình CORS.";
  }

  return message || "Đã có lỗi xảy ra";
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
    (_, separator, digit) =>
      `${separator}0${digit}`
  );
}

// ======================================================
// CLASS CHO TAG
// ======================================================

function tagClass(value) {
  if (value === "ON") {
    return "dh-on";
  }

  if (value === "OFF") {
    return "dh-off";
  }

  if (value === "LOADING") {
    return "dh-loading";
  }

  if (value === "FAILED") {
    return "dh-off";
  }

  return "";
}

// ======================================================
// ICON (chỉ dùng cho giao diện)
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
// COMPONENT
// ======================================================

export default function DeviceHistory() {
  // ----------------------------------------------------
  // FILTER NHẬP
  // ----------------------------------------------------

  const [draft, setDraft] =
    useState(INITIAL_FILTERS);

  const [timeError, setTimeError] =
    useState("");

  // ----------------------------------------------------
  // FILTER ĐÃ ÁP DỤNG
  // ----------------------------------------------------

  const [filters, setFilters] =
    useState(INITIAL_FILTERS);

  // ----------------------------------------------------
  // PAGINATION UI
  // ----------------------------------------------------

  const [page, setPage] = useState(1);

  // ----------------------------------------------------
  // RELOAD
  // ----------------------------------------------------

  const [reloadKey, setReloadKey] =
    useState(0);

  // ----------------------------------------------------
  // DEVICES
  // ----------------------------------------------------

  const [devices, setDevices] =
    useState([]);

  // ----------------------------------------------------
  // HISTORY
  // ----------------------------------------------------

  const [records, setRecords] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

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
  }, [reloadKey]);

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
        setError(
          friendlyError(err)
        );
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filters, reloadKey]);

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
  // PAGINATION
  // ====================================================

  const total = filtered.length;

  const totalPages = Math.max(
    1,
    Math.ceil(total / PAGE_SIZE)
  );

  const currentPage = Math.min(
    page,
    totalPages
  );

  const start =
    (currentPage - 1) * PAGE_SIZE;

  const rows = filtered.slice(
    start,
    start + PAGE_SIZE
  );

  // ====================================================
  // XỬ LÝ THAY ĐỔI FILTER
  // ====================================================

  function handleDraftChange(
    field,
    value
  ) {
    setDraft((previous) => ({
      ...previous,
      [field]: value,
    }));

    if (field === "time") {
      setTimeError("");
    }
  }

  // ====================================================
  // SEARCH
  // ====================================================

  function handleSearch() {
    setTimeError("");

    const timeQuery =
      normalizeTimeInput(draft.time);

    if (
      timeQuery !== "" &&
      !TIME_PATTERN.test(timeQuery)
    ) {
      setTimeError(
        "Nhập theo dạng năm-tháng-ngày giờ:phút:giây, VD: 2024-11-18 08:00:00"
      );

      return;
    }

    const normalizedTime =
      padTimeParts(timeQuery);

    setFilters({
      ...draft,
      time: normalizedTime,
    });

    setPage(1);
  }

  // ====================================================
  // RESET FILTER
  // ====================================================

  function handleReset() {
    setDraft(INITIAL_FILTERS);
    setFilters(INITIAL_FILTERS);
    setTimeError("");
    setPage(1);
  }

  // ====================================================
  // RELOAD
  // ====================================================

  function handleReload() {
    setReloadKey(
      (previous) => previous + 1
    );
  }

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="dh-page">
      {/* ================================================
          HEADER
          ================================================ */}

      <div className="dh-header">
        <h1 className="dh-title">
          Lịch sử bật tắt thiết bị
        </h1>
      </div>

      {/* ================================================
          FILTER
          ================================================ */}

      <div className="dh-filter-card">
        <div className="dh-filter-grid">

          {/* THIẾT BỊ */}

          <div className="dh-filter-item">
            <label htmlFor="dh-device">
              Thiết bị
            </label>

            <select
              id="dh-device"
              className={
                draft.device === "all"
                  ? "dh-placeholder"
                  : ""
              }
              value={draft.device}
              onChange={(event) =>
                handleDraftChange(
                  "device",
                  event.target.value
                )
              }
            >
              <option value="all">
                Tất cả
              </option>

              {devices.map((device) => (
                <option
                  key={device.id}
                  value={device.id}
                >
                  {device.name}
                </option>
              ))}
            </select>
          </div>

          {/* HÀNH ĐỘNG */}

          <div className="dh-filter-item">
            <label htmlFor="dh-action">
              Hành động
            </label>

            <select
              id="dh-action"
              className={
                draft.action === "all"
                  ? "dh-placeholder"
                  : ""
              }
              value={draft.action}
              onChange={(event) =>
                handleDraftChange(
                  "action",
                  event.target.value
                )
              }
            >
              <option value="all">
                Tất cả
              </option>

              {ACTION_OPTIONS.map(
                (action) => (
                  <option
                    key={action}
                    value={action}
                  >
                    {action}
                  </option>
                )
              )}
            </select>
          </div>

          {/* TRẠNG THÁI */}

          <div className="dh-filter-item">
            <label htmlFor="dh-status">
              Trạng thái
            </label>

            <select
              id="dh-status"
              className={
                draft.status === "all"
                  ? "dh-placeholder"
                  : ""
              }
              value={draft.status}
              onChange={(event) =>
                handleDraftChange(
                  "status",
                  event.target.value
                )
              }
            >
              <option value="all">
                Tất cả
              </option>

              {STATUS_OPTIONS.map(
                (status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {status}
                  </option>
                )
              )}
            </select>
          </div>

          {/* THỜI GIAN */}

          <div className="dh-filter-item">
            <label htmlFor="dh-time">
              Thời gian
            </label>

            <input
              id="dh-time"
              type="text"
              value={draft.time}
              placeholder="YYYY-MM-DD HH:mm:ss"
              onChange={(event) =>
                handleDraftChange(
                  "time",
                  event.target.value
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key === "Enter"
                ) {
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

          {/* BUTTON */}

          <div className="dh-filter-actions">
            <button
              type="button"
              className="dh-search-btn"
              onClick={handleSearch}
            >
              <SearchIcon />
              Tìm kiếm
            </button>

            
          </div>

        </div>
      </div>

      {/* ================================================
          ERROR
          ================================================ */}

      {error && (
        <div className="dh-error">
          {error}
        </div>
      )}

      {/* ================================================
          TABLE
          ================================================ */}

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
                {rows.map(
                  (record, index) => (
                    <tr key={record.id}>

                      {/* STT */}

                      <td>
                        <span className="dh-stt">
                          {start + index + 1}
                        </span>
                      </td>

                      {/* DEVICE */}

                      <td>
                        <span className="dh-device-name">
                          {record.deviceName ||
                            `Thiết bị ${record.deviceId}`}
                        </span>
                      </td>

                      {/* ACTION */}

                      <td>
                        <span
                          className={`dh-tag ${tagClass(
                            record.action
                          )}`}
                        >
                          {record.action}
                        </span>
                      </td>

                      {/* STATUS */}

                      <td>
                        <span
                          className={`dh-tag ${tagClass(
                            record.status
                          )}`}
                        >
                          {record.status}
                        </span>
                      </td>

                      {/* USER */}

                      <td>
                        <span 
                            className="dh-device-name">
                             {record.userName}
                         </span>
                      </td>

                      {/* TIME */}

                      <td>
                        {record.time}
                      </td>

                    </tr>
                  )
                )}
              </tbody>

            </table>
          </div>
        )}

        {/* ==============================================
            FOOTER / PAGINATION
            ============================================== */}

        {!loading && (
          <div className="dh-table-footer">

            <div className="dh-total">
              {total === 0 ? (
                "Không có bản ghi"
              ) : (
                <>
                  Hiển thị{" "}
                  <strong>
                    {start + 1}–
                    {Math.min(
                      start + PAGE_SIZE,
                      total
                    )}
                  </strong>{" "}
                  / {total} bản ghi
                </>
              )}
            </div>

            <div className="dh-pagination">

              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() =>
                  setPage(
                    (previous) =>
                      Math.max(
                        1,
                        previous - 1
                      )
                  )
                }
              >
                <ChevronIcon direction="left" />
                Trước
              </button>

              <span>
                Trang {currentPage} /{" "}
                {totalPages}
              </span>

              <button
                type="button"
                disabled={
                  currentPage >= totalPages
                }
                onClick={() =>
                  setPage(
                    (previous) =>
                      Math.min(
                        totalPages,
                        previous + 1
                      )
                  )
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