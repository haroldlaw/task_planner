import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./context/AuthContext";
import { api } from "./api";
import Login from "./components/Login";
import Register from "./components/Register";
import TaskForm from "./components/TaskForm";
import TaskList from "./components/TaskList";
import FilterBar from "./components/FilterBar";
import StatsView from "./components/StatsView";

function isOverdueTask(task) {
  if (!task.due_date || task.status === "done") return false;
  return new Date(task.due_date) < new Date();
}

function isTodoTask(task) {
  return task.status !== "done" && !isOverdueTask(task);
}

function getTaskCounts(taskList) {
  return taskList.reduce(
    (counts, task) => {
      if (task.status === "done") {
        counts.done += 1;
      } else if (!isOverdueTask(task)) {
        counts.todo += 1;
      }

      if (isOverdueTask(task)) {
        counts.overdue += 1;
      }

      return counts;
    },
    { todo: 0, overdue: 0, done: 0 }
  );
}

export default function App() {
  const { user, loading: authLoading, logout } = useAuth();
  const [authView, setAuthView] = useState("login");

  const [allTasks, setAllTasks] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [tags, setTags] = useState([]);
  const [stats, setStats] = useState(null);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [editingTask, setEditingTask] = useState(null); 
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
      const requestFilters = { ...filters };
      delete requestFilters.status;

      const data = await api.listTasks(requestFilters);
      setAllTasks(data);
      setTasks(applyTaskFilter(data));
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
    setTasks(applyTaskFilter(allTasks));
  }, [allTasks, filters.status]);

  useEffect(() => {
    if (!user) return;
    loadTags();
    loadStats();
  }, [user, loadTags, loadStats]);

  function applyTaskFilter(nextTasks) {
    const status = filters.status;

    if (status === "todo") {
      return nextTasks.filter((task) => isTodoTask(task));
    }

    if (status === "done") {
      return nextTasks.filter((task) => task.status === "done");
    }

    if (status === "overdue") {
      return nextTasks.filter((task) => isOverdueTask(task));
    }

    return nextTasks;
  }

  function handleTaskCreated(task, replaceId, errorMessage) {
    if (errorMessage) {
      setAllTasks((prev) => prev.filter((t) => !String(t.id).startsWith("temp-")));
      setTasks((prev) => prev.filter((t) => !String(t.id).startsWith("temp-")));
      alert(`Could not save task: ${errorMessage}`);
      return;
    }

    setAllTasks((prev) => {
      const updatedTasks = replaceId
        ? prev.map((t) => (t.id === replaceId ? task : t))
        : [task, ...prev];

      setTasks(applyTaskFilter(updatedTasks));
      return updatedTasks;
    });

    if (replaceId) {
      loadStats();
    }
  }

  function handleTaskUpdated(updatedTask) {
    const updatedTasks = allTasks.map((t) => (t.id === updatedTask.id ? updatedTask : t));
    setAllTasks(updatedTasks);
    setTasks(applyTaskFilter(updatedTasks));
    setEditingTask(null);
    loadStats();
  }

  async function handleToggle(task) {
    const previous = allTasks;
    const nowDone = task.status !== "done";
    const optimisticUpdated = allTasks.map((t) =>
      t.id === task.id
        ? { ...t, status: nowDone ? "done" : "todo", completed_at: nowDone ? new Date().toISOString() : null }
        : t
    );
    setAllTasks(optimisticUpdated);
    setTasks(applyTaskFilter(optimisticUpdated));
    try {
      const updated = await api.toggleComplete(task.id);
      const refreshedTasks = allTasks.map((t) => (t.id === task.id ? updated : t));
      setAllTasks(refreshedTasks);
      setTasks(applyTaskFilter(refreshedTasks));
      loadStats();
    } catch (err) {
      setAllTasks(previous);
      setTasks(applyTaskFilter(previous));
      alert(`Could not update task: ${err.message}`);
    }
  }

  async function handleDelete(task) {
    const previousAllTasks = allTasks;
    const previousTags = tags;
    const deletedTaskTagIds = (task.tags || []).map((t) => t.id);
    const remainingTasks = allTasks.filter((t) => t.id !== task.id);
    setAllTasks(remainingTasks);
    setTasks(applyTaskFilter(remainingTasks));
    if (editingTask?.id === task.id) setEditingTask(null);

    try {
      await api.deleteTask(task.id);
      loadStats();

      const tagsToRemove = deletedTaskTagIds.filter(
        (tagId) => !remainingTasks.some((t) => t.tags?.some((tag) => tag.id === tagId))
      );

      for (const tagId of tagsToRemove) {
        await api.deleteTag(tagId);
      }

      if (tagsToRemove.length > 0) {
        setTags((prev) => prev.filter((t) => !tagsToRemove.includes(t.id)));
      }
    } catch (err) {
      setAllTasks(previousAllTasks);
      setTasks(applyTaskFilter(previousAllTasks));
      setTags(previousTags);
      alert(`Could not delete task: ${err.message}`);
    }
  }

  async function handleDeleteTag(tagId) {
    if (!window.confirm("Delete this tag? It will be removed from any tasks using it.")) return;
    const previous = tags;
    setTags((prev) => prev.filter((t) => t.id !== tagId));
    try {
      await api.deleteTag(tagId);
    } catch (err) {
      setTags(previous);
      alert(`Could not delete tag: ${err.message}`);
    }
  }

  const taskCountByStatus = getTaskCounts(allTasks);

  const unusedTags = tags.filter(
    (tag) => !allTasks.some((task) => task.tags?.some((t) => t.id === tag.id))
  );

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

      <StatsView stats={stats} tasks={allTasks} />

      <div className="main-grid">
        <FilterBar
          filters={filters}
          setFilters={setFilters}
          tags={tags}
          taskCountByStatus={taskCountByStatus}
          unusedTags={unusedTags}
          onDeleteTag={handleDeleteTag}
        />
        <div>
          <TaskForm
            tags={tags}
            onTagsChanged={loadTags}
            onCreated={handleTaskCreated}
            editingTask={editingTask}
            onUpdated={handleTaskUpdated}
            onCancelEdit={() => setEditingTask(null)}
          />
          <TaskList tasks={tasks} onToggle={handleToggle} onDelete={handleDelete} onEdit={setEditingTask} loading={tasksLoading} />
        </div>
      </div>
    </div>
  );
}