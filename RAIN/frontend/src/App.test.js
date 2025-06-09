import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom'; 
import App from './App';

test('renders PrintHub link after loading', async () => { 

  render(
    <BrowserRouter> {/* Wrap App with BrowserRouter to provide routing context */}
      <App />
    </BrowserRouter>
  );

  const linkElements = await screen.findAllByText(/printhub/i);

  // Assert that at least one element with "PrintHub" was found
  expect(linkElements.length).toBeGreaterThan(0);

  expect(linkElements[0]).toBeInTheDocument();
});
