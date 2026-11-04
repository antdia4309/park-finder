import { loadParks, DATA_URL } from './data';

afterEach(() => vi.unstubAllGlobals());

test('downloads the park data from the site', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ parks: [] }) });
  vi.stubGlobal('fetch', fetchMock);
  await expect(loadParks()).resolves.toEqual({ parks: [] });
  expect(fetchMock).toHaveBeenCalledWith(DATA_URL);
  expect(DATA_URL).toMatch(/data\/parks\.json$/);
});

test('reports a failed download', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
  await expect(loadParks()).rejects.toThrow('Park data unavailable (404)');
});
