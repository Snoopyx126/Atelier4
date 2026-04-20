export const API_URL = window.location.hostname === "localhost"
  ? "http://localhost:3000/api"
  : "https://atelier4.vercel.app/api";

export const authFetch = (url: string, options: RequestInit = {}) => {
  let userId = "";
  let userRole = "user";
  try {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    userId = u.id || "";
    userRole = u.role || "user";
  } catch {}
  return fetch(url, {
    ...options,
    headers: {
      "x-user-id": userId,
      "x-user-role": userRole,
      ...(options.headers ?? {}),
    },
  });
};
