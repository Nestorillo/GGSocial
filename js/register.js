import { API_BASE } from "./api.js";

function registerUser(payload) {
  return fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function loginAndGetToken(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.errors?.[0]?.message || "Login failed");
  return data.data?.accessToken;
}

async function createApiKey(token) {
  const res = await fetch(`${API_BASE}/auth/create-api-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.errors?.[0]?.message || "API key error");
  return data.data?.key || data.key;
}

const form = document.getElementById("registerForm");
const elError = document.getElementById("registerError");
const elOk = document.getElementById("registerOk");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  elError.textContent = "";
  elOk.textContent = "";

  const fd = new FormData(form);
  const name = fd.get("name").trim();
  const email = fd.get("email").trim();
  const password = fd.get("password").trim();
  const bio = (fd.get("bio") || "").trim();
  const avatarUrl = (fd.get("avatarUrl") || "").trim();
  const avatarAlt = (fd.get("avatarAlt") || "").trim();

  if (!email.endsWith("@stud.noroff.no")) { elError.textContent = "Email must be a valid stud.noroff.no address."; return; }
  if (!/^[A-Za-z0-9_]+$/.test(name)) { elError.textContent = "Username can only contain letters, numbers and underscore."; return; }
  if (password.length < 8) { elError.textContent = "Password must be at least 8 characters."; return; }

  const payload = { name, email, password, ...(bio ? { bio } : {}) };
  if (avatarUrl) payload.avatar = { url: avatarUrl, alt: avatarAlt || "" };

  try {
    const res = await registerUser(payload);
    const regData = await res.json();
    if (!res.ok) throw new Error(regData.errors?.[0]?.message || "Register failed");
    elOk.textContent = "Account created! Signing you in…";

    const token = await loginAndGetToken(email, password);
    localStorage.setItem("token", token);
    localStorage.setItem("accessToken", token);

    try {
      const apiKey = await createApiKey(token);
      localStorage.setItem("apiKey", apiKey);
    } catch { }

    window.location.href = "./feed.html";
  } catch (err) {
    elError.textContent = err.message || "Something went wrong.";
  }
});
