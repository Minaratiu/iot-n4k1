import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Lock } from "lucide-react";
import { login } from "../services/api";
import "./Login.css";

function Login() {
  const navigate = useNavigate();  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");

    if (!username || !password) {
      setError("Vui lòng nhập đầy đủ username và password");
      return;
    }

    try {
      setLoading(true);

      const data = await login(username, password);

      console.log("Đăng nhập thành công:", data);

      localStorage.setItem("token", data.data.token);
      localStorage.setItem("user", JSON.stringify(data.data));

      navigate("/home");
    } catch (error) {
      console.error("Login error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">

        <div className="login-header">
          <h1>IoT Monitoring</h1>
          <p>Đăng nhập vào hệ thống</p>
        </div>

        <form onSubmit={handleLogin}>

          <div className="input-group">
            <label>Username</label>

            <div className="input-wrapper">
              <User size={20} />

              <input
                type="text"
                placeholder="Nhập username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div className="input-group">
            <label>Password</label>

            <div className="input-wrapper">
              <Lock size={20} />

              <input
                type="password"
                placeholder="Nhập password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <p className="login-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>

        </form>

      </div>
    </div>
  );
}

export default Login;