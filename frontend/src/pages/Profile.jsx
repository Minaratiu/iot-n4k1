import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getProfile, updateProfile, logout } from "../services/api";
import "./Profile.css";

// Các field cho phép chỉnh sửa (không gồm id/username)
const EDITABLE_FIELDS = [
  { key: "fullName", label: "Họ và tên" },
  { key: "studentId", label: "MSV" },
  { key: "className", label: "Lớp" },
];

const LINK_FIELDS = [
  { key: "email", label: "Mail" },
  { key: "figmaUrl", label: "Link Figma" },
  { key: "githubUrl", label: "Link Github" },
  { key: "postmanUrl", label: "Link Postman" },
  { key: "reportUrl", label: "Link Báo cáo" },
];

export default function Profile() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState(null);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function fetchProfile() {
      setLoading(true);
      setError(null);
      try {
        const data = await getProfile();
        const user = data.data || data;
        if (!ignore) {
          setProfile(user);
          setFormData(user);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || "Không thể tải thông tin cá nhân");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    fetchProfile();
    return () => {
      ignore = true;
    };
  }, []);

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleStartEdit = () => {
    setFormData(profile);
    setSaveError(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setFormData(profile);
    setSaveError(null);
    setIsEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      // API-15: Cập nhật thông tin cá nhân
      const res = await updateProfile(formData);
      const updated = res.data || res || formData;
      setProfile(updated);
      setFormData(updated);
      setIsEditing(false);
    } catch (err) {
      setSaveError(err.message || "Lưu thông tin thất bại, vui lòng thử lại");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } catch (err) {
      console.error("Lỗi khi gọi API đăng xuất:", err);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setLoggingOut(false);
      navigate("/login", { replace: true });
    }
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-card">
          <p className="profile-status">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-page">
        <div className="profile-card">
          <p className="profile-status profile-error">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar">
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="Avatar" />
            ) : (
              <svg viewBox="0 0 24 24" className="profile-avatar-icon">
                <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M4 20c0-4 3.6-6 8-6s8 2 8 6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </div>

          <div className="profile-info">
            {EDITABLE_FIELDS.map(({ key, label }) => (
              <p key={key}>
                <span className="profile-label">{label}:</span>{" "}
                {isEditing ? (
                  <input
                    className="profile-input profile-input-inline"
                    type="text"
                    value={formData?.[key] || ""}
                    onChange={(e) => handleChange(key, e.target.value)}
                  />
                ) : (
                  profile?.[key]
                )}
              </p>
            ))}
          </div>
        </div>

        {LINK_FIELDS.map(({ key, label }) => (
          <div className="profile-field" key={key}>
            <p className="profile-field-label">{label}:</p>
            {isEditing ? (
              <input
                className="profile-input"
                type="text"
                value={formData?.[key] || ""}
                onChange={(e) => handleChange(key, e.target.value)}
              />
            ) : (
              <p className="profile-field-value">{profile?.[key]}</p>
            )}
          </div>
        ))}

        {saveError && <p className="profile-status profile-error">{saveError}</p>}

        {isEditing ? (
          <div className="profile-actions">
            <button className="btn-cancel" onClick={handleCancelEdit} disabled={saving}>
              Hủy
            </button>
            <button className="btn-save" onClick={handleSave} disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        ) : (
          <button className="btn-edit" onClick={handleStartEdit}>
            Chỉnh sửa
          </button>
        )}
      </div>

      <div className="logout-wrapper">
        <button className="btn-logout" onClick={handleLogout} disabled={loggingOut}>
          <svg viewBox="0 0 24 24" className="logout-icon">
            <path
              d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {loggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
        </button>
      </div>
    </div>
  );
}