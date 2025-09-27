export const API_BASE = "https://v2.api.noroff.dev";

export function authHeaders() {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
  const apiKey = localStorage.getItem("apiKey");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(apiKey ? { "X-Noroff-API-Key": apiKey } : {}),
  };
}

export function getMyName() {
  const n1 = localStorage.getItem("name");
  if (n1) return n1;
  try {
    const me = JSON.parse(localStorage.getItem("me") || "{}");
    if (me?.name) return me.name;
  } catch { }
  return "";
}

export function requireAuth() {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
  if (!token) location.href = "index.html";
}

export function setHeaderAuthUI() {
  const nav = document.getElementById("authRight");
  if (!nav) return;
  const isAuth = !!localStorage.getItem("accessToken") || !!localStorage.getItem("token");
  nav.innerHTML = isAuth
    ? `
      <a href="./profile.html" class="ghost">My profile</a>
      <a href="./post-new.html" class="btn">New post</a>
      <button id="logoutBtn" class="ghost">Logout</button>
    `
    : `
      <a href="./index.html" class="ghost" data-public>Login</a>
      <a href="./register.html" class="ghost" data-public>Register</a>
    `;
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      localStorage.clear();
      location.href = "index.html";
    };
  }
}
