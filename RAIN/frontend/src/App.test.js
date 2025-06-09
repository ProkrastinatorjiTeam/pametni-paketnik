import { render, screen } from '@testing-library/react';
import App from './App';

test('renders PrintHub link', () => {
  render(<App />);
  const linkElements = screen.getAllByText(/printhub/i);
  expect(linkElements.length).toBeGreaterThan(0);
});
