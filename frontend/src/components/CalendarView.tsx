"use client";

import type { Task } from "@/lib/api";

type CalendarViewProps = {
  year: number;
  month: number; // 0-indexed
  tasks: Task[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
};

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toDateKey(year: number, month: number, day: number) {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export function CalendarView({ year, month, tasks, selectedDate, onSelectDate }: CalendarViewProps) {
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = toDateKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  const tasksByDate = new Map<string, Task[]>();
  for (const task of tasks) {
    if (!task.due_date) continue;
    const key = task.due_date.slice(0, 10);
    const existing = tasksByDate.get(key) ?? [];
    existing.push(task);
    tasksByDate.set(key, existing);
  }

  const cells: { day: number | null; key: string | null }[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    cells.push({ day: null, key: null });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, key: toDateKey(year, month, day) });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-medium text-slate-500">
        {weekdays.map((wd) => (
          <div key={wd} className="py-2">
            {wd}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((cell, idx) => {
          if (cell.day === null) {
            return <div key={idx} className="min-h-[96px] border-b border-r border-slate-100 bg-slate-50/50" />;
          }

          const dayTasks = tasksByDate.get(cell.key!) ?? [];
          const isToday = cell.key === todayKey;
          const isSelected = cell.key === selectedDate;

          return (
            <button
              key={idx}
              onClick={() => onSelectDate(cell.key!)}
              className={`flex min-h-[96px] flex-col items-start gap-1 border-b border-r border-slate-100 p-2 text-left transition hover:bg-brand-50 ${
                isSelected ? "bg-brand-50 ring-1 ring-inset ring-brand-300" : ""
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                  isToday ? "bg-brand-600 text-white" : "text-slate-600"
                }`}
              >
                {cell.day}
              </span>
              <div className="flex w-full flex-col gap-1">
                {dayTasks.slice(0, 2).map((task) => (
                  <span
                    key={task.id}
                    className={`w-full truncate rounded px-1.5 py-0.5 text-[11px] ${
                      task.completed ? "bg-slate-100 text-slate-400 line-through" : "bg-brand-100 text-brand-700"
                    }`}
                  >
                    {task.title}
                  </span>
                ))}
                {dayTasks.length > 2 && (
                  <span className="text-[11px] text-slate-400">+{dayTasks.length - 2} more</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
