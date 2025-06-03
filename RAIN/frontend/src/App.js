import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom'; // Added Navigate
import axios from 'axios';
import './App.css';
import Login from './components/Login';
import Register from './components/Register';
import AddProductPage from './components/AddProductPage'; // Import the new component

function HomePage({ currentUser }) {
  const navigate = useNavigate(); // Add useNavigate hook

  const handleAddClick = () => {
    navigate('/admin/add-product'); // Navigate to the new page
  };

  return (
    <main className="main-content">
      {currentUser && currentUser.role === 'admin' && (
        <div className="admin-actions-container">
          <button onClick={handleAddClick} className="add-product-button">
            + ADD
          </button>
        </div>
      )}
      <h1>
        Welcome to Paketnik!
      </h1>
      <p>Your smart package solution.</p>
      {/* Products will be listed here later */}
    </main>
  );
}

// Navigation component to handle useNavigate for logout
function Navigation({ currentUser, onLogout }) {
  const navigate = useNavigate();

  const handleLogoutClick = async () => {
    try {
      await axios.post('/user/logout');
      onLogout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <nav className="top-bar">
      <div className="logo">
        <Link to="/">
          Paketnik
          {currentUser && currentUser.role === 'admin' && ' (Admin)'}
        </Link>
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

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await axios.get('/user/show');
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
          <Route path="/" element={<HomePage currentUser={currentUser} />} />
          {/* Protected Admin Route for Adding Products */}
          <Route
            path="/admin/add-product"
            element={
              currentUser && currentUser.role === 'admin' ? (
                <AddProductPage />
              ) : (
                <Navigate to="/login" replace /> // Or to home page: <Navigate to="/" replace />
              )
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;