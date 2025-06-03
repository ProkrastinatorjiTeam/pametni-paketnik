import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';
import Login from './components/Login';
import Register from './components/Register';

function HomePage() {
  return (
    <main className="main-content">
      <h1>Welcome to Paketnik!</h1>
      <p>Your smart package solution.</p>
    </main>
  );
}

// Navigation component to handle useNavigate for logout
function Navigation({ currentUser, onLogout }) {
  const navigate = useNavigate();

  const handleLogoutClick = async () => {
    try {
      await axios.post('/user/logout'); // Call backend logout
      onLogout(); // Update state in App.js
      navigate('/login'); // Redirect to login page
    } catch (error) {
      console.error('Logout failed:', error);
      // Handle logout error (e.g., show a message)
    }
  };

  return (
    <nav className="top-bar">
      <div className="logo">
        <Link to="/">Paketnik</Link>
      </div>
      <div className="nav-links">
        {currentUser ? (
          <>
            <span className="username-display">Welcome, {currentUser.username}</span>
            <button onClick={handleLogoutClick} className="logout-button">Logout</button>
          </>
        ) : (
          <>
            <Link to="/register"><span>Register</span></Link>
            <Link to="/login"><span>Login</span></Link>
          </>
        )}
      </div>
    </nav>
  );
}

function App() {
  const [currentUser, setCurrentUser] = useState(null);

  // Check for existing session on component mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await axios.get('/user/show'); // Backend endpoint to get current user
        if (response.data && response.data.user) {
          setCurrentUser(response.data.user);
        }
      } catch (error) {
        console.log('No active session or error fetching user:', error.response?.data?.message || error.message);
        setCurrentUser(null);
      }
    };
    checkSession();
  }, []);

  const handleLoginSuccess = (userData) => {
    setCurrentUser(userData);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  return (
    <Router>
      <div className="App">
        <Navigation currentUser={currentUser} onLogout={handleLogout} />
        <Routes>
          <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<HomePage />} />
          {/* Add other protected/public routes here */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;