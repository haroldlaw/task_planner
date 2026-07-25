import { useState, useMemo } from "react";
import { useAuth } from "./context/AuthContext";
import Login from "./components/Login";
import Register from "./components/Register";
import TaskForm from "./components/TaskForm";
import TaskList from "./components/TaskList";
import FilterBar from "./components/FilterBar";
import StatsView from "./components/StatsView";

const SEED_TASKS = [
  {
    id: 1,
    title: "Finish resume",
    description: "Tailor it for backend roles",
    due_date: new Date(Date.now() + 2 * 86400000).toISOString(),
    priority: "high",
    status: "todo",
    created_at: new Date().toISOString(),
    completed_at: null,
    tags: [{ id: 1, name: "job-search" }],
  },
  {
    id: 2,
    title: "Set up Postgres",
    description: null,
    due_date: new Date(Date.now() - 86400000).toISOString(), // overdue on purpose
    priority: "medium",
    status: "todo",
    created_at: new Date().toISOString(),
    completed_at: null,
    tags: [{ id: 2, name: "project" }],
  },
  {
    id: 3,
    title: "Read React docs on useEffect",
    description: null,
    due_date: null,
    priority: "low",
    status: "done",
    created_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    tags: [],
  },
];

const SEED_TAGS = [
  { id: 1, name: "job-search" },
  { id: 2, name: "project" },
];

export default function App() {
  const { user, loading: authLoading, logout } = useAuth();
  const [authView, setAuthView] = useState("login");

  const [tasks, setTasks] = useState(SEED_TASKS);
  const [tags, setTags] = useState(SEED_TAGS);
  const [filters, setFilters] = useState({
    status: undefined,
    priority: undefined,
    tag_id: undefined,
    sort_by: "created_at",
    order: "desc",
  });

  // MOCK VERSION: filtering/sorting happens client-side with useMemo,
  // instead of sending query params to api.listTasks().
  const filteredTasks = useMemo(() => {
    let result = [...tasks];
    if (filters.status) result = result.filter((t) => t.status === filters.status);
    if (filters.priority) result = result.filter((t) => t.priority === filters.priority);
    if (filters.tag_id) result = result.filter((t) => t.tags.some((tag) => tag.id === filters.tag_id));

    result.sort((a, b) => {
      const field = filters.sort_by;
      let av = a[field];
      let bv = b[field];
      if (field === "priority") {
        const order = { low: 0, medium: 1, high: 2 };
        av = order[av];
        bv = order[bv];
      }
      if (av < bv) return filters.order === "asc" ? -1 : 1;
      if (av > bv) return filters.order === "asc" ? 1 : -1;
      return 0;
    });
    return result;
  }, [tasks, filters]);

  // MOCK VERSION: stats computed locally instead of fetched from /stats.
  const stats = useMemo(() => {
    const total = tasks.length;
    const now = new Date();
    const weekAgo = new Date(now - 7 * 86400000);

    const completedThisWeek = tasks.filter(
      (t) => t.completed_at && new Date(t.completed_at) >= weekAgo
    ).length;
    const overdue = tasks.filter(
      (t) => t.due_date && new Date(t.due_date) < now && t.status !== "done"
    ).length;
    const done = tasks.filter((t) => t.status === "done").length;
    const completionRate = total ? Math.round((done / total) * 1000) / 10 : 0;

    const statusBreakdown = { todo: 0, in_progress: 0, done: 0 };
    const priorityBreakdown = { low: 0, medium: 0, high: 0 };
    tasks.forEach((t) => {
      statusBreakdown[t.status]++;
      priorityBreakdown[t.priority]++;
    });

    return {
      total_tasks: total,
      completed_this_week: completedThisWeek,
      overdue_count: overdue,
      completion_rate: completionRate,
      status_breakdown: statusBreakdown,
      priority_breakdown: priorityBreakdown,
    };
  }, [tasks]);

  function handleTaskCreated(newTask) {
    setTasks((prev) => [newTask, ...prev]);
  }

  function handleTagsChanged(newTags) {
    setTags((prev) => [...prev, ...newTags]);
  }

  function handleToggle(task) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              status: t.status === "done" ? "todo" : "done",
              completed_at: t.status === "done" ? null : new Date().toISOString(),
            }
          : t
      )
    );
  }

  function handleDelete(task) {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
  }

  if (authLoading) return null;

  /*if (!user) {
    return authView === "login" ? (
      <Login onSwitch={() => setAuthView("register")} />
    ) : (
      <Register onSwitch={() => setAuthView("login")} />
    );
  }*/

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>
          <span className="ledger-mark" />
          Ledger
        </h1>
        <div className="user-bar">
          <span>{user?.username || "harold"}</span>
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
          taskCountByStatus={stats.status_breakdown}
        />
        <div>
          <TaskForm tags={tags} onTagsChanged={handleTagsChanged} onCreated={handleTaskCreated} />
          <TaskList tasks={filteredTasks} onToggle={handleToggle} onDelete={handleDelete} loading={false} />
        </div>
      </div>
    </div>
  );
}