const STATUSES = [
  { value: undefined, label: "All tasks" },
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
];

const PRIORITIES = [
  { value: undefined, label: "All priorities" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const SORTS = [
  { value: "created_at", label: "Date created" },
  { value: "due_date", label: "Due date" },
  { value: "priority", label: "Priority" },
  { value: "title", label: "Title" },
];

export default function FilterBar({ filters, setFilters, tags, taskCountByStatus, unusedTags, onDeleteTag }) {
  return (
    <div className="sidebar">
      <div className="card sidebar-section">
        <h3>Status</h3>
        <div className="filter-group">
          {STATUSES.map((s) => (
            <button
              key={s.label}
              className={`filter-option ${filters.status === s.value ? "active" : ""}`}
              onClick={() => setFilters((f) => ({ ...f, status: s.value }))}
            >
              <span>{s.label}</span>
              {s.value && <span className="count">{taskCountByStatus?.[s.value] ?? 0}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="card sidebar-section">
        <h3>Priority</h3>
        <div className="filter-group">
          {PRIORITIES.map((p) => (
            <button
              key={p.label}
              className={`filter-option ${filters.priority === p.value ? "active" : ""}`}
              onClick={() => setFilters((f) => ({ ...f, priority: p.value }))}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {tags.length > 0 && (
        <div className="card sidebar-section">
          <h3>Tags</h3>
          <div className="filter-group">
            <button
              className={`filter-option ${!filters.tag_id ? "active" : ""}`}
              onClick={() => setFilters((f) => ({ ...f, tag_id: undefined }))}
            >
              All tags
            </button>
            {tags.map((tag) => (
              <button
                key={tag.id}
                className={`filter-option ${filters.tag_id === tag.id ? "active" : ""}`}
                onClick={() => setFilters((f) => ({ ...f, tag_id: tag.id }))}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card sidebar-section">
        <h3>Sort by</h3>
        <div className="filter-group">
          <select
            value={filters.sort_by}
            onChange={(e) => setFilters((f) => ({ ...f, sort_by: e.target.value }))}
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            value={filters.order}
            onChange={(e) => setFilters((f) => ({ ...f, order: e.target.value }))}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
      </div>
    </div>
  );
}