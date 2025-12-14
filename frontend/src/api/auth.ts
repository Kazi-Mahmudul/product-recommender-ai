import { getSecureApiBase } from '../cache-buster';

// Use relative path in production since frontend and backend are served from same domain
const API_BASE = `${getSecureApiBase()}/api/v1/auth`;

export async function signup(email: string, password: string, confirmPassword: string, first_name: string, last_name: string) {
  const res = await fetch(`${API_BASE}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, confirm_password: confirmPassword, first_name, last_name })
  });
  return res.json();
}

export async function verifyEmail(email: string, code: string) {
  const res = await fetch(`${API_BASE}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code })
  });
  return res.json();
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  return res.json();
}

export async function getCurrentUser(token: string) {
  const res = await fetch(`${API_BASE}/me`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  return res.json();
}

export async function resendVerification(email: string) {
  const params = new URLSearchParams({ email });
  const res = await fetch(`${API_BASE}/resend-verification?${params.toString()}`, {
    method: "POST"
  });
  return res.json();
}

export async function updateProfile(token: string, profileData: { first_name?: string; last_name?: string }) {
  const res = await fetch(`${API_BASE}/me`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(profileData)
  });
  return res.json();
}

export async function uploadProfilePicture(token: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/me/profile-picture`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`
    },
    body: formData
  });
  return res.json();
}

export async function logout() {
  // For JWT, just remove token on client
  return { success: true };
}