import { useEffect, useRef, useState } from "react";

import {
  Home as HomeIcon,
  BarChart2,
  History,
  User,
  Thermometer,
  Droplets,
  Sun,
  Lightbulb,
  Power,
} from "lucide-react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

import {
  getDataSensors,
  getDevices,
  getChartData,
  controlDevice,
} from "../services/api";

import "./Home.css";

function Home() {
  // =========================
  // STATE
  // =========================

  const [sensors, setSensors] = useState([]);
  const [devices, setDevices] = useState([]);
  const [charts, setCharts] = useState([]);

 

  const [controllingId, setControllingId] = useState(null);

// =========================
// LOAD DASHBOARD
// =========================
const chartLoadingRef = useRef(false);
// =========================
// LOAD SENSOR
// =========================

const SENSOR_IDS = [1, 2, 3];

const withTimeout = (promise, ms = 5000) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("Quá thời gian chờ")),
        ms
      )
    ),
  ]);

const loadSensors = async () => {
  try {
    const results = await withTimeout(
      Promise.all(
        SENSOR_IDS.map((id) =>
          getDataSensors({
            page: 1,
            limit: 1,
            sort: "desc",
            sensor_id: id,
          })
        )
      )
    );

    console.log("SENSOR DATA:", results);

    const list = results
      .map((result, index) => {
        const item = result.data?.items?.[0];

        if (!item) {
          return null;
        }

        return {
          ...item,
          sensor_id: SENSOR_IDS[index],
        };
      })
      .filter(Boolean);

    setSensors(list);

  } catch (error) {
    console.error("Lỗi tải sensor:", error);
  }
};
// =========================
// LOAD DEVICES
// =========================

const loadDevices = async () => {
  try {
    const response = await getDevices();

    setDevices(response.data || []);

  } catch (error) {
    console.error("Lỗi tải thiết bị:", error);
  }
};
// =========================
// LOAD CHART
// =========================

const loadCharts = async () => {
  // Không cho chart request chạy chồng
  if (chartLoadingRef.current) {
    return;
  }

  chartLoadingRef.current = true;

  try {
    const chartResponse = await getChartData(50);

    setCharts(chartResponse.data || []);

  } catch (error) {
    console.error("Lỗi cập nhật biểu đồ:", error);

  } finally {
    chartLoadingRef.current = false;
  }
};

// =========================
// INITIAL LOAD + CARD 2s
// =========================
// =========================
// SENSOR 2 GIÂY
// =========================
useEffect(() => {
  let stopped = false;
  let timer = null;

  const refreshSensors = async () => {
    if (stopped) {
      return;
    }

    try {
      await loadSensors();
    } catch (error) {
      console.error("Lỗi refresh sensor:", error);
    }

    if (!stopped) {
      timer = setTimeout(() => {
        refreshSensors();
      }, 2000);
    }
  };

  // Lấy dữ liệu ngay khi mở Home
  refreshSensors();

  return () => {
    stopped = true;

    if (timer) {
      clearTimeout(timer);
    }
  };
}, []);

// =========================
// DEVICE
// =========================

useEffect(() => {
  loadDevices();
}, []);
// =========================
// CHART 1 PHÚT
// =========================

useEffect(() => {
  let stopped = false;
  let timer = null;

  const refreshCharts = async () => {
    if (stopped) {
      return;
    }

    await loadCharts();

    if (!stopped) {
      timer = setTimeout(() => {
        refreshCharts();
      }, 60000); // 60 giây = 1 phút
    }
  };

  // Tải biểu đồ lần đầu
  refreshCharts();

  return () => {
    stopped = true;

    if (timer) {
      clearTimeout(timer);
    }
  };
}, []);
  // =========================
  // GET SENSOR
  // =========================

  const getSensor = (id) => {
    return sensors.find(
      (sensor) => Number(sensor.sensor_id) === id
    );
  };

  const temperature = getSensor(1);
  const humidity = getSensor(2);
  const light = getSensor(3);

  // =========================
  // GET CHART DATA
  // =========================

  const getChart = (id) => {
    return charts.find(
      (chart) => Number(chart.sensor_id) === id
    );
  };

  const tempChart = getChart(1);
  const humidityChart = getChart(2);
  const lightChart = getChart(3);

  // Chuyển points từ API sang format cho recharts + rút gọn nếu quá nhiều điểm
  const formatPoints = (points, maxPoints = 40) => {
    if (!points || points.length === 0) return [];

    const step = Math.max(1, Math.ceil(points.length / maxPoints));

    return points
      .filter((_, index) => index % step === 0)
      .map((point) => {
        const date = new Date(point.recorded_at.replace(" ", "T"));

        const time = isNaN(date.getTime())
          ? point.recorded_at
          : date.toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            });

        return {
          time,
          value: point.value,
        };
      });
  };

  const getAverage = (points) => {
    if (!points || points.length === 0) return 0;

    const sum = points.reduce((acc, p) => acc + Number(p.value), 0);
    return sum / points.length;
  };

  // =========================
  // CHECK DEVICE STATUS
  // =========================
const isDeviceOn = (device) => {
  const status =
    device.current_status ??
    device.status ??
    device.state ??
    device.is_on ??
    false;

  if (typeof status === "string") {
    const normalizedStatus = status.toUpperCase();

    return (
      normalizedStatus === "ON" ||
      normalizedStatus === "ACTIVE"
    );
  }

  return Boolean(status);
};

  // =========================
  // DEVICE ICON
  // =========================

  const renderDeviceIcon = () => {
    return <Lightbulb size={21} />;
  };

  // =========================
  // CONTROL DEVICE
  // =========================
const handleDeviceControl = async (device) => {
  const deviceId =
    device.device_id ??
    device.id;

  if (!deviceId) {
    console.error(
      "Không tìm thấy device ID:",
      device
    );
    return;
  }

  // Kiểm tra trạng thái hiện tại
  const currentStatus = isDeviceOn(device);

  // Nếu đang ON → gửi OFF
  // Nếu đang OFF → gửi ON
  const action = currentStatus
    ? "off"
    : "on";

  try {
    setControllingId(deviceId);

    // GỬI LỆNH ĐẾN BACKEND
   

    await controlDevice(
      deviceId,
      action
    );

    // CẬP NHẬT GIAO DIỆN NGAY
    
    setDevices((prevDevices) =>
      prevDevices.map((item) => {
        const itemId =
          item.device_id ??
          item.id;

        if (
          Number(itemId) !==
          Number(deviceId)
        ) {
          return item;
        }

        return {
          ...item,
          current_status: action,
        };
      })
    );

    // ĐỢI BACKEND CẬP NHẬT
   

    await new Promise((resolve) =>
      setTimeout(resolve, 1000)
    );

    // LẤY LẠI TRẠNG THÁI THẬT
  

    try {
      const response =
        await getDevices();

      setDevices(
        response.data || []
      );

    } catch (error) {
      console.error(
        "Lỗi cập nhật thiết bị:",
        error
      );
    }

  } catch (error) {

    console.error(
      "Lỗi điều khiển thiết bị:",
      error
    );

    alert(error.message);

  } finally {

    setControllingId(null);

  }
};

  // =========================
  // ACTIVE DEVICE COUNT
  // =========================

  const activeDevicesCount =
    devices.filter(isDeviceOn).length;



  // =========================
  // UI
  // =========================

  return (
    <div className="dashboard-page">

      {/* =========================
          MAIN
      ========================= */}

      <main className="dashboard-container">

        {/* TITLE */}

        <div className="dashboard-title">

          <p>
            THÔNG TIN CÁC CẢM BIẾN
          </p>

        </div>


        {/* =========================
            SENSOR CARDS
        ========================= */}

        <section className="sensor-cards">


          {/* TEMPERATURE */}

          <div className="sensor-card">

            <div className="sensor-card-top">

              <div className="sensor-icon temperature">

                <Thermometer size={22} />

              </div>

              <span className="sensor-label">
                NHIỆT ĐỘ
              </span>

            </div>


            <div className="sensor-value">

              {temperature?.value ?? "--"}

              <span>
                {temperature?.unit ?? "°C"}
              </span>

            </div>

          </div>


          {/* LIGHT */}

          <div className="sensor-card">

            <div className="sensor-card-top">

              <div className="sensor-icon light">

                <Sun size={22} />

              </div>

              <span className="sensor-label">
                ÁNH SÁNG
              </span>

            </div>


            <div className="sensor-value">

              {light?.value ?? "--"}

              <span>
                {light?.unit ?? "lux"}
              </span>

            </div>

          </div>


          {/* HUMIDITY */}

          <div className="sensor-card">

            <div className="sensor-card-top">

              <div className="sensor-icon humidity">

                <Droplets size={22} />

              </div>

              <span className="sensor-label">
                ĐỘ ẨM
              </span>

            </div>


            <div className="sensor-value">

              {humidity?.value ?? "--"}

              <span>
                {humidity?.unit ?? "%"}
              </span>

            </div>

          </div>

        </section>


        {/* =========================
            CHART + DEVICE
        ========================= */}

        <section className="dashboard-grid">


          {/* =========================
              CHARTS
          ========================= */}

          <div className="chart-section">


            {/* TEMPERATURE */}

            <div className="chart-card">

              <div className="chart-header">

                <div className="chart-title">

                  <Thermometer size={18} />

                  <span>
                    BIỂU ĐỒ NHIỆT ĐỘ
                  </span>

                </div>

                <span className="chart-unit">
                  {tempChart?.unit ?? "°C"}
                </span>

              </div>


              <div className="chart-content">

                {tempChart?.points?.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={formatPoints(tempChart.points)}
                      margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid vertical={false} stroke="#eef1f6" />
                      <XAxis
                        dataKey="time"
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        axisLine={false}
                        tickLine={false}
                        minTickGap={40}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        axisLine={false}
                        tickLine={false}
                        width={40}
                        domain={["auto", "auto"]}
                      />
                      <Line
                        type="monotone"
                        dataKey={() => getAverage(tempChart.points)}
                        stroke="#cbd5e1"
                        strokeDasharray="4 4"
                        dot={false}
                        strokeWidth={1.5}
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#f0883e"
                        strokeWidth={2.5}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="chart-empty">
                    Chưa có dữ liệu
                  </div>
                )}

              </div>

            </div>


            {/* HUMIDITY */}

            <div className="chart-card">

              <div className="chart-header">

                <div className="chart-title">

                  <Droplets size={18} />

                  <span>
                    BIỂU ĐỒ ĐỘ ẨM
                  </span>

                </div>

                <span className="chart-unit">
                  {humidityChart?.unit ?? "%"}
                </span>

              </div>


              <div className="chart-content">

                {humidityChart?.points?.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={formatPoints(humidityChart.points)}
                      margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid vertical={false} stroke="#eef1f6" />
                      <XAxis
                        dataKey="time"
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        axisLine={false}
                        tickLine={false}
                        minTickGap={40}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        axisLine={false}
                        tickLine={false}
                        width={40}
                        domain={["auto", "auto"]}
                      />
                      <Line
                        type="monotone"
                        dataKey={() => getAverage(humidityChart.points)}
                        stroke="#cbd5e1"
                        strokeDasharray="4 4"
                        dot={false}
                        strokeWidth={1.5}
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#2dd4d4"
                        strokeWidth={2.5}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="chart-empty">
                    Chưa có dữ liệu
                  </div>
                )}

              </div>

            </div>


            {/* LIGHT */}

            <div className="chart-card">

              <div className="chart-header">

                <div className="chart-title">

                  <Sun size={18} />

                  <span>
                    BIỂU ĐỒ ĐỘ SÁNG
                  </span>

                </div>

                <span className="chart-unit">
                  {lightChart?.unit ?? "lux"}
                </span>

              </div>


              <div className="chart-content">

                {lightChart?.points?.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={formatPoints(lightChart.points)}
                      margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid vertical={false} stroke="#eef1f6" />
                      <XAxis
                        dataKey="time"
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        axisLine={false}
                        tickLine={false}
                        minTickGap={40}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        axisLine={false}
                        tickLine={false}
                        width={40}
                        domain={["auto", "auto"]}
                      />
                      <Line
                        type="monotone"
                        dataKey={() => getAverage(lightChart.points)}
                        stroke="#cbd5e1"
                        strokeDasharray="4 4"
                        dot={false}
                        strokeWidth={1.5}
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#7c6ff0"
                        strokeWidth={2.5}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="chart-empty">
                    Chưa có dữ liệu
                  </div>
                )}

              </div>

            </div>

          </div>


          {/* =========================
              DEVICE CONTROL
          ========================= */}

          <div className="device-section">

            <div className="device-card">


              {/* DEVICE HEADER */}

              <div className="device-card-header">

                <h2>
                  ĐIỀU KHIỂN THIẾT BỊ
                </h2>

              </div>


              {/* DEVICES */}

              {devices.length === 0 ? (

                <div className="no-device">

                  <Lightbulb size={28} />

                  <p>
                    Không có thiết bị
                  </p>

                </div>

              ) : (

                devices.map(
                  (device, index) => {

                    const deviceId =
                      device.device_id ??
                      device.id ??
                      index + 1;

                    const deviceName =
                      device.device_name ??
                      device.name ??
                      `LED ${index + 1}`;

                    const isOn =
                      isDeviceOn(device);


                    return (
                      <div
                        className="device-item"
                        key={deviceId}
                      >

                        {/* DEVICE INFO */}

                        <div className="device-info">

                          <div
                            className={`device-icon ${
                              isOn ? "on" : ""
                            }`}
                          >

                            {renderDeviceIcon()}

                          </div>


                          <div>

                            <h3>
                              {deviceName}
                            </h3>

                            <span
                              className={`device-status ${
                                isOn ? "on" : ""
                              }`}
                            >

                              {isOn
                                ? "Đang hoạt động"
                                : "Tắt"}

                            </span>

                          </div>

                        </div>


                        {/* TOGGLE */}

                        <button
                          className={`toggle-button ${
                            isOn ? "on" : ""
                          }`}
                          onClick={() =>
                            handleDeviceControl(
                              device
                            )
                          }
                          disabled={
                            controllingId ===
                            deviceId
                          }
                        >

                          <span className="toggle-circle">

                            {controllingId ===
                              deviceId && (
                              <Power
                                size={12}
                                color="#999"
                              />
                            )}

                          </span>

                        </button>

                      </div>
                    );
                  }
                )

              )}


              {/* =========================
                  DEVICE SUMMARY
              ========================= */}

              {devices.length > 0 && (

                <div className="device-summary">

                  <p className="summary-text">

                    <strong>
                      {activeDevicesCount}
                    </strong>

                    {" / "}

                    {devices.length}

                    {" thiết bị đang hoạt động"}

                  </p>


                  <div className="progress-bar-group">

                    {devices.map(
                      (device, index) => (

                        <div
                          key={index}
                          className={`progress-segment ${
                            isDeviceOn(device)
                              ? "active"
                              : ""
                          }`}
                        />

                      )
                    )}

                  </div>

                </div>

              )}

            </div>

          </div>

        </section>

      </main>

    </div>
  );
}

export default Home;