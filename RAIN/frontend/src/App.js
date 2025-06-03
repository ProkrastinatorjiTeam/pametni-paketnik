import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';
import Login from './components/Login';
import Register from './components/Register';
import AddProductPage from './components/AddProductPage';
import ProductView from './components/ProductView';

const BACKEND_URL = 'http://localhost:3000';

function HomePage({ currentUser }) {
  const navigate = useNavigate();
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchModels = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await axios.get('/model3D/list');
        setModels(response.data);
      } catch (err) {
        console.error('Error fetching models:', err);
        setError('Failed to load models. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchModels();
  }, []);

  const handleAddClick = () => {
    navigate('/admin/add-product');
  };

  const handleProductClick = (modelId) => {
    navigate(`/product/${modelId}`);
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
      <div className="models-list-container">
        {loading && <p>Loading models...</p>}
        {error && <p className="error-message">{error}</p>}
        {!loading && !error && models.length === 0 && <p>No models available yet.</p>}
        {!loading && !error && models.map((model) => (
          <div key={model._id} className="model-item-box" onClick={() => handleProductClick(model._id)}>
            {model.images && model.images.length > 0 && (
              <img
                src={`${BACKEND_URL}${model.images[0]}`}
                alt={model.name}
                className="model-image"
              />
            )}
            <div className="model-info">
              <h3>{model.name}</h3>
              {model.estimatedPrintTime && (
                <p>Print Time: {model.estimatedPrintTime} minutes</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

// Navigation component (remains the same)
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
          <Route
            path="/admin/add-product"
            element={
              currentUser && currentUser.role === 'admin' ? (
                <AddProductPage />
              ) : (
                <Navigate to="/login" replace state={{ message: 'Please log in as an admin to add products.' }} />
              )
            }
          />
          <Route path="/product/:id" element={<ProductView currentUser={currentUser} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;