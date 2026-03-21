/**
 * useSearch.js — Smart Search Hook
 * Path: frontend/src/hooks/useSearch.js
 *
 * Features:
 * - Live suggestions while typing
 * - Per-user search history (localStorage)
 * - Fuzzy / spell-correction using Fuse.js
 * - Dual mode: normal | smart
 *
 * Install dependency: npm install fuse.js
 */

import { useState, useEffect, useRef, useCallback } from "react";
import Fuse from "fuse.js";

// ─── Constants ────────────────────────────────────────────────────────────────
const HISTORY_KEY = "luxe_search_history";
const MAX_HISTORY = 8;
const DEBOUNCE_MS = 300;

// ─── Fuse.js config for fuzzy search ─────────────────────────────────────────
const FUSE_OPTIONS = {
  includeScore: true,
  threshold: 0.45,        // 0 = exact, 1 = match anything
  minMatchCharLength: 2,
  keys: [
    { name: "name", weight: 0.6 },
    { name: "category", weight: 0.25 },
    { name: "tags", weight: 0.15 },
  ],
};

// ─── LocalStorage helpers ─────────────────────────────────────────────────────
function loadHistory(userId) {
  try {
    const raw = localStorage.getItem(`${HISTORY_KEY}_${userId || "guest"}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(userId, history) {
  try {
    localStorage.setItem(
      `${HISTORY_KEY}_${userId || "guest"}`,
      JSON.stringify(history)
    );
  } catch {
    // storage full — ignore
  }
}

// ─── Main Hook ────────────────────────────────────────────────────────────────
/**
 * @param {Array}  products  - full product list to search/suggest from
 * @param {string} userId    - current user id (for per-user history)
 */
export function useSearch(products = [], userId = null) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("smart"); // "normal" | "smart"
  const [suggestions, setSuggestions] = useState([]);
  const [history, setHistory] = useState(() => loadHistory(userId));
  const [isOpen, setIsOpen] = useState(false);

  const fuseRef = useRef(null);
  const debounceRef = useRef(null);

  // Re-build Fuse index when products change
  useEffect(() => {
    if (products.length > 0) {
      fuseRef.current = new Fuse(products, FUSE_OPTIONS);
    }
  }, [products]);

  // ── Compute suggestions ──────────────────────────────────────────────────
  const computeSuggestions = useCallback(
    (value) => {
      if (!value || value.trim().length < 2) {
        setSuggestions([]);
        return;
      }

      if (mode === "smart" && fuseRef.current) {
        // Fuzzy search — handles typos, partial matches
        const results = fuseRef.current
          .search(value)
          .slice(0, 6)
          .map((r) => ({
            ...r.item,
            _score: r.score,
            _matched: true,
          }));
        setSuggestions(results);
      } else {
        // Normal exact/partial match
        const lower = value.toLowerCase();
        const results = products
          .filter(
            (p) =>
              p.name?.toLowerCase().includes(lower) ||
              p.category?.toLowerCase().includes(lower) ||
              p.tags?.some((t) => t.toLowerCase().includes(lower))
          )
          .slice(0, 6);
        setSuggestions(results);
      }
    },
    [products, mode]
  );

  // ── Debounced query handler ───────────────────────────────────────────────
  const handleQueryChange = useCallback(
    (value) => {
      setQuery(value);
      setIsOpen(true);

      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        computeSuggestions(value);
      }, DEBOUNCE_MS);
    },
    [computeSuggestions]
  );

  // ── Submit search (save to history) ──────────────────────────────────────
  const submitSearch = useCallback(
    (value = query) => {
      const trimmed = value.trim();
      if (!trimmed) return;

      // Add to history (deduplicate, newest first)
      const updated = [
        trimmed,
        ...history.filter((h) => h.toLowerCase() !== trimmed.toLowerCase()),
      ].slice(0, MAX_HISTORY);

      setHistory(updated);
      saveHistory(userId, updated);
      setIsOpen(false);
    },
    [query, history, userId]
  );

  // ── Select a suggestion ───────────────────────────────────────────────────
  const selectSuggestion = useCallback(
    (product) => {
      setQuery(product.name);
      submitSearch(product.name);
      setSuggestions([]);
      setIsOpen(false);
      return product;
    },
    [submitSearch]
  );

  // ── Select from history ────────────────────────────────────────────────────
  const selectHistory = useCallback(
    (term) => {
      setQuery(term);
      computeSuggestions(term);
      setIsOpen(false);
    },
    [computeSuggestions]
  );

  // ── Remove one history item ───────────────────────────────────────────────
  const removeHistoryItem = useCallback(
    (term) => {
      const updated = history.filter((h) => h !== term);
      setHistory(updated);
      saveHistory(userId, updated);
    },
    [history, userId]
  );

  // ── Clear all history ─────────────────────────────────────────────────────
  const clearHistory = useCallback(() => {
    setHistory([]);
    saveHistory(userId, []);
  }, [userId]);

  // ── Close dropdown ────────────────────────────────────────────────────────
  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setSuggestions([]);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => () => clearTimeout(debounceRef.current), []);

  return {
    query,
    mode,
    suggestions,
    history,
    isOpen,
    setMode,
    setIsOpen,
    handleQueryChange,
    submitSearch,
    selectSuggestion,
    selectHistory,
    removeHistoryItem,
    clearHistory,
    closeDropdown,
  };
}