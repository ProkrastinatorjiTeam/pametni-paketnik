import React, { useState, useEffect } from 'react'; 
import axios from 'axios';
import { useNavigate, useLocation } 
from 'react-router-dom';

function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState(''); // For messages from redirect
  const navigate = useNavigate();
  const location = useLocation(); // Get location object

  useEffect(() => {
    // Check for a message passed via state from a redirect
    if (location.state && location.state.message) {
      setInfoMessage(location.state.message);
      // Clear the state message so it doesn't reappear on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setInfoMessage(''); // Clear info message on new submission
    try {
      const response = await axios.post('/user/login', { username, password });
      console.log('Login successful:', response.data);
      if (response.data && response.data.user) {
        onLoginSuccess(response.data.user);
        navigate('/');
      } else {
        setError('Login failed: No user data received.');
      }
    } catch (err) {
      console.error('Login error:', err.response ? err.response.data : err.message);
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    }
  };

  return (
    <div className="auth-form">
      <h2>Login</h2>
      {infoMessage && <p className="info-message-login">{infoMessage}</p>} {/* Display info message */}
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="username">Username:</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="error-message">{error}</p>}
        <button type="submit">Login</button>
      </form>
    </div>
  );
}

export default Login;