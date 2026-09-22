import { NavLink } from "react-router-dom";
import {
  Home as HomeIcon,
  BarChart2,
  History,
  User,
} from "lucide-react";
import "./Navbar.css";

function Navbar() {
  return (
    <header className="dashboard-header">
      <div className="dashboard-nav">
        <nav className="nav-menu">

          <NavLink
            to="/home"
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""}`
            }
          >
            <HomeIcon size={16} />
            <span>Home</span>
          </NavLink>

          <NavLink
            to="/data-sensor"
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""}`
            }
          >
            <BarChart2 size={16} />
            <span>Data Sensor</span>
          </NavLink>

          <NavLink
            to="/action-history"
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""}`
            }
          >
            <History size={16} />
            <span>Action History</span>
          </NavLink>

          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""}`
            }
          >
            <User size={16} />
            <span>Profile</span>
          </NavLink>

        </nav>
      </div>
    </header>
  );
}

export default Navbar;
