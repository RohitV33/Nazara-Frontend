/**
 * api.js — Centralized Axios API client
 * Path: frontend/src/utils/api.js
 *
 * Includes: auth, products (with search), orders, cart
 */

import axios from "axios";

// ─── Base Config ──────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// ─── Request Interceptor — attach JWT ─────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor — handle 401 ───────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/auth";
    }
    return Promise.reject(error);
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCT APIs
// ═══════════════════════════════════════════════════════════════════════════════
export const productAPI = {
  /**
   * Get all products with optional filters + search
   * @param {object} params - { search, category, minPrice, maxPrice, sort, page, limit, mode }
   *   mode: "normal" | "smart"  — backend can use this hint for advanced search
   */
  getAll: (params = {}) => api.get("/products", { params }),

  getById: (id) => api.get(`/products/${id}`),

  // Admin
  create: (data) => api.post("/products", data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),

  /**
   * Search suggestions endpoint (returns lightweight results fast)
   * Backend should return: [{ _id, name, image, category }]
   */
  getSuggestions: (query, mode = "smart") =>
    api.get("/products/suggestions", { params: { q: query, mode } }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// ORDER APIs
// ═══════════════════════════════════════════════════════════════════════════════
export const orderAPI = {
  create: (orderData) => api.post("/orders", orderData),

  getMyOrders: () => api.get("/orders/mine"),

  getById: (id) => api.get(`/orders/${id}`),

  cancelOrder: (id) => api.put(`/orders/${id}/cancel`),

  // Admin
  getAll: (params = {}) => api.get("/orders", { params }),

  /**
   * Update order status (Admin)
   * @param {string} id
   * @param {string} status - pending | dispatched | out_for_delivery | delivered | cancelled
   */
  updateStatus: (id, status) => api.put(`/orders/${id}/status`, { status }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH APIs
// ═══════════════════════════════════════════════════════════════════════════════
export const authAPI = {
  login: (data) => api.post("/auth/login", data),
  register: (data) => api.post("/auth/register", data),
  getProfile: () => api.get("/auth/profile"),
  updateProfile: (data) => api.put("/auth/profile", data),
  logout: () => api.post("/auth/logout"),
};

// ═══════════════════════════════════════════════════════════════════════════════
// CART APIs
// ═══════════════════════════════════════════════════════════════════════════════
export const cartAPI = {
  get: () => api.get("/cart"),
  add: (item) => api.post("/cart", item),
  update: (itemId, quantity) => api.put(`/cart/${itemId}`, { quantity }),
  remove: (itemId) => api.delete(`/cart/${itemId}`),
  clear: () => api.delete("/cart"),
};

export default api;