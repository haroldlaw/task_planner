import { useState } from "react";

let mockIdCounter = 1000; // simple incrementing fake ID generator for mock mode

export default function TaskForm({ tags, onTagsChanged, onCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [tagInput, setTagInput] = useState("");

  // MOCK VERSION: resolves tag names to tag objects using only local state,
  // no api.createTag() call. Creates a new fake tag if the name doesn't exist yet.
  function resolveTags(names) {
    const existingByName = new Map(tags.map((t) => [t.name.toLowerCase(), t]));
    const resolved = [];
    const newlyCreated = [];
    for (const rawName of names) {
      const name = rawName.trim();
      if (!name) continue;
      const existing = existingByName.get(name.toLowerCase());
      if (existing) {
        resolved.push(existing);
      } else {
        const newTag = { id: mockIdCounter++, name };
        resolved.push(newTag);
        newlyCreated.push(newTag);
      }
    }
    if (newlyCreated.length > 0) onTagsChanged(newlyCreated);
    return resolved;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;

    const tagNames = tagInput.split(",").map((t) => t.trim()).filter(Boolean);
    const taskTags = resolveTags(tagNames);

    // MOCK VERSION: no server round-trip — the task is "created" immediately
    // and permanently, since there's nothing to reconcile against yet.
    const newTask = {
      id: mockIdCounter++,
      title,
      description: description || null,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      priority,
      status: "todo",
      created_at: new Date().toISOString(),
      completed_at: null,
      tags: taskTags,
    };
    onCreated(newTask);

    setTitle("");
    setDescription("");
    setDueDate("");
    setPriority("medium");
    setTagInput("");
  }

  return (
    <form className="task-form card" onSubmit={handleSubmit}>
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
        <button className="btn-primary" type="submit">
          Add task
        </button>
      </div>
    </form>
  );
}