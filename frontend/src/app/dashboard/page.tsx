"use client";

import { useCallback, useEffect, useState } from "react";

import { Navbar } from "@/components/Navbar";
import { RequireAuth } from "@/components/RequireAuth";
import { TaskForm, type TaskFormValues } from "@/components/TaskForm";
import { TaskItem } from "@/components/TaskItem";
import { api, ApiError, type Task, type User } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type Filter = "all" | "today" | "upcoming" | "completed";

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Completed" },
];

function DashboardContent() {
  const { token } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadTasks = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await api.listTasks(token, {
        filter: filter === "all" ? undefined : filter,
        search: search || undefined,
        assignedTo: assignedTo || undefined,
      });
      setTasks(data);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Failed to load tasks.");
    } finally {
      setLoading(false);
    }
  }, [token, filter, search, assignedTo]);

  useEffect(() => {
    if (!token) return;
    api.listUsers(token).then(setUsers).catch(() => setUsers([]));
  }, [token]);

  useEffect(() => {
    const timeout = setTimeout(loadTasks, 200);
    return () => clearTimeout(timeout);
  }, [loadTasks]);

  function openCreateForm() {
    setEditingTask(null);
    setFormError(null);
    setFormOpen(true);
  }

  function openEditForm(task: Task) {
    setEditingTask(task);
    setFormError(null);
    setFormOpen(true);
  }

  async function handleFormSubmit(values: TaskFormValues) {
    if (!token) return;
    setSubmitting(true);
    setFormError(null);
    try {
      if (editingTask) {
        await api.updateTask(token, editingTask.id, values);
      } else {
        await api.createTask(token, values);
      }
      setFormOpen(false);
      setEditingTask(null);
      await loadTasks();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Failed to save task.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleComplete(task: Task) {
    if (!token) return;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t)));
    try {
      await api.updateTask(token, task.id, { completed: !task.completed });
    } catch {
      await loadTasks();
    }
  }

  async function handleDelete(task: Task) {
    if (!token) return;
    if (!confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
    try {
      await api.deleteTask(token, task.id);
      await loadTasks();
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Failed to delete task.");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-slate-900">Tasks</h1>
          <button
            onClick={openCreateForm}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            + New task
          </button>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  filter === f.value ? "bg-brand-600 text-white" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title…"
            className="min-w-[180px] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />

          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">All assignees</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6">
          {loading && <p className="text-sm text-slate-400">Loading tasks…</p>}
          {loadError && <p className="text-sm text-red-600">{loadError}</p>}
          {!loading && !loadError && tasks.length === 0 && (
            <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-400">
              No tasks here yet. Create one to get started.
            </p>
          )}

          <ul className="space-y-3">
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggleComplete={handleToggleComplete}
                onEdit={openEditForm}
                onDelete={handleDelete}
              />
            ))}
          </ul>
        </div>
      </main>

      {formOpen && (
        <TaskForm
          users={users}
          initial={editingTask}
          submitting={submitting}
          error={formError}
          onSubmit={handleFormSubmit}
          onCancel={() => setFormOpen(false)}
        />
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}
