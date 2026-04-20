// src/lib/api.ts
// Point central pour l'URL de l'API et les appels authentifiés.

export const API_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3000/api"
    : "https://atelier4.vercel.app/api";

/** Renvoie les headers d'authentification à envoyer sur chaque requête protégée. */
const getAuthHeaders = (): Record<string, string> => {
  try {
    const userStr = localStorage.getItem("user");
    if (!userStr) return {};
    const user = JSON.parse(userStr);
    return {
      "x-user-id": user.id ?? "",
      "x-user-role": user.role ?? "user",
    };
  } catch {
    return {};
  }
};

/**
 * Wrapper autour de fetch qui injecte automatiquement les headers d'auth.
 * Utilisation identique à fetch() standard.
 *
 * Exemple :
 *   import { authFetch, API_URL } from "@/lib/api";
 *   const res = await authFetch(`${API_URL}/montages`);
 */
export const authFetch = (url: string, options: RequestInit = {}): Promise<Response> => {
  const authHeaders = getAuthHeaders();
  return fetch(url, {
    ...options,
    headers: {
      ...authHeaders,
      ...(options.headers ?? {}),
    },
  });
};
