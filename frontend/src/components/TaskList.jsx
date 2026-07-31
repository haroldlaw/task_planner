import TaskItem from "./TaskItem";

export default function TaskList({
  tasks,
  selectedTaskIds,
  onSelectTask,
  onSelectAll,
  onBulkMarkDone,
  onBulkUnmarkDone,
  onBulkDelete,
  onToggle,
  onDelete,
  onEdit,
  loading,
}) {
  if (loading) {
    return <div className="empty-state">loading tasks…</div>;
  }

  if (tasks.length === 0) {
    return (
      <div className="empty-state">
        no tasks match these filters
      </div>
    );
  }

  const allSelected = tasks.length > 0 && tasks.every((task) => selectedTaskIds.includes(task.id));

  return (
    <div className="task-list">
      <div className="bulk-actions">
        <label className="bulk-select-label">
          <input type="checkbox" checked={allSelected} onChange={onSelectAll} />
          Select all
        </label>
        <button className="btn-secondary" type="button" onClick={onBulkMarkDone} disabled={selectedTaskIds.length === 0}>
          Mark done
        </button>
        <button className="btn-secondary" type="button" onClick={onBulkUnmarkDone} disabled={selectedTaskIds.length === 0}>
          Unmark done
        </button>
        <button className="btn-secondary danger" type="button" onClick={onBulkDelete} disabled={selectedTaskIds.length === 0}>
          Delete selected
        </button>
      </div>
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          selected={selectedTaskIds.includes(task.id)}
          onSelect={onSelectTask}
          onToggle={onToggle}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}