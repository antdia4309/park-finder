import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('./components/ParkMap', () => () => null);
jest.mock('./components/AmenityChart', () => () => null);

import App from './App';

test('renders the ParkFinder header', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /ParkFinder/i })).toBeInTheDocument();
});

test('activity buttons toggle on and off', () => {
  render(<App />);
  const kids = screen.getByRole('button', { name: /Kids/i });
  expect(kids).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(kids);
  expect(screen.getByRole('button', { name: /Kids/i })).toHaveAttribute('aria-pressed', 'true');
});

test('picking an activity narrows the list', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /Dogs/i }));
  expect(screen.getByRole('heading', { name: /parks? matched/i })).toBeInTheDocument();
});
