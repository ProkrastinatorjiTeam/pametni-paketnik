import React, {useState, useEffect} from 'react';
import {BrowserRouter as Router, Routes, Route, Link, useNavigate, Navigate, Outlet} from 'react-router-dom';
import axios from 'axios';
import './App.css';
import Login from './components/Login';
import Register from './components/Register';
import AddProductPage from './components/AddProductPage';
import ProductView from './components/ProductView';
import AdminPanel from './components/AdminPanel';
import UserProfile from './components/UserProfile';
import {ToastProvider} from './contexts/ToastContext';

axios.defaults.withCredentials = true;
//axios.defaults.baseURL = '/api';

// --- GLAVNA POSTAVITEV Z NAVIGACIJO ---
function MainLayout({currentUser, onLogout}) {
    return (
        <>
            <Navigation currentUser={currentUser} onLogout={onLogout}/>
            <div className="main-content-wrapper">
                <Outlet/> {/* Tukaj se bodo prikazale vgnezdene komponente */}
            </div>
        </>
    );
}

// --- POSTAVITEV ZA AVTENTIKACIJO (BREZ NAVIGACIJE, A Z LOGOTIPOM) ---
function AuthLayout() {
    return (
        <div className="auth-page-wrapper">
            <header className="auth-header">
                <Link to="/" className="auth-logo-link">FoodBox</Link>
            </header>
            <main className="auth-content">
                <Outlet/> {/* Tukaj se bosta prikazala Login in Register */}
            </main>
        </div>
    );
}

function HomePage({currentUser}) {
    const navigate = useNavigate();
    const [models, setModels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchModels = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`/product/list`);
                setModels(response.data);
            } catch (err) {
                setError('Nalaganje produktov ni uspelo. Poskusite znova kasneje.');
            } finally {
                setLoading(false);
            }
        };
        fetchModels();
    }, []);

    const handleProductClick = (modelId) => {
        navigate(`/product/${modelId}`);
    };

    const getImageUrl = (imagePath) => {
        if (!imagePath) {
            return null;
        }

        const filename = imagePath.split('/').pop();

        return `/product/image/${filename}`;
    }

    return (
        <div className="main-content">
            <section className="hero-section">
                <h1 className="hero-title">Fresh Food From Local Farmers</h1>
                <p className="hero-subtitle">From farmers garden right on your plate fresh food.</p>
                {currentUser && currentUser.role === 'admin' && (
                    <button onClick={() => navigate('/admin-panel')} className="add-product-cta">Admin
                        Dashboard</button>
                )}
            </section>
            <div className="models-grid">
                {!loading && !error && models.map((product) => (
                    <div key={product._id} className="model-card" onClick={() => handleProductClick(product._id)}>
                        <img
                            src={getImageUrl(product.images?.[0]) || 'placeholder.svg'}
                            alt={product.name}
                            className="model-card-image"
                            loading="lazy"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'placeholder.svg';
                            }}
                        />
                        <div className="model-card-overlay">
                            <h3 className="model-card-title">{product.name}</h3>
                            <div className="model-card-details">
                                {product.price != null && <span>€{product.price.toFixed(2)}</span>}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function Navigation({currentUser, onLogout}) {
    const navigate = useNavigate();
    const handleLogoutClick = async () => {
        try {
            await axios.post(`/user/logout`);
            onLogout();
            navigate('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };
    return (
        <header className="top-bar">
            <div className="logo"><Link to="/">FoodBox</Link></div>
            <nav className="nav-links">
                {currentUser ? (
                    <>
                        {currentUser.role === 'admin' && (<Link to="/admin-panel"><span>Admin Panel</span></Link>)}
                        <Link to="/profile" className="nav-link-user"><span>{currentUser.username}</span></Link>
                        <button onClick={handleLogoutClick} className="logout-button">Logout</button>
                    </>
                ) : (
                    <><Link to="/register"><span>Register</span></Link><Link to="/login"><span>Login</span></Link></>
                )}
            </nav>
        </header>
    );
}

function App() {
    const [currentUser, setCurrentUser] = useState(null);
    const [loadingSession, setLoadingSession] = useState(true);

    useEffect(() => {
        const checkSession = async () => {
            setLoadingSession(true);
            try {
                const response = await axios.get(`/user/show`);
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
        return <div className="app-loading">Initializing Farm Box...</div>;
    }

    return (
        <ToastProvider>
            <Router>
                <div className="App">
                    <Routes>
                        {/* Strani za prijavo in registracijo znotraj AuthLayout (brez glavne navigacije) */}
                        <Route element={<AuthLayout/>}>
                            <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess}/>}/>
                            <Route path="/register" element={<Register/>}/>
                        </Route>

                        {/* Glavne strani znotraj MainLayout (z glavno navigacijo) */}
                        <Route element={<MainLayout currentUser={currentUser} onLogout={handleLogout}/>}>
                            <Route path="/" element={<HomePage currentUser={currentUser}/>}/>
                            <Route path="/admin/add-product"
                                   element={currentUser?.role === 'admin' ? <AddProductPage/> :
                                       <Navigate to="/" replace/>}/>
                            <Route path="/admin-panel"
                                   element={currentUser?.role === 'admin' ? <AdminPanel currentUser={currentUser}/> :
                                       <Navigate to="/" replace/>}/>
                            <Route path="/profile" element={currentUser ? <UserProfile currentUser={currentUser}/> :
                                <Navigate to="/login" replace/>}/>
                            <Route path="/product/:id" element={currentUser ? <ProductView currentUser={currentUser}/> :
                                <Navigate to="/login" replace
                                          state={{message: 'Please log in to view product details.'}}/>}/>
                        </Route>

                        {/* V primeru neobstoječe poti, preusmeri na domačo stran */}
                        <Route path="*" element={<Navigate to="/" replace/>}/>
                    </Routes>
                </div>
            </Router>
        </ToastProvider>
    );
}

export default App;