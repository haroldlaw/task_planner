const PRIORITY_COLOR_VAR = {
  high: "var(--priority-high)",
  medium: "var(--priority-medium)",
  low: "var(--priority-low)",
};

function formatDueDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function TaskItem({ task, onToggle, onDelete, onEdit }) {
  const isDone = task.status === "done";
  const dueDate = task.due_date ? new Date(task.due_date) : null;
  const now = new Date();
  const isOverdue = dueDate && dueDate < now && !isDone;
  const isDueToday =
    dueDate && !isOverdue && !isDone && isSameDay(dueDate, now);

  function handleDeleteClick() {
    // confirm before deleting, since this is irreversible
    if (window.confirm(`Delete "${task.title}"? This can't be undone.`)) {
      onDelete(task);
    }
  }

  return (
    <div
      className={`task-row ${isDone ? "done" : ""}`}
      style={{ "--priority-color": PRIORITY_COLOR_VAR[task.priority] }}
    >
      <input
        type="checkbox"
        className="task-checkbox"
        checked={isDone}
        onChange={() => onToggle(task)}
        aria-label={`Mark "${task.title}" ${isDone ? "not done" : "done"}`}
      />
      <div className="task-body">
        <div className="task-title-line">
          <span className="task-title">{task.title}</span>
          <span className={`priority-pill ${task.priority}`}>
            {task.priority}
          </span>
          {task.tags?.map((tag) => (
            <span key={tag.id} className="tag-chip">
              {tag.name}
            </span>
          ))}
        </div>
        {task.description && (
          <div className="task-desc">{task.description}</div>
        )}
        <div className="task-meta">
          {task.due_date && (
            <span
              className={isOverdue ? "overdue" : isDueToday ? "due-today" : ""}
            >
              {isOverdue ? "overdue · " : isDueToday ? "due today · " : "due "}
              {formatDueDate(task.due_date)}
            </span>
          )}
          {isDone && task.completed_at && (
            <span>done {formatDueDate(task.completed_at)}</span>
          )}
        </div>
      </div>
      <div className="task-actions">
        <button
          className="icon-btn"
          onClick={() => onEdit(task)}
          aria-label="Edit task"
        >
          ✎
        </button>
        <button
          className="icon-btn"
          onClick={handleDeleteClick}
          aria-label="Delete task"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
