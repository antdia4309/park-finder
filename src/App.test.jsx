import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('./components/ParkMap', () => ({ default: () => null }));
vi.mock('./components/AmenityChart', () => ({ default: () => null }));

// Hand the app the real data file instead of downloading it.
vi.mock('./utils/data', () => ({ useParkData: vi.fn() }));
import { useParkData } from './utils/data';
import parkData from '../public/data/parks.json';

import App from './App';

const searchFor = (text) =>
  fireEvent.change(screen.getByLabelText('Search by park name'), { target: { value: text } });

beforeEach(() => {
  window.history.replaceState(null, '', '/');
  window.localStorage.clear();
  vi.mocked(useParkData).mockReturnValue({ status: 'ready', data: parkData, retry: vi.fn() });
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
  searchFor('Byrd');
  fireEvent.click(screen.getByRole('button', { name: /^Byrd Park/ }));
  expect(window.location.search).toBe('?q=Byrd&park=byrd-park');
  fireEvent.click(screen.getByRole('button', { name: /Back to results/i }));
  expect(window.location.search).toBe('?q=Byrd');
});
test('the Water activity finds parks with splash pads or swimming', () => {
  window.history.replaceState(null, '', '/?do=water');
  render(<App />);
  expect(screen.getByRole('button', { name: /^Water/i })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: /^Dorey Park/ })).toBeInTheDocument();
});

test('saving a park adds it to the Saved parks view', () => {
  render(<App />);
  searchFor('Byrd');
  fireEvent.click(screen.getByRole('button', { name: 'Save Byrd Park' }));
  fireEvent.click(screen.getByRole('button', { name: /^Saved parks/ }));
  expect(screen.getByRole('heading', { name: /1 saved park/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^Byrd Park/ })).toBeInTheDocument();
});

test('saved parks are remembered on the next visit', () => {
  const { unmount } = render(<App />);
  searchFor('Byrd');
  fireEvent.click(screen.getByRole('button', { name: 'Save Byrd Park' }));
  unmount();
  render(<App />);
  searchFor('Byrd');
  expect(screen.getByRole('button', { name: 'Remove Byrd Park from saved parks' })).toBeInTheDocument();
});

test('the Accessible activity finds parks with paved paths', () => {
  window.history.replaceState(null, '', '/?do=access');
  render(<App />);
  expect(screen.getByRole('button', { name: /^Accessible/i })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('heading', { name: /parks? matched/i })).toBeInTheDocument();
});

test('shows a loading message while park data downloads', () => {
  vi.mocked(useParkData).mockReturnValue({ status: 'loading', data: null, retry: vi.fn() });
  render(<App />);
  expect(screen.getByText('Loading parks…')).toBeInTheDocument();
  // The filters are still usable while waiting.
  expect(screen.getByRole('button', { name: /^Kids/i })).toBeInTheDocument();
});

test('offers a retry if park data fails to load', () => {
  const retry = vi.fn();
  vi.mocked(useParkData).mockReturnValue({ status: 'error', data: null, retry });
  render(<App />);
  expect(screen.getByRole('alert')).toHaveTextContent(/Couldn't load the park list/);
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(retry).toHaveBeenCalled();
});

test('a shared park link opens once the data arrives', () => {
  window.history.replaceState(null, '', '/?park=byrd-park');
  vi.mocked(useParkData).mockReturnValue({ status: 'loading', data: null, retry: vi.fn() });
  const { rerender } = render(<App />);
  expect(screen.getByText('Loading parks…')).toBeInTheDocument();
  vi.mocked(useParkData).mockReturnValue({ status: 'ready', data: parkData, retry: vi.fn() });
  rerender(<App />);
  expect(screen.getByRole('heading', { name: 'Byrd Park' })).toBeInTheDocument();
  expect(window.location.search).toBe('?park=byrd-park');
});
