import { create } from "zustand";
import { jwtDecode } from "jwt-decode";
import { apiFetch } from "../api";

const DEFAULT_API_BASE = "https://api.eltafawook.site/api/v1";

const useAppStore = create((set, get) => ({
  // ── Auth ──
  apiBase: (() => {
    const saved = localStorage.getItem("apiBase_v5");
    if (!saved) return DEFAULT_API_BASE;
    if (!saved.includes("/api/v1")) {
      localStorage.setItem("apiBase_v5", DEFAULT_API_BASE);
      return DEFAULT_API_BASE;
    }
    return saved;
  })(),
  authToken: localStorage.getItem("authToken") || sessionStorage.getItem("authToken") || null,
  currentUser: null,

  setAuthToken: (token, rememberMe = false) => {
    if (rememberMe) localStorage.setItem("authToken", token);
    else sessionStorage.setItem("authToken", token);
    const decoded = jwtDecode(token);
    set({ authToken: token, currentUser: decoded });
  },

  logout: () => {
    localStorage.removeItem("authToken");
    sessionStorage.removeItem("authToken");
    set({
      authToken: null,
      currentUser: null,
      branches: [],
      schools: [],
      teachers: [],
      items: [],
      kgItems: [],
      branchId: "",
      branchCode: "",
    });
  },

  isAdmin: () => get().currentUser?.role === "admin",

  // ── Branch ──
  branches: [],
  branchId: "",
  branchCode: "",
  setBranch: (id, code) => {
    set({ branchId: id, branchCode: code });
    localStorage.setItem("adminBranchId", id);
  },

  // ── Reference data ──
  schools: [],
  teachers: [],
  items: [],
  kgItems: [],

  setSchools: (s) => set({ schools: s }),
  setTeachers: (t) => set({ teachers: t }),
  setItems: (i) => set({ items: i }),
  setKgItems: (k) => set({ kgItems: k }),

  // Derived lookups (call these as functions)
  itemById: () => Object.fromEntries((get().items || []).map((i) => [i.id, i])),
  teacherById: () => Object.fromEntries((get().teachers || []).map((t) => [t.id, t])),

  // ── Bootstrap: load all reference data after login ──
  bootstrap: async () => {
    const { apiBase, authToken, currentUser } = get();
    if (!authToken) return;

    const decoded = currentUser || jwtDecode(authToken);
    if (!currentUser) set({ currentUser: decoded });

    try {
      const bs = await apiFetch(apiBase, "/branches", { authToken });
      const branchList = bs?.items ?? bs ?? [];
      set({ branches: branchList });

      if (decoded.role === "admin") {
        const savedId = localStorage.getItem("adminBranchId");
        const target =
          branchList.find((b) => b.id === savedId) ||
          branchList.find((b) => b.code === "BAN") ||
          branchList[0];
        if (target) set({ branchId: target.id, branchCode: target.code });
      } else {
        const ub = branchList.find((b) => b.id === decoded.branch_id);
        if (ub) set({ branchId: ub.id, branchCode: ub.code });
      }
    } catch (e) {
      console.error("Failed to load branches", e);
    }

    try {
      const ss = await apiFetch(apiBase, "/schools", { authToken });
      set({ schools: ss?.items ?? ss ?? [] });
    } catch (e) {
      console.error("Failed to load schools", e);
    }

    try {
      const its = await apiFetch(apiBase, "/items", { authToken });
      const arr = its?.items ?? its;
      set({ items: Array.isArray(arr) ? arr : [] });
    } catch (e) {
      console.error("Failed to load items", e);
    }

    try {
      const ts = await apiFetch(apiBase, "/teachers", { authToken });
      const arr = ts?.items ?? ts;
      set({ teachers: Array.isArray(arr) ? arr : [] });
    } catch (e) {
      console.error("Failed to load teachers", e);
    }
  },
}));

export default useAppStore;
