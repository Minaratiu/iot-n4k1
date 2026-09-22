import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Home from "./pages/Home";
import DataSensor from "./pages/DataSensor";
import DeviceHistory from "./pages/DeviceHistory";
import Profile from "./pages/Profile";

import Navbar from "./components/Navbar";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ==========================================
            TRANG ĐĂNG NHẬP
            Không có Navbar
        ========================================== */}
        <Route
          path="/login"
          element={<Login />}
        />

        {/* ==========================================
            TRANG HOME
            Có Navbar
        ========================================== */}
        <Route
          path="/home"
          element={
            <>
              <Navbar />
              <Home />
            </>
          }
        />

        {/* ==========================================
            TRANG DATA SENSOR
            Có Navbar
        ========================================== */}
        <Route
          path="/data-sensor"
          element={
            <>
              <Navbar />
              <DataSensor />
            </>
          }
        />

        {/* ==========================================
            TRANG ACTION HISTORY
            File thực tế: DeviceHistory.jsx
            URL: /action-history
        ========================================== */}
        <Route
          path="/action-history"
          element={
            <>
              <Navbar />
              <DeviceHistory />
            </>
          }
        />

        {/* ==========================================
            TRANG PROFILE
            File thực tế: Profile.jsx
            URL: /profile
        ========================================== */}
        <Route
          path="/profile"
          element={
            <>
              <Navbar />
              <Profile />
            </>
          }
        />

        {/* ==========================================
            URL KHÔNG TỒN TẠI
            → chuyển về Login
        ========================================== */}
        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;