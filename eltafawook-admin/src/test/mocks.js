/**
 * Shared mocks for frontend tests.
 */
import { vi } from 'vitest';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
  Trans: ({ children }) => children,
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

// Mock jwt-decode
vi.mock('jwt-decode', () => ({
  jwtDecode: (token) => ({ sub: 'test', role: 'admin', branch_id: null }),
}));
