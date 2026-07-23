import TaskItem from "./TaskItem";

export default function TaskList({ tasks, onToggle, onDelete, loading }) {
  if (loading) {
    return <div className="empty-state">loading tasks…</div>;
  }

  if (tasks.length === 0) {
    return (
      <div className="empty-state">
        no tasks match these filters — add one above, or clear a filter
      </div>
    );
  }

  return (
    <div className="task-list">
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} />
      ))}
    </div>
  );
}