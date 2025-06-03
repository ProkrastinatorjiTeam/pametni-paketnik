import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import Login from './components/Login'; // Import Login component
import Register from './components/Register'; // Import Register component

// A simple placeholder for a home page
function HomePage() {
  return (
    <main className="main-content">
      <h1>Welcome to Paketnik!</h1>
      <p>Your smart package solution.</p>
      {/* Content for all users will go here */}
    </main>
  );
}

function App() {
  // TODO: Add state for authentication status
  // const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <Router>
      <div className="App">
        <nav className="top-bar">
          <div className="logo">
            <Link to="/">Paketnik</Link> {/* Changed from Paketnik Admin */}
          </div>
          <div className="nav-links">
            {/* TODO: Conditionally show links based on auth state */}
            <Link to="/register"><span>Register</span></Link>
            <Link to="/login"><span>Login</span></Link>
            {/* <button onClick={handleLogout}>Logout</button> */}
          </div>
        </nav>

        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<HomePage />} />
          {/* Add other routes here */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;