"use client";

import type { Task } from "@/lib/api";

type TaskItemProps = {
  task: Task;
  onToggleComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
};

function formatDate(value: string | null) {
  if (!value) return "No due date";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function TaskItem({ task, onToggleComplete, onEdit, onDelete }: TaskItemProps) {
  return (
    <li className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggleComplete(task)}
        className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
      />

      <div className="flex-1">
        <p className={`font-medium ${task.completed ? "text-slate-400 line-through" : "text-slate-900"}`}>
          {task.title}
        </p>
        {task.description && <p className="mt-1 text-sm text-slate-500">{task.description}</p>}

        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          <span>📅 {formatDate(task.due_date)}</span>
          <span>Created by {task.created_by_name ?? "—"}</span>
          <span>Assigned to {task.assigned_to_name ?? "Unassigned"}</span>
        </div>
      </div>

      <div className="flex shrink-0 gap-2">
        <button
          onClick={() => onEdit(task)}
          className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(task)}
          className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
        >
          Delete
        </button>
      </div>
    </li>
  );
}
