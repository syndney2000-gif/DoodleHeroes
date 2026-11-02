import { afterEach, expect, test, vi } from 'vitest';

afterEach(() => vi.unstubAllGlobals());

test('a successful preference write does not hide an unsaved game warning', async () => {
  vi.resetModules();
  let blocked = true;
  const dispatch = vi.fn();
  vi.stubGlobal('window', { dispatchEvent: dispatch });
  vi.stubGlobal('localStorage', { setItem(key: string) {
    if (blocked && key === 'dh:margin-merge:state') throw new Error('Storage full');
  } });
  const storage = await import('../src/lib/storage');
  storage.save('margin-merge:state', { coins: 12 });
  expect(storage.hasUnsavedChanges()).toBe(true);
  expect(dispatch.mock.calls[0][0].type).toBe('dh:save-error');
  storage.save('settings:music', true);
  expect(storage.hasUnsavedChanges()).toBe(true);
  blocked = false;
  storage.save('margin-merge:state', { coins: 12 });
  expect(storage.hasUnsavedChanges()).toBe(false);
  expect(dispatch.mock.calls.at(-1)![0].type).toBe('dh:save-recovered');
});

test('an explicit reset clears warnings for failed writes absent from storage', async () => {
  vi.resetModules();
  const removeItem = vi.fn();
  vi.stubGlobal('window', { dispatchEvent: vi.fn() });
  vi.stubGlobal('localStorage', { length: 0, setItem() { throw new Error('Blocked'); }, removeItem });
  const storage = await import('../src/lib/storage');
  storage.save('margin-merge:state', {});
  storage.clearAll();
  expect(removeItem).toHaveBeenCalledWith('dh:margin-merge:state');
  expect(storage.hasUnsavedChanges()).toBe(false);
});
