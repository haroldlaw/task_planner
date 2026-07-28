import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./context/AuthContext";
import { api } from "./api";
import Login from "./components/Login";
import Register from "./components/Register";
import TaskForm from "./components/TaskForm";
import TaskList from "./components/TaskList";
import FilterBar from "./components/FilterBar";
import StatsView from "./components/StatsView";

export default function App() {
  const { user, loading: authLoading, logout } = useAuth();
  const [authView, setAuthView] = useState("login");

  const [tasks, setTasks] = useState([]);
  const [tags, setTags] = useState([]);
  const [stats, setStats] = useState(null);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: undefined,
    priority: undefined,
    tag_id: undefined,
    sort_by: "created_at",
    order: "desc",
  });

  const loadTasks = useCallback(async () => {
    setTasksLoading(true);
    try {
      const data = await api.listTasks(filters);
      setTasks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setTasksLoading(false);
    }
  }, [filters]);

  const loadTags = useCallback(async () => {
    const data = await api.listTags();
    setTags(data);
  }, []);

  const loadStats = useCallback(async () => {
    const data = await api.getStats();
    setStats(data);
  }, []);

  useEffect(() => {
    if (!user) return;
    loadTasks();
  }, [user, loadTasks]);

  useEffect(() => {
    if (!user) return;
    loadTags();
    loadStats();
  }, [user, loadTags, loadStats]);

  function handleTaskCreated(task, replaceId, errorMessage) {
    if (errorMessage) {
      setTasks((prev) => prev.filter((t) => !String(t.id).startsWith("temp-")));
      alert(`Could not save task: ${errorMessage}`);
      return;
    }
    if (replaceId) {
      setTasks((prev) => prev.map((t) => (t.id === replaceId ? task : t)));
      loadStats();
    } else {
      setTasks((prev) => [task, ...prev]);
    }
  }

  async function handleToggle(task) {
    const previous = tasks;
    const nowDone = task.status !== "done";
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? { ...t, status: nowDone ? "done" : "todo", completed_at: nowDone ? new Date().toISOString() : null }
          : t
      )
    );
    try {
      const updated = await api.toggleComplete(task.id);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
      loadStats();
    } catch (err) {
      setTasks(previous);
      alert(`Could not update task: ${err.message}`);
    }
  }

  async function handleDelete(task) {
    const previous = tasks;
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    try {
      await api.deleteTask(task.id);
      loadStats();
    } catch (err) {
      setTasks(previous);
      alert(`Could not delete task: ${err.message}`);
    }
  }

  if (authLoading) return null;

  if (!user) {
    return authView === "login" ? (
      <Login onSwitch={() => setAuthView("register")} />
    ) : (
      <Register onSwitch={() => setAuthView("login")} />
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>
          <span className="ledger-mark" />
          Task Planner
        </h1>
        <div className="user-bar">
          <span>{user.username}</span>
          <button className="link-button" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      <StatsView stats={stats} />

      <div className="main-grid">
        <FilterBar
          filters={filters}
          setFilters={setFilters}
          tags={tags}
          taskCountByStatus={stats?.status_breakdown}
        />
        <div>
          <TaskForm tags={tags} onTagsChanged={loadTags} onCreated={handleTaskCreated} />
          <TaskList tasks={tasks} onToggle={handleToggle} onDelete={handleDelete} loading={tasksLoading} />
        </div>
      </div>
    </div>
  );
}