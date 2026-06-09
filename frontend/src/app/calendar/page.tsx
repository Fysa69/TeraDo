"use client";

import { useEffect, useState } from "react";

import { CalendarView } from "@/components/CalendarView";
import { Navbar } from "@/components/Navbar";
import { RequireAuth } from "@/components/RequireAuth";
import { api, ApiError, type Task } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatDateLabel(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function CalendarContent() {
  const { token } = useAuth();
  const today = new Date();

  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    api
      .listTasks(token)
      .then(setTasks)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load tasks."))
      .finally(() => setLoading(false));
  }, [token]);

  function changeMonth(delta: number) {
    setCursor((prev) => {
      const date = new Date(prev.year, prev.month + delta, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
    setSelectedDate(null);
  }

  const tasksForSelectedDate = selectedDate
    ? tasks.filter((t) => t.due_date?.slice(0, 10) === selectedDate)
    : [];

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Calendar</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => changeMonth(-1)}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-white"
            >
              ←
            </button>
            <span className="min-w-[160px] text-center text-sm font-medium text-slate-700">
              {monthNames[cursor.month]} {cursor.year}
            </span>
            <button
              onClick={() => changeMonth(1)}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-white"
            >
              →
            </button>
          </div>
        </div>

        {loading && <p className="mt-6 text-sm text-slate-400">Loading calendar…</p>}
        {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

        {!loading && !error && (
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <CalendarView
                year={cursor.year}
                month={cursor.month}
                tasks={tasks}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              {selectedDate ? (
                <>
                  <h2 className="text-sm font-semibold text-slate-900">{formatDateLabel(selectedDate)}</h2>
                  {tasksForSelectedDate.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-400">No tasks due on this day.</p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {tasksForSelectedDate.map((task) => (
                        <li key={task.id} className="rounded-lg border border-slate-100 p-3">
                          <p className={`text-sm font-medium ${task.completed ? "text-slate-400 line-through" : "text-slate-900"}`}>
                            {task.title}
                          </p>
                          {task.description && <p className="mt-1 text-xs text-slate-500">{task.description}</p>}
                          <p className="mt-2 text-xs text-slate-400">
                            Assigned to {task.assigned_to_name ?? "Unassigned"}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-400">Select a date to see its tasks.</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function CalendarPage() {
  return (
    <RequireAuth>
      <CalendarContent />
    </RequireAuth>
  );
}
