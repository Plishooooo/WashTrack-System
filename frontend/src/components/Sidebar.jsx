import '../styles/Sidebar.css';
import orderLogo from '../assets/ORDER.png';
import trackingLogo from '../assets/TRACKING.png';
import profileLogo from '../assets/PROFILE.png';

function Sidebar({ activeTab, setActiveTab }) {
  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <button
          className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <span className="nav-icon">
            <img src={orderLogo} />
          </span>
          <span className="nav-label">Orders</span>
        </button>
        <button
          className={`nav-item ${activeTab === 'tracking' ? 'active' : ''}`}
          onClick={() => setActiveTab('tracking')}
        >
          <span className="nav-icon">
            <img src={trackingLogo} />
          </span>
          <span className="nav-label">Tracking</span>
        </button>
        <button
          className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <span className="nav-icon">
            <img src={profileLogo} />
          </span>
          <span className="nav-label">Profile</span>
        </button>
      </nav>
    </aside>
  );
}

export default Sidebar;
