import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.nostr for all tests
global.window = global.window || {};
window.nostr = {
  getPublicKey: vi.fn(),
  signEvent: vi.fn(),
  getRelays: vi.fn(),
};

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as unknown as Storage;
