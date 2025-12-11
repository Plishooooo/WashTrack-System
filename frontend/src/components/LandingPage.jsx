import React from 'react';
import '../styles/LandingPage.css';
import logo from '../assets/WASHTRACKLOGO.png';
import laundryImg from '../assets/LANDPAGEPIC.jpg';

function LandingPage({ onLogin }) {
  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="logo">
          <div className="logo-icon">
            <img src={logo} alt="WashTrack Logo" className="logo-img" />
          </div>
          <span className="logo-text">WASHTRACK</span>
        </div>

        <div className="nav-buttons">
          {/* Trigger your App.jsx function */}
          <button className="btn-get-started" onClick={onLogin}>
            Get Started
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="landing-main">
        <div className="content-grid">
          <div className="hero-text">
            <h1>Join the Future of Laundry</h1>
            <p>
              Service Organized, Automated,
              <br />
              and Customer Ready.
            </p>
          </div>

          <div className="image-section">
            <img src={laundryImg} alt="Laundry Machines" />
          </div>
        </div>
      </main>

      <div className="search-icon">
        <div className="search-icon-inner"></div>
      </div>
    </div>
  );
}

export default LandingPage;
