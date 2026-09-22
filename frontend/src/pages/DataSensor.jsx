import { useEffect, useState } from "react";
import "./DataSensor.css";
import { getDataSensors } from "../services/api";
import { Search as SearchIcon } from "lucide-react";

const SENSOR_TYPES = [
  { name: "Nhiệt độ", id: 1 },
  { name: "Độ ẩm", id: 2 },
  { name: "Ánh sáng", id: 3 },
];

const PAGE_SIZE = 5;

// ==========================================
// CHUẨN HÓA THỜI GIAN NHẬP
// ==========================================

function normalizeTimeInput(value) {
  if (!value) return "";

  return value.trim().replace(/\s+/g, " ");
}
// ==========================================
// THÊM 0 VÀO THÁNG / NGÀY / GIỜ / PHÚT / GIÂY
// KHÔNG TỰ THÊM PHẦN BỊ THIẾU
// ==========================================
function padTimeParts(value) {
  if (!value) return "";

  const parts = value.split(" ");

  // Chỉ có ngày: YYYY-MM-DD
  if (parts.length === 1) {
    const dateParts = parts[0].split("-");

    if (dateParts.length !== 3) {
      return value;
    }

    const year = dateParts[0];
    const month = dateParts[1].padStart(2, "0");
    const day = dateParts[2].padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  const datePart = parts[0];
  const timePart = parts[1];

  const dateParts = datePart.split("-");

  if (dateParts.length !== 3) {
    return value;
  }

  const year = dateParts[0];
  const month = dateParts[1].padStart(2, "0");
  const day = dateParts[2].padStart(2, "0");

  const newDate = `${year}-${month}-${day}`;

  if (!timePart) {
    return newDate;
  }

  // QUAN TRỌNG:
  // Giữ nguyên số lượng phần thời gian người dùng nhập.
  //
  // 21       -> 21
  // 8:15     -> 08:15
  // 8:15:22  -> 08:15:22

  const timeParts = timePart.split(":");

  const newTime = timeParts
    .map((part) => part.padStart(2, "0"))
    .join(":");

  return `${newDate} ${newTime}`;
}

// ==========================================
// CHUYỂN GIÁ TRỊ SANG NUMBER
// ==========================================

function parseNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return null;
  }

  return number;
}

// ==========================================
// HIỂN THỊ THỜI GIAN
// Backend trả:
// 2024/11/18 08:15:22
//
// UI hiển thị:
// 2024-11-18 08:15:22
// ==========================================

function formatRecordedAt(value) {
  if (!value) return "";

  return value.replace(/\//g, "-");
}

// ==========================================
// COMPONENT
// ==========================================

export default function DataSensor() {
  const [sensorType, setSensorType] = useState("");
  const [valueInput, setValueInput] = useState("");
  const [timeInput, setTimeInput] = useState("");

  const [rows, setRows] = useState([]);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ==========================================
  // TẠO KHOẢNG THỜI GIAN TỪ INPUT
  // ==========================================

  const buildTimeParams = () => {
    if (timeInput.trim() === "") {
      return {
        from: "",
        to: "",
      };
    }

    const normalized = normalizeTimeInput(timeInput);
    const padded = padTimeParts(normalized);

    // ========================================
    // 1. YYYY
    // Ví dụ:
    // 2024
    //
    // => cả năm
    // ========================================

    if (/^\d{4}$/.test(padded)) {
      return {
        from: `${padded}-01-01 00:00:00`,
        to: `${padded}-12-31 23:59:59`,
      };
    }

    // ========================================
    // 2. YYYY-MM
    // Ví dụ:
    // 2024-11
    //
    // => cả tháng
    // ========================================

    if (/^\d{4}-\d{2}$/.test(padded)) {
      const [year, month] = padded.split("-");

      const monthNumber = Number(month);

      if (monthNumber < 1 || monthNumber > 12) {
        throw new Error("Tháng phải từ 01 đến 12.");
      }

      const lastDay = new Date(
        Number(year),
        monthNumber,
        0
      ).getDate();

      return {
        from: `${year}-${month}-01 00:00:00`,
        to: `${year}-${month}-${String(lastDay).padStart(
          2,
          "0"
        )} 23:59:59`,
      };
    }

    // ========================================
    // 3. YYYY-MM-DD
    // Ví dụ:
    // 2024-11-18
    //
    // => cả ngày
    // ========================================

    if (/^\d{4}-\d{2}-\d{2}$/.test(padded)) {
      return {
        from: `${padded} 00:00:00`,
        to: `${padded} 23:59:59`,
      };
    }

    // ========================================
    // 4. YYYY-MM-DD HH
    // Ví dụ:
    // 2024-11-18 08
    //
    // => 08:00:00 → 08:59:59
    // ========================================

    if (
      /^\d{4}-\d{2}-\d{2} \d{2}$/.test(padded)
    ) {
      const [date, hour] = padded.split(" ");

      const hourNumber = Number(hour);

      if (hourNumber < 0 || hourNumber > 23) {
        throw new Error("Giờ phải từ 00 đến 23.");
      }

      return {
        from: `${date} ${hour}:00:00`,
        to: `${date} ${hour}:59:59`,
      };
    }

    // ========================================
    // 5. YYYY-MM-DD HH:mm
    // Ví dụ:
    // 2024-11-18 08:15
    //
    // => 08:15:00 → 08:15:59
    // ========================================

    if (
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(
        padded
      )
    ) {
      const [date, time] = padded.split(" ");

      const [hour, minute] = time.split(":");

      const hourNumber = Number(hour);
      const minuteNumber = Number(minute);

      if (hourNumber < 0 || hourNumber > 23) {
        throw new Error("Giờ phải từ 00 đến 23.");
      }

      if (minuteNumber < 0 || minuteNumber > 59) {
        throw new Error(
          "Phút phải từ 00 đến 59."
        );
      }

      return {
        from: `${date} ${time}:00`,
        to: `${date} ${time}:59`,
      };
    }

    // ========================================
    // 6. YYYY-MM-DD HH:mm:ss
    // Ví dụ:
    // 2024-11-18 08:15:22
    //
    // => đúng giây đó
    // ========================================

    if (
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(
        padded
      )
    ) {
      const [date, time] = padded.split(" ");

      const [hour, minute, second] =
        time.split(":");

      const hourNumber = Number(hour);
      const minuteNumber = Number(minute);
      const secondNumber = Number(second);

      if (hourNumber < 0 || hourNumber > 23) {
        throw new Error("Giờ phải từ 00 đến 23.");
      }

      if (minuteNumber < 0 || minuteNumber > 59) {
        throw new Error(
          "Phút phải từ 00 đến 59."
        );
      }

      if (secondNumber < 0 || secondNumber > 59) {
        throw new Error(
          "Giây phải từ 00 đến 59."
        );
      }

      return {
        from: `${date} ${time}`,
        to: `${date} ${time}`,
      };
    }

    // ========================================
    // KHÔNG ĐÚNG ĐỊNH DẠNG
    // ========================================

    throw new Error(
      "Thời gian không hợp lệ."
    );
  };

  // ==========================================
  // GỌI API
  // ==========================================

  const fetchData = async (pageNumber = 1) => {
    setLoading(true);
    setError("");

    try {
      const timeParams = buildTimeParams();

      const params = {
        page: pageNumber,
        limit: PAGE_SIZE,
        sort: "desc",
      };

      // ------------------------------
      // CẢM BIẾN
      // ------------------------------

      if (sensorType !== "") {
        params.sensor_id = sensorType;
      }

      // ------------------------------
      // THỜI GIAN
      // ------------------------------

      if (timeParams.from) {
        params.from = timeParams.from;
      }

      if (timeParams.to) {
        params.to = timeParams.to;
      }

      // ------------------------------
      // GIÁ TRỊ
      // ------------------------------

      if (valueInput.trim() !== "") {
        const number = parseNumber(
          valueInput.trim()
        );

        if (number === null) {
          throw new Error(
            "Giá trị cảm biến phải là số."
          );
        }

        // Tìm đúng giá trị
        params.min_value = number;
        params.max_value = number;
      }

      // ========================================
      // GỌI API.JS
      // ========================================

      const result = await getDataSensors(params);

      // result:
      // {
      //   success: true,
      //   data: {
      //      items: [],
      //      pagination: {}
      //   },
      //   message: "..."
      // }

      const data = result.data;

      setRows(data?.items || []);

      setTotal(
        data?.pagination?.total || 0
      );

      setPage(
        data?.pagination?.page || pageNumber
      );

      setTotalPages(
        data?.pagination?.total_pages || 0
      );
    } catch (err) {
      console.error(
        "Lỗi lấy dữ liệu cảm biến:",
        err
      );

      setRows([]);
      setTotal(0);
      setTotalPages(0);

      setError(
        err.message ||
          "Không thể lấy dữ liệu cảm biến."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // LOAD DỮ LIỆU KHI MỞ TRANG
  // ==========================================

  useEffect(() => {
    fetchData(1);
  }, []);

  // ==========================================
  // TÌM KIẾM
  // ==========================================

  const handleSearch = () => {
    fetchData(1);
  };

  // ==========================================
  // TRANG TRƯỚC
  // ==========================================

  const handlePrevious = () => {
    if (page <= 1 || loading) {
      return;
    }

    fetchData(page - 1);
  };

  // ==========================================
  // TRANG SAU
  // ==========================================

  const handleNext = () => {
    if (
      page >= totalPages ||
      totalPages === 0 ||
      loading
    ) {
      return;
    }

    fetchData(page + 1);
  };

  // ==========================================
  // GIAO DIỆN
  // ==========================================

  return (
    <div className="ds-page">
      <div className="ds-container">

        <h1 className="ds-title">
          Dữ liệu cảm biến
        </h1>

        <div className="ds-card">

          <div className="ds-filters">

            {/* TÊN CẢM BIẾN */}
            <div className="ds-control">
              <label>
                Tên cảm biến
              </label>

              <select
                value={sensorType}
                onChange={(e) =>
                  setSensorType(e.target.value)
                }
              >
                <option value="">
                  Tất cả
                </option>

                {SENSOR_TYPES.map((sensor) => (
                  <option
                    key={sensor.id}
                    value={sensor.id}
                  >
                    {sensor.name}
                  </option>
                ))}
              </select>
            </div>

            {/* GIÁ TRỊ */}
            <div className="ds-control">
              <label>
                Giá trị cảm biến
              </label>

              <input
                type="text"
                value={valueInput}
                onChange={(e) =>
                  setValueInput(e.target.value)
                }
                placeholder="Nhập giá trị"
              />
            </div>

            {/* THỜI GIAN */}
            <div className="ds-control">
              <label>
                Thời gian
              </label>

              <input
                type="text"
                value={timeInput}
                onChange={(e) =>
                  setTimeInput(e.target.value)
                }
                placeholder="YYYY-MM-DD HH:mm:ss"
              />
            </div>

            {/* TÌM KIẾM */}
            <button
              className="ds-btn-search"
              onClick={handleSearch}
              disabled={loading}
            >
              <SearchIcon />
              <span>Tìm kiếm</span>
            </button>

          </div>

          {/* LỖI */}
          {error && (
            <div className="ds-empty">
              {error}
            </div>
          )}

          {/* BẢNG */}
          <div className="ds-row">

            <table>
              <thead className="ds-thead">
                <tr>
                  <th>STT</th>
                  <th>Tên cảm biến</th>
                  <th>Giá trị</th>
                  <th>Thời gian</th>
                </tr>
              </thead>

              <tbody className="ds-tbody">

                {loading ? (
                  <tr>
                    <td
                      colSpan="4"
                      className="ds-empty"
                    >
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan="4"
                      className="ds-empty"
                    >
                      Không tìm thấy dữ liệu
                    </td>
                  </tr>
                ) : (
                  rows.map((row, index) => (
                    <tr key={row.id}>
                      <td>
  <span className="ds-stt-badge">
    {(page - 1) * PAGE_SIZE + index + 1}
  </span>
</td>

                      <td>
                        {row.sensor_name}
                      </td>

                      <td>
                        {row.value} {row.unit}
                      </td>

                      <td>
                        {formatRecordedAt(
                          row.recorded_at
                        )}
                      </td>
                    </tr>
                  ))
                )}

              </tbody>
            </table>

          </div>

          {/* PHÂN TRANG */}
<div className="ds-tfoot">

  {/* Hiển thị số lượng bản ghi hiển thị (VD: Hiển thị 1-5 / 20 bản ghi) */}
  <div className="ds-summary">
    {total === 0 ? (
      "Hiển thị 0 bản ghi"
    ) : (
      <>
        Hiển thị <strong>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}</strong> / {total} bản ghi
      </>
    )}
  </div>

  <div className="ds-pager">

    {/* Nút Trước */}
    <button
      className="ds-pg-btn"
      onClick={handlePrevious}
      disabled={page <= 1 || loading}
    >
      &lt; Trước
    </button>

    {/* Trang hiện tại / Tổng số trang */}
    <span className="ds-pg-current">
      Trang {totalPages === 0 ? 0 : page} / {totalPages}
    </span>

    {/* Nút Sau */}
    <button
      className="ds-pg-btn"
      onClick={handleNext}
      disabled={page >= totalPages || totalPages === 0 || loading}
    >
      Sau &gt;
    </button>

  </div>

</div>

        </div>
      </div>
    </div>
  );
}