// Small shared client for talking to the backend in server.js.
// Kept dependency-free (uses the browser's built-in fetch) to match the
// rest of this project.

const TOKEN_KEY = "vlab_token";
const USER_KEY = "vlab_user";

export function saveSession({ token, username, name, roll }) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify({ username, name, roll }));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  return Boolean(getToken());
}

/**
 * Thin fetch wrapper: prefixes /api, attaches the auth token, and throws
 * an Error with the backend's message on non-2xx responses.
 */
export async function apiFetch(path, options = {}) {
  const token = getToken();

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`/api${path}`, { ...options, headers });

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status})`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }

  return data;
}

export async function login(username, password) {
  const data = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  saveSession(data);
  return data;
}

export function fetchLabs() {
  return apiFetch("/labs");
}

export function fetchLabExperiments(labId) {
  return apiFetch(`/labs/${labId}/experiments`);
}

export function simulateFunctionGenerator(params) {
  return apiFetch("/experiments/function-generator/simulate", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export function saveFunctionGeneratorResult(params) {
  return apiFetch("/experiments/function-generator/results", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export function fetchFunctionGeneratorResults() {
  return apiFetch("/experiments/function-generator/results");
}
