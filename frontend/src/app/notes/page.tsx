"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { RequireAuth } from "@/components/RequireAuth";
import { api } from "@/lib/api"; 
import { useAuth } from "@/lib/auth-context";

interface Note {
  id: number;
  title: string;
  content: string;
  created_at: string;
}

function NotesContent() {
  const { token } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  
  const fetchNotes = async () => {
    if (!token) return;
    try {
      const data = await api.listNotes(token);
      setNotes(data || []);
    } catch (error) {
      console.error("Failed to retrieve notes", error);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [token]);

 
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return alert("Please fill in the note title and content!");
    if (!token) return;

    setLoading(true);
    try {
      await api.createNote(token, { title, content });
      setTitle("");
      setContent("");
      await fetchNotes(); 
    } catch (error) {
      alert("Gagal menyimpan nota. Sila cuba lagi.");
      console.error("Error saving note:", error);
    } finally {
      setLoading(false);
    }
  };


  const handleDelete = async (id: number) => {
    if (!token) return;
    if (!confirm("Are you sure you want to delete this note?")) return;

    try {
      await api.deleteNote(token, id);
      await fetchNotes();
    } catch (error) {
      console.error("Failed to delete note:", error);
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-900">Notes Management (Notes)</h1>
      </div>
      
      <form onSubmit={handleSubmit} className="mt-6 bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold mb-4 text-brand-600">Add New Note</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">Note Title</label>
          <input
            type="text"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="Example: Meeting Minutes - TeraDo Project"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">Content</label>
          <textarea
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm h-32 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="Write your note details here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition"
        >
          {loading ? "Saving..." : "+ Save Note"}
        </button>
      </form>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        {notes.length === 0 ? (
          <p className="col-span-full rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-400">
            No notes saved yet.
          </p>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 relative group transition-all">
              <button
                onClick={() => handleDelete(note.id)}
                className="absolute top-3 right-3 text-sm text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200 font-medium"
              >
                Delete
              </button>
              <h3 className="font-semibold text-lg text-slate-900 mb-2">{note.title}</h3>
              <p className="text-slate-600 whitespace-pre-wrap text-sm mb-4">{note.content}</p>
              <span className="text-xs text-slate-400 block">
                📅 {new Date(note.created_at).toLocaleDateString()}
              </span>
            </div>
          ))
        )}
      </div>
    </main>
  );
}

export default function NotesPage() {
  return (
    <RequireAuth>
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <NotesContent />
      </div>
    </RequireAuth>
  );
}