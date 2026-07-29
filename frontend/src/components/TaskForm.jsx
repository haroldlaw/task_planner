import { useState, useEffect } from "react";
import { api } from "../api";

function getDefaultDueDateValue() {
  const now = new Date();
  now.setHours(23, 59, 0, 0);

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function TaskForm({ tags, onTagsChanged, onCreated, editingTask, onUpdated, onCancelEdit  }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(getDefaultDueDateValue());
  const [priority, setPriority] = useState("medium");
  const [tagInput, setTagInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isEditing = Boolean(editingTask);

  // when user clicks edit, pre-fill the form; when edit mode is cleared, reset it
  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description || "");
      setDueDate(editingTask.due_date ? editingTask.due_date.slice(0, 16) : "");
      setPriority(editingTask.priority);
      setTagInput((editingTask.tags || []).map((t) => t.name).join(", "));
    } else {
      resetForm();
    }
  }, [editingTask]);

  function resetForm() {
    setTitle("");
    setDescription("");
    setDueDate(getDefaultDueDateValue());
    setPriority("medium");
    setTagInput("");
  }

  async function resolveTagIds(names) {
    const existingByName = new Map(
      tags.map((t) => [t.name.toLowerCase(), t.id]),
    );
    const ids = [];
    let changed = false;
    for (const rawName of names) {
      const name = rawName.trim();
      if (!name) continue;
      const existingId = existingByName.get(name.toLowerCase());
      if (existingId) {
        ids.push(existingId);
      } else {
        const newTag = await api.createTag(name);
        ids.push(newTag.id);
        changed = true;
      }
    }
    if (changed) onTagsChanged();
    return ids;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);

    try {
      const tagNames = tagInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const tag_ids = await resolveTagIds(tagNames);

      const payload = {
        title,
        description: description || null,
        due_date: dueDate || null,
        priority,
        tag_ids,
      };

      if (isEditing) {
        // NEW: edit mode — PUT to the existing task instead of creating a new one
        const updated = await api.updateTask(editingTask.id, payload);
        onUpdated(updated);
      } else {
        const optimisticTask = {
          id: `temp-${Date.now()}`,
          ...payload,
          status: "todo",
          created_at: new Date().toISOString(),
          completed_at: null,
          tags: tagNames.map((n) => ({ id: `temp-${n}`, name: n })),
        };
        onCreated(optimisticTask);
        const saved = await api.createTask({ ...payload, status: "todo" });
        onCreated(saved, optimisticTask.id);
      }

      resetForm();
    } catch (err) {
      if (isEditing) {
        alert(`Could not save changes: ${err.message}`);
      } else {
        onCreated(null, null, err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancel() {
    resetForm();
    onCancelEdit();
  }

  return (
    <form className="task-form card" onSubmit={handleSubmit}>
      {isEditing && (
        <div className="editing-banner">
          Editing "{editingTask.title}"
          <button type="button" className="link-button" onClick={handleCancel}>
            Cancel
          </button>
        </div>
      )}
      <div className="row">
        <input
          className="title-input"
          type="text"
          placeholder="Add a task"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="low">Low priority</option>
          <option value="medium">Medium priority</option>
          <option value="high">High priority</option>
        </select>
        <input
          type="datetime-local"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>
      <div className="row">
        <textarea
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          style={{ flex: 1, minWidth: 200, resize: "vertical" }}
        />
      </div>
      <div className="row">
        <input
          type="text"
          placeholder="Tags, comma separated (e.g. work, urgent)"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          style={{ flex: 1 }}
        />
        <button className="btn-primary" type="submit" disabled={submitting}>
          {submitting ? "Saving…" : isEditing ? "Save changes" : "Add task"}
        </button>
      </div>
    </form>
  );
}
