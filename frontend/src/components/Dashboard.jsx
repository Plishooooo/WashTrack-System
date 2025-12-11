import { useState } from 'react';
import '../styles/Dashboard.css';
import Sidebar from './Sidebar';
import Orders from './Orders';
import Tracking from './Tracking';
import Profile from './Profile';

function Dashboard({ userData, onLogout, onRefreshUserData }) {
  const [activeTab, setActiveTab] = useState('orders');

  const getUserName = () => {
    if (!userData) return 'Username Not Found';

    return userData.fld_username;
  };

  //USES THE LOGOUT FUNCTION PASSED AS PROP FROM App.JSX
  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      console.log('Logged out');
      window.location.href = '/';
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h2 className="logo">WashTrack</h2>
          <p className="welcome-text">Welcome, {getUserName()}</p>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <div className="dashboard-container">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="dashboard-content">
          {activeTab === 'orders' && <Orders userData={userData} />}
          {activeTab === 'tracking' && <Tracking userData={userData} />}
          {activeTab === 'profile' && (
            <Profile
              userData={userData}
              onRefreshUserData={onRefreshUserData}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
