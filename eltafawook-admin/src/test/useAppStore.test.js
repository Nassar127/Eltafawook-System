/**
 * Tests for the Zustand store (useAppStore).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing the store
vi.mock('jwt-decode', () => ({
  jwtDecode: (token) => ({ sub: 'testuser', role: 'admin', branch_id: null }),
}));

vi.mock('../api', () => ({
  apiFetch: vi.fn(),
}));

// Mock localStorage & sessionStorage
const localStore = {};
const sessionStore = {};
vi.stubGlobal('localStorage', {
  getItem: vi.fn((k) => localStore[k] ?? null),
  setItem: vi.fn((k, v) => { localStore[k] = v; }),
  removeItem: vi.fn((k) => { delete localStore[k]; }),
});
vi.stubGlobal('sessionStorage', {
  getItem: vi.fn((k) => sessionStore[k] ?? null),
  setItem: vi.fn((k, v) => { sessionStore[k] = v; }),
  removeItem: vi.fn((k) => { delete sessionStore[k]; }),
});

describe('useAppStore', () => {
  let useAppStore;

  beforeEach(async () => {
    vi.resetModules();
    // Clear stores
    Object.keys(localStore).forEach(k => delete localStore[k]);
    Object.keys(sessionStore).forEach(k => delete sessionStore[k]);
    // Re-import to get fresh store
    const mod = await import('../store/useAppStore');
    useAppStore = mod.default;
  });

  it('has default state', () => {
    const state = useAppStore.getState();
    expect(state.authToken).toBeNull();
    expect(state.currentUser).toBeNull();
    expect(state.branches).toEqual([]);
    expect(state.items).toEqual([]);
    expect(state.teachers).toEqual([]);
    expect(state.schools).toEqual([]);
  });

  it('setAuthToken sets token and decodes user', () => {
    useAppStore.getState().setAuthToken('fake-jwt-token', false);
    const state = useAppStore.getState();
    expect(state.authToken).toBe('fake-jwt-token');
    expect(state.currentUser).toEqual({ sub: 'testuser', role: 'admin', branch_id: null });
  });

  it('setAuthToken with rememberMe stores in localStorage', () => {
    useAppStore.getState().setAuthToken('fake-jwt-token', true);
    expect(localStorage.setItem).toHaveBeenCalledWith('authToken', 'fake-jwt-token');
  });

  it('setAuthToken without rememberMe stores in sessionStorage', () => {
    useAppStore.getState().setAuthToken('fake-jwt-token', false);
    expect(sessionStorage.setItem).toHaveBeenCalledWith('authToken', 'fake-jwt-token');
  });

  it('logout clears auth and reference data', () => {
    useAppStore.getState().setAuthToken('fake-jwt-token', true);
    useAppStore.getState().setItems([{ id: '1', name: 'Book' }]);
    useAppStore.getState().logout();
    const state = useAppStore.getState();
    expect(state.authToken).toBeNull();
    expect(state.currentUser).toBeNull();
    expect(state.items).toEqual([]);
    expect(state.branches).toEqual([]);
  });

  it('setBranch updates branchId and branchCode', () => {
    useAppStore.getState().setBranch('branch-uuid', 'BAN');
    const state = useAppStore.getState();
    expect(state.branchId).toBe('branch-uuid');
    expect(state.branchCode).toBe('BAN');
    expect(localStorage.setItem).toHaveBeenCalledWith('adminBranchId', 'branch-uuid');
  });

  it('setItems / setTeachers / setSchools update state', () => {
    const items = [{ id: '1', name: 'Notebook' }];
    const teachers = [{ id: 't1', name: 'Mr. A' }];
    const schools = [{ id: 's1', name: 'School X' }];
    useAppStore.getState().setItems(items);
    useAppStore.getState().setTeachers(teachers);
    useAppStore.getState().setSchools(schools);
    expect(useAppStore.getState().items).toEqual(items);
    expect(useAppStore.getState().teachers).toEqual(teachers);
    expect(useAppStore.getState().schools).toEqual(schools);
  });

  it('itemById returns lookup map', () => {
    useAppStore.getState().setItems([{ id: 'i1', name: 'Book A' }, { id: 'i2', name: 'Book B' }]);
    const lookup = useAppStore.getState().itemById();
    expect(lookup['i1'].name).toBe('Book A');
    expect(lookup['i2'].name).toBe('Book B');
  });

  it('teacherById returns lookup map', () => {
    useAppStore.getState().setTeachers([{ id: 't1', name: 'Mr. X' }]);
    const lookup = useAppStore.getState().teacherById();
    expect(lookup['t1'].name).toBe('Mr. X');
  });

  it('isAdmin returns true for admin role', () => {
    useAppStore.getState().setAuthToken('fake-jwt-token', false);
    expect(useAppStore.getState().isAdmin()).toBe(true);
  });
});
