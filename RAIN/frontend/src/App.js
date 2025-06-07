import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';
import Login from './components/Login';
import Register from './components/Register';
import AddProductPage from './components/AddProductPage';
import ProductView from './components/ProductView';
import AdminPanel from './components/AdminPanel';
import UserProfile from './components/UserProfile';

axios.defaults.withCredentials = true;

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
        // Ensure your axios calls are prefixed with BACKEND_URL if not using a proxy
        const response = await axios.get(`${BACKEND_URL}/model3D/list`);
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
    navigate('/admin/add-product'); // Path for adding product
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
                onError={(e) => { e.target.onerror = null; e.target.src='placeholder.jpg'; }} // Fallback for broken images
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

function Navigation({ currentUser, onLogout }) {
  const navigate = useNavigate();

  const handleLogoutClick = async () => {
    try {
      await axios.post(`${BACKEND_URL}/user/logout`);
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
            {currentUser.role === 'admin' && (
              <>
                <Link to="/admin-panel"><span>Admin Panel</span></Link>
              </>
            )}
            {/* Updated username display to be a Link */}
            <Link to="/profile" className="username-display-link">
              <span className="username-display">Welcome, {currentUser.username}</span>
            </Link>
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
  const [loadingSession, setLoadingSession] = useState(true);


  useEffect(() => {
    const checkSession = async () => {
      setLoadingSession(true);
      try {
        // Ensure your axios calls are prefixed with BACKEND_URL if not using a proxy
        const response = await axios.get(`${BACKEND_URL}/user/show`); // Assuming /user/show gives current user
        if (response.data && response.data.user) {
          setCurrentUser(response.data.user);
        } else {
          setCurrentUser(null);
        }
      } catch (error) {
        console.log('No active session or error fetching user:', error.response?.data?.message || error.message);
        setCurrentUser(null);
      } finally {
        setLoadingSession(false);
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

  if (loadingSession) {
    return <div className="app-loading">Loading application...</div>;
  }

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
          <Route
            path="/admin-panel"
            element={
              currentUser && currentUser.role === 'admin' ? (
                <AdminPanel currentUser={currentUser} />
              ) : (
                <Navigate to="/" replace state={{ message: 'Access Denied: Admins only.' }} />
              )
            }
          />
          <Route 
            path="/profile"
            element={
              currentUser ? (
                <UserProfile currentUser={currentUser} />
              ) : (
                <Navigate to="/login" replace state={{ message: 'Please log in to view your profile.' }} />
              )
            }
          />
          <Route path="/product/:id" element={
            currentUser ? <ProductView currentUser={currentUser} /> : <Navigate to="/login" replace state={{ message: 'Please log in to view product details.'}} />
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;