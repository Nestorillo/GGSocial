import { API_BASE } from "./api.js";

document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const email = form.email.value.trim();
  const password = form.password.value.trim();

  const errorEl = document.getElementById("loginError");
  errorEl.textContent = "";

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.errors?.[0]?.message || res.statusText);

    const token = data?.data?.accessToken;
    const name = data?.data?.name;
    if (!token) throw new Error("No token received");

    let apiKey = localStorage.getItem("apiKey");
    if (!apiKey) {
      const kRes = await fetch(`${API_BASE}/auth/create-api-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: "GG Social Key" }),
      });
      const kJson = await kRes.json();
      if (!kRes.ok) throw new Error(kJson?.errors?.[0]?.message || kRes.statusText);
      apiKey = kJson?.data?.key;
    }

    localStorage.setItem("token", token);
    localStorage.setItem("accessToken", token);
    localStorage.setItem("apiKey", apiKey);
    localStorage.setItem("name", name);

    window.location.href = "./feed.html";
  } catch (err) {
    errorEl.textContent = err.message || "Login failed";
  }
});
