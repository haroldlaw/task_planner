const BASE_URL = "http://localhost:8000";

function getToken() {
  return localStorage.getItem("token");
}

async function request(path, { method = "GET", body, formEncoded = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let payload = body;
  if (body && !formEncoded) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const res = await fetch(`${BASE_URL}${path}`, { method, headers, body: payload });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message = data?.detail || "Something went wrong";
    throw new Error(typeof message === "string" ? message : JSON.stringify(message));
  }
  return data;
}

export const api = {
  register: (username, email, password) =>
    request("/auth/register", { method: "POST", body: { username, email, password } }),

  login: (username, password) => {
    const form = new URLSearchParams();
    form.append("username", username);
    form.append("password", password);
    return request("/auth/login", { method: "POST", body: form, formEncoded: true });
  },

  me: () => request("/auth/me"),

  listTasks: (params = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ).toString();
    return request(`/tasks${query ? `?${query}` : ""}`);
  },
  createTask: (task) => request("/tasks", { method: "POST", body: task }),
  updateTask: (id, updates) => request(`/tasks/${id}`, { method: "PUT", body: updates }),
  toggleComplete: (id) => request(`/tasks/${id}/complete`, { method: "PATCH" }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: "DELETE" }),

  listTags: () => request("/tags"),
  createTag: (name) => request("/tags", { method: "POST", body: { name } }),
  deleteTag: (id) => request(`/tags/${id}`, { method: "DELETE" }),

  getStats: () => request("/stats"),
};