import axios from "axios";

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function saveFCMToken({ token, device }) {
  return axios.post(
    "/api/notifications/token",
    { token, device },
    { headers: authHeaders() }
  );
}

export async function removeFCMToken(token) {
  return axios.delete("/api/notifications/token", {
    headers: authHeaders(),
    data: { token },
  });
}