import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../../styles/navbar.css';
import { useNotifications } from "../../context/NotificationContext";
import NotificationDropdown from "./NotificationDropdown";


export default function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);

const {
  notifications,
  unreadCount,
  markAsRead,
  markAllAsRead,
} = useNotifications();
  return (
    <header className="navbar">
      {/* Logo */}
      <div className="navbar-logo" onClick={() => navigate('/dashboard')}>
        <img src="/logo.png" alt="EcoSankalan Logo" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
        <span className="navbar-brand">EcoSankalan</span>
      </div>

      {/* Right side */}
      <div className="navbar-right">

  <div
    className="notification-wrapper"
    style={{ position: "relative" }}
  >

    <button
      className="navbar-icon-btn"
      aria-label="Notifications"
      onClick={() => setShowNotifications((prev) => !prev)}
    >
      <span className="material-symbols-outlined">
        notifications
      </span>

      {unreadCount > 0 && (
        <span className="notification-badge">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>

    {showNotifications && (
      <NotificationDropdown
        notifications={notifications}
        markAsRead={markAsRead}
        markAllAsRead={markAllAsRead}
        onClose={() => setShowNotifications(false)}
      />
    )}

  </div>

</div>
    </header>
  );
}
