import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import axios from 'axios';
import './App.css'; // This will be our updated CSS file
import Login from './components/Login';
import Register from './components/Register';
import AddProductPage from './components/AddProductPage';
import ProductView from './components/ProductView';
import AdminPanel from './components/AdminPanel';
import UserProfile from './components/UserProfile';

// For icons, you can install react-icons: npm install react-icons
// import { FaPlus, FaCube, FaUser, FaSignInAlt, FaSignOutAlt, FaTasks } from 'react-icons/fa';

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

  const handleProductClick = (modelId) => {
    navigate(`/product/${modelId}`);
  };

  return (
      <main className="main-content">
        <section className="hero-section">
          <h1 className="hero-title">The On-Demand Print Hub</h1>
          <p className="hero-subtitle">
            From digital design to physical reality. Browse our library and start your 3D print with a single click.
          </p>
          {currentUser && currentUser.role === 'admin' && (
              <button onClick={() => navigate('/admin/add-product')} className="add-product-cta">
                {/* <FaPlus />  Icon Example */}
                Add New Model
              </button>
          )}
        </section>

        <div className="models-grid">
          {loading && <p className="status-message">Loading models...</p>}
          {error && <p className="status-message error">{error}</p>}
          {!loading && !error && models.map((model) => (
              <div key={model._id} className="model-card" onClick={() => handleProductClick(model._id)}>
                <img
                    src={model.images?.[0] ? `${BACKEND_URL}${model.images[0]}` : 'placeholder.jpg'}
                    alt={model.name}
                    className="model-card-image"
                    loading="lazy"
                />
                <div className="model-card-overlay">
                  <h3 className="model-card-title">{model.name}</h3>
                  <div className="model-card-details">
                    {model.estimatedPrintTime && <span>{model.estimatedPrintTime} min print</span>}
                    {model.price != null && <span>€{model.price.toFixed(2)}</span>}
                  </div>
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
      <header className="top-bar">
        <div className="logo">
          <Link to="/">
            {/* <FaCube /> Icon Example */}
            PrintHub
          </Link>
        </div>
        <nav className="nav-links">
          {currentUser ? (
              <>
                {currentUser.role === 'admin' && (
                    <Link to="/admin-panel"><span>Admin Panel</span></Link>
                )}
                <Link to="/profile" className="nav-link-user">
                  {/* <FaUser /> Icon Example */}
                  <span>{currentUser.username}</span>
                </Link>
                <button onClick={handleLogoutClick} className="logout-button">
                  {/* <FaSignOutAlt /> Icon Example */}
                  Logout
                </button>
              </>
          ) : (
              <>
                <Link to="/register"><span>Register</span></Link>
                <Link to="/login"><span>Login</span></Link>
              </>
          )}
        </nav>
      </header>
  );
}

// The main App component remains largely the same
function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      setLoadingSession(true);
      try {
        const response = await axios.get(`${BACKEND_URL}/user/show`);
        setCurrentUser(response.data?.user || null);
      } catch (error) {
        setCurrentUser(null);
      } finally {
        setLoadingSession(false);
      }
    };
    checkSession();
  }, []);

  const handleLoginSuccess = (userData) => setCurrentUser(userData);
  const handleLogout = () => setCurrentUser(null);

  if (loadingSession) {
    return <div className="app-loading">Initializing Print Hub...</div>;
  }

  return (
      <Router>
        <div className="App">
          <Navigation currentUser={currentUser} onLogout={handleLogout} />
          <Routes>
            <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<HomePage currentUser={currentUser} />} />
            <Route path="/admin/add-product" element={ currentUser?.role === 'admin' ? <AddProductPage /> : <Navigate to="/" replace /> }/>
            <Route path="/admin-panel" element={ currentUser?.role === 'admin' ? <AdminPanel currentUser={currentUser} /> : <Navigate to="/" replace /> } />
            <Route path="/profile" element={ currentUser ? <UserProfile currentUser={currentUser} /> : <Navigate to="/login" replace /> } />
            <Route path="/product/:id" element={ currentUser ? <ProductView currentUser={currentUser} /> : <Navigate to="/login" replace state={{ message: 'Please log in to view product details.'}} /> } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
  );
}

export default App;