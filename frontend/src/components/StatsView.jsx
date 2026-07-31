import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from "recharts";

const STATUS_COLORS = {
  todo: "#9aa0ac",
  overdue: "#b23a2e",
  done: "#3c7a5b",
};

const PRIORITY_COLORS = {
  low: "#3c7a5b",
  medium: "#a8701a",
  high: "#b23a2e",
};

const STATUS_LABELS = { todo: "To do", overdue: "Overdue", done: "Done" };

function isOverdueTask(task) {
  if (!task.due_date || task.status === "done") return false;
  return new Date(task.due_date) < new Date();
}

export default function StatsView({ stats, tasks = [] }) {
  if (!stats) return null;

  const statusBreakdown = {
    todo: tasks.filter((task) => task.status !== "done" && !isOverdueTask(task)).length,
    overdue: tasks.filter(isOverdueTask).length,
    done: tasks.filter((task) => task.status === "done").length,
  };

  const statusData = Object.entries(statusBreakdown).map(([key, value]) => ({
    name: STATUS_LABELS[key] || key,
    value,
    key,
  }));

  const priorityData = Object.entries(stats.priority_breakdown).map(([key, value]) => ({
    name: key,
    value,
    key,
  }));

  return (
    <div>
      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-label">Total tasks</div>
          <div className="stat-value">{stats.total_tasks}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Completed this week</div>
          <div className="stat-value">{stats.completed_this_week}</div>
        </div>
        <div className="card stat-card overdue">
          <div className="stat-label">Overdue</div>
          <div className="stat-value">{stats.overdue_count}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Completion rate</div>
          <div className="stat-value">{stats.completion_rate}%</div>
        </div>
      </div>

      {stats.total_tasks > 0 && (
        <div className="charts-row">
          <div className="card chart-card">
            <h4>Task Status</h4>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={40}
                  outerRadius={65}
                  paddingAngle={2}
                >
                  {statusData.map((entry) => (
                    <Cell key={entry.key} fill={STATUS_COLORS[entry.key]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="card chart-card">
            <h4>Task Priority</h4>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={priorityData}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#5b6270" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#5b6270" }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {priorityData.map((entry) => (
                    <Cell key={entry.key} fill={PRIORITY_COLORS[entry.key]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}