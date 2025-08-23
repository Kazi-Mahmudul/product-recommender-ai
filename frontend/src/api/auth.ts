let API_BASE = `${process.env.REACT_APP_API_BASE}/api/v1/auth`;
if (API_BASE.startsWith('http://')) {
  API_BASE = API_BASE.replace('http://', 'https://');
}

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
  const res = await fetch(`${API_BASE}/profile`, {
    method: "PUT",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}` 
    },
    body: JSON.stringify(profileData)
  });
  return res.json();
}

export async function logout() {
  // For JWT, just remove token on client
  return { success: true };
} 