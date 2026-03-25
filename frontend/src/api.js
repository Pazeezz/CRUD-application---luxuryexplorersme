import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

export async function listNotes() {
  const { data } = await api.get("/notes/");
  return Array.isArray(data) ? data : data.results || [];
}

export async function createNote(payload) {
  const isFormData = payload instanceof FormData;
  const config = isFormData ? { headers: { "Content-Type": undefined } } : {};
  const { data } = await api.post("/notes/", payload, config);
  return data;
}

export async function updateNote(id, payload) {
  const isFormData = payload instanceof FormData;
  const config = isFormData ? { headers: { "Content-Type": undefined } } : {};
  const { data } = await api.patch(`/notes/${id}/`, payload, config);
  return data;
}

export async function deleteNote(id) {
  await api.delete(`/notes/${id}/`);
}

