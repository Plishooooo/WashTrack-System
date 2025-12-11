import { useState } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import { Toast } from './components/Toast';
import LandingPage from './components/LandingPage';

function App() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [userData, setUserData] = useState(null);

  const handleSwitchToRegister = () => {
    setCurrentPage('register');
  };

  const handleSwitchToLogin = () => {
    setCurrentPage('login');
  };

  const handleLogin = () => {
    setCurrentPage('login');
  };

  const handleLoginSuccess = (isAdmin = false, user = null) => {
    setUserData(user);

    if (isAdmin) {
      setCurrentPage('admin');
    } else {
      setCurrentPage('dashboard');
    }
  };

  const handleLogout = () => {
    setCurrentPage('landing');
    setUserData(null);
  };

  const refreshUserData = (newUserData) => {
    setUserData(newUserData);
  };

  return (
    <>
      <Toast />
      {currentPage === 'landing' ? (
        <LandingPage onLogin={handleLogin} />
      ) : currentPage === 'login' ? (
        <Login
          onSwitchToRegister={handleSwitchToRegister}
          onLoginSuccess={handleLoginSuccess}
        />
      ) : currentPage === 'register' ? (
        <Register onSwitchToLogin={handleSwitchToLogin} />
      ) : currentPage === 'admin' ? (
        <AdminDashboard
          userData={userData}
          onLogout={handleLogout}
          onRefreshUserData={refreshUserData}
        />
      ) : (
        <Dashboard
          userData={userData}
          onLogout={handleLogout}
          onRefreshUserData={refreshUserData}
        />
      )}
    </>
  );
}

export default App;
