import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from './Login';

// Mock the onLoginSuccess prop as it's required by the Login component
const mockOnLoginSuccess = jest.fn();

describe('Login Component', () => {
  test('renders login form elements', () => {
    render(
      <BrowserRouter>
        <Login onLoginSuccess={mockOnLoginSuccess} />
      </BrowserRouter>
    );

    // Check for the "Login" heading
    expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();

    // Check for the username input
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();

    // Check for the password input
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();

    // Check for the login button
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();

    // Check for the link to the registration page
    expect(screen.getByText(/don't have an account\?/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /register here/i })).toBeInTheDocument();
  });
});