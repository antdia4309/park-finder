import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('./components/ParkMap', () => () => null);
jest.mock('./components/AmenityChart', () => () => null);

import App from './App';

beforeEach(() => {
  window.history.replaceState(null, '', '/');
});

test('renders the ParkFinder header', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /ParkFinder/i })).toBeInTheDocument();
});

test('activity buttons toggle on and off', () => {
  render(<App />);
  const kids = screen.getByRole('button', { name: /^Kids/i });
  expect(kids).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(kids);
  expect(screen.getByRole('button', { name: /^Kids/i })).toHaveAttribute('aria-pressed', 'true');
});

test('picking an activity narrows the list and updates the link', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /^Dogs/i }));
  expect(screen.getByRole('heading', { name: /parks? matched/i })).toBeInTheDocument();
  expect(window.location.search).toBe('?do=dogs');
});

test('filters are restored from a shared link', () => {
  window.history.replaceState(null, '', '/?do=kids,picnic');
  render(<App />);
  expect(screen.getByRole('button', { name: /^Kids/i })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: /^Picnic/i })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: /^Dogs/i })).toHaveAttribute('aria-pressed', 'false');
});

test('a shared park link opens that park', () => {
  window.history.replaceState(null, '', '/?park=byrd-park');
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Byrd Park' })).toBeInTheDocument();
});

test('opening a park adds it to the link, and closing it removes it', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /Byrd Park/ }));
  expect(window.location.search).toBe('?park=byrd-park');
  fireEvent.click(screen.getByRole('button', { name: /Back to results/i }));
  expect(window.location.search).toBe('');
});