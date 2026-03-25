import React, { useEffect, useState } from "react";
import { createNote, deleteNote, listNotes, updateNote } from "./api";

const initialFormState = { title: "", description: "" };

export default function App() {
  const [notes, setNotes] = useState([]);
  const [form, setForm] = useState(initialFormState);
  const [editingId, setEditingId] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadNotes() {
    setLoading(true);
    setError("");
    try {
      const data = await listNotes();
      setNotes(data);
    } catch (err) {
      setError("Failed to load notes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotes();
  }, []);

  function onChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function onFileChange(event) {
    setFile(event.target.files[0] || null);
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }

    setError("");
    try {
      let payload;
      if (file) {
        payload = new FormData();
        payload.append("title", form.title);
        if (form.description) {
          payload.append("description", form.description);
        }
        payload.append("file", file);
      } else {
        payload = form;
      }

      if (editingId) {
        await updateNote(editingId, payload);
      } else {
        await createNote(payload);
      }
      setForm(initialFormState);
      setFile(null);
      if (document.getElementById("file")) {
        document.getElementById("file").value = "";
      }
      setEditingId(null);
      await loadNotes();
    } catch (err) {
      setError("Failed to save note.");
    }
  }

  function onEdit(note) {
    setEditingId(note.id);
    setForm({ title: note.title, description: note.description || "" });
    setFile(null);
    if (document.getElementById("file")) {
      document.getElementById("file").value = "";
    }
    setError("");
  }

  function onCancelEdit() {
    setEditingId(null);
    setForm(initialFormState);
    setFile(null);
    if (document.getElementById("file")) {
      document.getElementById("file").value = "";
    }
  }

  async function onDelete(id) {
    const confirmed = window.confirm("Delete this note?");
    if (!confirmed) {
      return;
    }
    setError("");
    try {
      await deleteNote(id);
      await loadNotes();
    } catch (err) {
      setError("Failed to delete note.");
    }
  }

  return (
    <main className="container">
      <h1>Notes CRUD</h1>

      <form className="card form" onSubmit={onSubmit}>
        <h2>{editingId ? "Edit Note" : "Add Note"}</h2>

        <label htmlFor="title">Title *</label>
        <input
          id="title"
          name="title"
          value={form.title}
          onChange={onChange}
          maxLength={200}
          required
        />

        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          value={form.description}
          onChange={onChange}
          rows={4}
        />

        <label htmlFor="file">Attachment (Optional)</label>
        <input
          type="file"
          id="file"
          name="file"
          onChange={onFileChange}
        />

        <div className="actions">
          <button type="submit">{editingId ? "Update" : "Create"}</button>
          {editingId ? (
            <button type="button" className="secondary" onClick={onCancelEdit}>
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      {error ? <p className="error">{error}</p> : null}

      <section className="list">
        <h2>All Notes</h2>
        {loading ? <p>Loading...</p> : null}
        {!loading && notes.length === 0 ? <p>No notes yet.</p> : null}

        {notes.map((note) => (
          <article key={note.id} className="card note">
            <h3>{note.title}</h3>
            <p>{note.description || "No description."}</p>
            {note.file ? (
              <p>
                <a href={note.file} target="_blank" rel="noopener noreferrer">
                  View Attachment
                </a>
              </p>
            ) : null}
            <small>{new Date(note.created_at).toLocaleString()}</small>
            <div className="actions">
              <button type="button" onClick={() => onEdit(note)}>
                Edit
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => onDelete(note.id)}
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </section>

      <footer style={{ marginTop: "2rem", textAlign: "center", color: "#666" }}>
        <p>develop by Pasindu Jayawardhane - DevOps Engineer</p>
      </footer>
    </main>
  );
}

