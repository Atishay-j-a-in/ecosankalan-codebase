import api from "./api";

export async function saveFCMToken({ token, device }) {
  return api.post("/api/notifications/token", { token, device });
}

export async function removeFCMToken(token) {
  return api.delete("/api/notifications/token", { data: { token } });
}