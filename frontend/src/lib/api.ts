const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export type User = {
  id: number;
  name: string;
  email: string;
  created_at: string;
};

export type Task = {
  id: number;
  title: string;
  description: string;
  due_date: string | null;
  completed: boolean;
  created_by: number;
  created_by_name?: string;
  assigned_to: number | null;
  assigned_to_name?: string | null;
  created_at: string;
};

export type AuthResponse = {
  token: string;
  user: User;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 204) {
    return undefined as T;
  }

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(res.status, body.error ?? "Something went wrong. Please try again.");
  }

  return body as T;
}

export const api = {
  register: (name: string, email: string, password: string) =>
    request<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) }),

  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  listUsers: (token: string) => request<User[]>("/users", {}, token),

  listTasks: (token: string, params: { filter?: string; search?: string; assignedTo?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.filter) query.set("filter", params.filter);
    if (params.search) query.set("search", params.search);
    if (params.assignedTo) query.set("assigned_to", params.assignedTo);
    const qs = query.toString();
    return request<Task[]>(`/tasks${qs ? `?${qs}` : ""}`, {}, token);
  },

  createTask: (
    token: string,
    payload: { title: string; description: string; due_date: string | null; assigned_to: number | null }
  ) => request<Task>("/tasks", { method: "POST", body: JSON.stringify(payload) }, token),

  updateTask: (token: string, id: number, payload: Partial<{
    title: string;
    description: string;
    due_date: string | null;
    completed: boolean;
    assigned_to: number | null;
  }>) => request<Task>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(payload) }, token),

  deleteTask: (token: string, id: number) => request<void>(`/tasks/${id}`, { method: "DELETE" }, token),
};
