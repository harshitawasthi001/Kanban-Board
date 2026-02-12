import {
  useState,
  useEffect,
  useRef,
  useCallback,
  createContext,
  useContext,
  useReducer,
} from "react";

// ─── DESIGN SYSTEM ──────────────────────────────────────────────────────────
const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');
`;

const STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0e0f11;
    --surface: #161719;
    --surface2: #1e2023;
    --border: #2a2c30;
    --border-bright: #3a3d42;
    --text: #e8e9eb;
    --text-muted: #7a7d82;
    --text-faint: #45474c;
    --accent: #6ee7b7;
    --accent-dim: rgba(110,231,183,0.12);
    --accent-glow: rgba(110,231,183,0.25);
    --todo: #818cf8;
    --todo-dim: rgba(129,140,248,0.12);
    --progress: #fb923c;
    --progress-dim: rgba(251,146,60,0.12);
    --done: #6ee7b7;
    --done-dim: rgba(110,231,183,0.12);
    --danger: #f87171;
    --danger-dim: rgba(248,113,113,0.12);
  }
  html, body, #root { height: 100%; width: 100%; background: var(--bg); overflow: hidden; }
  body { font-family: 'DM Sans', sans-serif; color: var(--text); }
  h1,h2,h3,h4 { font-family: 'Syne', sans-serif; }

  .noise::after {
    content: '';
    position: fixed; inset: 0; pointer-events: none; z-index: 9999;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
    opacity: 0.35;
  }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

  /* Animations */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes toastIn {
    from { opacity: 0; transform: translateX(120%); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes toastOut {
    from { opacity: 1; transform: translateX(0); }
    to   { opacity: 0; transform: translateX(120%); }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes pulse {
    0%,100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  .fade-up { animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both; }
  .fade-in { animation: fadeIn 0.3s ease both; }

  /* Dragging */
  .dragging { opacity: 0.4; transform: scale(0.97); }
  .drag-over { outline: 2px dashed var(--accent); outline-offset: 4px; border-radius: 12px; }
`;

//  MOCK API
const mockApi = {
  call: (action) =>
    new Promise((resolve, reject) => {
      const delay = 1000 + Math.random() * 1000; // 1–2s
      setTimeout(() => {
        if (Math.random() < 0.2) {
          reject(new Error(`Failed to ${action}. Please try again.`));
        } else {
          resolve({ success: true });
        }
      }, delay);
    }),
};

//  INITIAL DATA
const INITIAL_TASKS = [
  {
    id: "t1",
    title: "Excercise 1 hour",
    description: "List all deliverables and timelines",
    column: "todo",
    createdAt: Date.now() - 86400000,
  },
  {
    id: "t2",
    title: "Read book 30 minute",
    description: "Review current component library",
    column: "todo",
    createdAt: Date.now() - 43200000,
  },
  {
    id: "t3",
    title: "2 DSA problems solve",
    description: "Connect backend endpoints to frontend",
    column: "progress",
    createdAt: Date.now() - 72000000,
  },
  {
    id: "t4",
    title: "30 min meditation",
    description: "Mobile-first breakpoints across all pages",
    column: "progress",
    createdAt: Date.now() - 36000000,
  },
  {
    id: "t5",
    title: "Apply 5 Job application",
    description: "Login, register, and token management",
    column: "done",
    createdAt: Date.now() - 100000000,
  },
];

const COLUMNS = [
  { id: "todo", label: "To Do", color: "var(--todo)", dim: "var(--todo-dim)" },
  {
    id: "progress",
    label: "In Progress",
    color: "var(--progress)",
    dim: "var(--progress-dim)",
  },
  { id: "done", label: "Done", color: "var(--done)", dim: "var(--done-dim)" },
];

//  STATE MANAGEMENT (Reducer)
function tasksReducer(state, action) {
  switch (action.type) {
    case "ADD_OPTIMISTIC":
      return [action.task, ...state];
    case "MOVE_OPTIMISTIC":
      return state.map((t) =>
        t.id === action.taskId ? { ...t, column: action.toColumn } : t,
      );
    case "DELETE_OPTIMISTIC":
      return state.filter((t) => t.id !== action.taskId);
    case "ROLLBACK":
      return action.snapshot;
    default:
      return state;
  }
}

//  CONTEXT
const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

//  TOAST SYSTEM
function ToastContainer({ toasts, dismiss }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        alignItems: "flex-end",
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => dismiss(t.id)}
          style={{
            background: t.type === "error" ? "#1a1010" : "#0f1a14",
            border: `1px solid ${t.type === "error" ? "var(--danger)" : "var(--accent)"}`,
            borderRadius: 10,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
            maxWidth: 320,
            minWidth: 240,
            animation: t.leaving
              ? "toastOut 0.3s cubic-bezier(0.4,0,1,1) both"
              : "toastIn 0.35s cubic-bezier(0.16,1,0.3,1) both",
            boxShadow:
              t.type === "error"
                ? "0 4px 20px rgba(248,113,113,0.15)"
                : "0 4px 20px rgba(110,231,183,0.1)",
          }}
        >
          <span style={{ fontSize: 16 }}>{t.type === "error" ? "✕" : "✓"}</span>
          <div>
            <div
              style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 600,
                fontSize: 12,
                color: t.type === "error" ? "var(--danger)" : "var(--accent)",
                marginBottom: 2,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {t.type === "error" ? "Error" : "Success"}
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
                lineHeight: 1.4,
              }}
            >
              {t.message}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function useToasts() {
  const [toasts, setToasts] = useState([]);
  const dismiss = useCallback((id) => {
    setToasts((ts) =>
      ts.map((t) => (t.id === id ? { ...t, leaving: true } : t)),
    );
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 350);
  }, []);
  const add = useCallback(
    (message, type = "success") => {
      const id = Math.random().toString(36).slice(2);
      setToasts((ts) => [...ts, { id, message, type }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );
  return { toasts, add, dismiss };
}

//  TASK CARD
function TaskCard({ task, index, colColor }) {
  const { dispatch, pendingIds, toast } = useApp();
  const [dragging, setDragging] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isPending = pendingIds.has(task.id);

  const handleDragStart = (e) => {
    e.dataTransfer.setData("taskId", task.id);
    e.dataTransfer.setData("fromColumn", task.column);
    setDragging(true);
  };
  const handleDragEnd = () => setDragging(false);

  const handleDelete = async () => {
    const snapshot = null; // captured in dispatch
    dispatch({ type: "_CAPTURE_SNAPSHOT" }); // handled externally via ref
    dispatch({ type: "DELETE_OPTIMISTIC", taskId: task.id, _snapshot: true });
    try {
      await mockApi.call("delete task");
      toast.add("Task deleted successfully.");
    } catch (err) {
      dispatch({ type: "ROLLBACK_BY_ID", taskId: task.id, task });
      toast.add(err.message, "error");
    }
  };

  const timeAgo = (ts) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <div
      draggable={!isPending}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={dragging ? "dragging" : ""}
      style={{
        background: dragging ? "var(--surface2)" : "var(--surface)",
        border: `1px solid ${isPending ? colColor : "var(--border)"}`,
        borderRadius: 10,
        padding: "12px 14px",
        cursor: isPending ? "not-allowed" : "grab",
        transition: "all 0.2s ease",
        position: "relative",
        overflow: "hidden",
        animation: `fadeUp 0.35s ${index * 0.05}s cubic-bezier(0.16,1,0.3,1) both`,
        opacity: isPending ? 0.65 : 1,
      }}
      onMouseEnter={(e) => {
        if (!isPending)
          e.currentTarget.style.borderColor = "var(--border-bright)";
      }}
      onMouseLeave={(e) => {
        if (!isPending) e.currentTarget.style.borderColor = "var(--border)";
      }}
    >
      {isPending && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${colColor}, transparent)`,
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s infinite linear",
          }}
        />
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 8,
        }}
      >
        <p
          style={{
            fontSize: 13.5,
            fontWeight: 500,
            lineHeight: 1.45,
            color: isPending ? "var(--text-muted)" : "var(--text)",
            flex: 1,
          }}
        >
          {task.title}
        </p>

        {!isPending && (
          <button
            onClick={() => setConfirmDelete((c) => !c)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-faint)",
              fontSize: 15,
              lineHeight: 1,
              padding: "0 2px",
              flexShrink: 0,
              transition: "color 0.15s",
              fontFamily: "monospace",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--danger)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--text-faint)")
            }
          >
            ✕
          </button>
        )}

        {isPending && (
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              border: `2px solid ${colColor}`,
              borderTopColor: "transparent",
              animation: "spin 0.8s linear infinite",
              flexShrink: 0,
            }}
          />
        )}
      </div>

      {task.description && (
        <p
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            marginTop: 6,
            lineHeight: 1.5,
          }}
        >
          {task.description}
        </p>
      )}

      <div
        style={{
          marginTop: 10,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 11, color: "var(--text-faint)" }}>
          {timeAgo(task.createdAt)}
        </span>
        {isPending && (
          <span
            style={{
              fontSize: 11,
              color: colColor,
              animation: "pulse 1s infinite",
            }}
          >
            saving…
          </span>
        )}
      </div>

      {confirmDelete && !isPending && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(14,15,17,0.92)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            borderRadius: 10,
            animation: "fadeIn 0.15s ease",
            backdropFilter: "blur(4px)",
          }}
        >
          <p
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              textAlign: "center",
            }}
          >
            Delete this task?
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => {
                setConfirmDelete(false);
                handleDelete();
              }}
              style={{
                background: "var(--danger-dim)",
                border: "1px solid var(--danger)",
                color: "var(--danger)",
                borderRadius: 6,
                padding: "5px 12px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'Syne', sans-serif",
              }}
            >
              Delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              style={{
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
                borderRadius: 6,
                padding: "5px 12px",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

//  COLUMN
function Column({ col, tasks }) {
  const { dispatch, pendingIds, toast } = useApp();
  const [dragOver, setDragOver] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (addOpen) inputRef.current?.focus();
  }, [addOpen]);

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const taskId = e.dataTransfer.getData("taskId");
    const fromColumn = e.dataTransfer.getData("fromColumn");
    if (!taskId || fromColumn === col.id) return;

    dispatch({ type: "MOVE_OPTIMISTIC", taskId, toColumn: col.id, fromColumn });
    try {
      await mockApi.call("move task");
    } catch (err) {
      dispatch({ type: "ROLLBACK_MOVE", taskId, toColumn: fromColumn });
      toast.add(err.message, "error");
    }
  };

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    const tempId = "temp_" + Date.now();
    const newTask = {
      id: tempId,
      title: newTitle.trim(),
      description: newDesc.trim(),
      column: "todo",
      createdAt: Date.now(),
    };
    setNewTitle("");
    setNewDesc("");
    setAddOpen(false);
    dispatch({ type: "ADD_OPTIMISTIC", task: { ...newTask } });
    dispatch({ type: "ADD_PENDING", taskId: tempId });
    try {
      await mockApi.call("add task");
      const realId = "task_" + Date.now();
      dispatch({ type: "CONFIRM_ADD", tempId, realId });
      toast.add("Task added.");
    } catch (err) {
      dispatch({ type: "ROLLBACK_ADD", taskId: tempId });
      toast.add(err.message, "error");
    }
  };

  return (
    <div
      style={{
        flex: "1 1 0",
        minWidth: 0,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        background: "var(--surface)",
        borderRadius: 14,
        border: `1px solid ${dragOver ? col.color : "var(--border)"}`,
        transition: "border-color 0.2s, box-shadow 0.2s",
        boxShadow: dragOver ? `0 0 0 2px ${col.color}22` : "none",
        overflow: "hidden",
      }}
    >
      {/* Column Header */}
      <div
        style={{
          padding: "14px 16px 12px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: col.color,
              boxShadow: `0 0 8px ${col.color}88`,
              flexShrink: 0,
            }}
          />
          <h3
            style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            {col.label}
          </h3>
          <span
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: 20,
              padding: "1px 8px",
              fontSize: 11,
              color: "var(--text-faint)",
              fontFamily: "'Syne', sans-serif",
              fontWeight: 600,
            }}
          >
            {tasks.length}
          </span>
        </div>
        {col.id === "todo" && (
          <button
            onClick={() => setAddOpen((o) => !o)}
            style={{
              background: addOpen ? "var(--accent-dim)" : "transparent",
              border: `1px solid ${addOpen ? "var(--accent)" : "var(--border)"}`,
              borderRadius: 6,
              width: 26,
              height: 26,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: addOpen ? "var(--accent)" : "var(--text-faint)",
              fontSize: 18,
              lineHeight: 1,
              transition: "all 0.2s",
            }}
          >
            +
          </button>
        )}
      </div>

      {col.id === "todo" && addOpen && (
        <div
          style={{
            padding: "12px 14px",
            borderBottom: "1px solid var(--border)",
            animation: "slideDown 0.2s ease",
          }}
        >
          <input
            ref={inputRef}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Task title…"
            style={{
              width: "100%",
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: 7,
              padding: "8px 10px",
              color: "var(--text)",
              fontSize: 13,
              outline: "none",
              marginBottom: 6,
              fontFamily: "'DM Sans', sans-serif",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
          <textarea
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional)…"
            rows={2}
            style={{
              width: "100%",
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: 7,
              padding: "8px 10px",
              color: "var(--text)",
              fontSize: 12,
              outline: "none",
              resize: "none",
              fontFamily: "'DM Sans', sans-serif",
              color: "var(--text-muted)",
              marginBottom: 8,
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={handleAdd}
              disabled={!newTitle.trim()}
              style={{
                flex: 1,
                background: newTitle.trim()
                  ? "var(--accent)"
                  : "var(--surface2)",
                border: "none",
                borderRadius: 7,
                padding: "7px 0",
                color: newTitle.trim() ? "#0e0f11" : "var(--text-faint)",
                fontSize: 12,
                fontWeight: 700,
                cursor: newTitle.trim() ? "pointer" : "not-allowed",
                fontFamily: "'Syne', sans-serif",
                letterSpacing: "0.04em",
                transition: "all 0.15s",
              }}
            >
              Add Task
            </button>
            <button
              onClick={() => {
                setAddOpen(false);
                setNewTitle("");
                setNewDesc("");
              }}
              style={{
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: 7,
                padding: "7px 10px",
                color: "var(--text-muted)",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          flex: 1,
          minHeight: 0,
          padding: "12px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          overflowY: "auto",
        }}
      >
        {tasks.length === 0 && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-faint)",
              fontSize: 12,
              gap: 6,
              padding: "24px 0",
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <path d="M9 12h6M12 9v6" />
            </svg>
            <span>Drop tasks here</span>
          </div>
        )}
        {tasks.map((t, i) => (
          <TaskCard key={t.id} task={t} index={i} colColor={col.color} />
        ))}
      </div>
    </div>
  );
}

//  BOARD
function Board({ user, onLogout }) {
  const { tasks } = useApp();

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          padding: "0 24px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--surface)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "linear-gradient(135deg, var(--accent), var(--todo))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0e0f11"
              strokeWidth="2.5"
            >
              <rect x="3" y="3" width="5" height="18" rx="1" />
              <rect x="10" y="3" width="5" height="12" rx="1" />
              <rect x="17" y="3" width="5" height="15" rx="1" />
            </svg>
          </div>
          <span
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800,
              fontSize: 15,
              letterSpacing: "-0.01em",
            }}
          >
            Kanban<span style={{ color: "var(--accent)" }}>.</span>
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "5px 10px",
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                background:
                  "linear-gradient(135deg, var(--todo), var(--accent))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 700,
                color: "#0e0f11",
              }}
            >
              {user[0].toUpperCase()}
            </div>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {user}
            </span>
          </div>
          <button
            onClick={onLogout}
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: 7,
              padding: "5px 10px",
              color: "var(--text-faint)",
              fontSize: 12,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--danger)";
              e.currentTarget.style.borderColor = "var(--danger)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-faint)";
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <main
        style={{
          flex: 1,
          padding: "24px",
          display: "flex",
          gap: 16,
          alignItems: "stretch",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        {COLUMNS.map((col) => (
          <Column
            key={col.id}
            col={col}
            tasks={tasks.filter((t) => t.column === col.id)}
          />
        ))}
      </main>
    </div>
  );
}

//  LOGIN
function Login({ onLogin }) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!value.trim()) {
      setError("Please enter a username or email.");
      return;
    }
    setLoading(true);
    setError("");
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    onLogin(value.trim());
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background:
          "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(110,231,183,0.06) 0%, transparent 70%), var(--bg)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          animation: "fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both",
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background:
                "linear-gradient(135deg, rgba(110,231,183,0.2), rgba(129,140,248,0.2))",
              border: "1px solid var(--border)",
              margin: "0 auto 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="5" height="18" rx="1" />
              <rect x="10" y="3" width="5" height="12" rx="1" />
              <rect x="17" y="3" width="5" height="15" rx="1" />
            </svg>
          </div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "var(--text)",
            }}
          >
            Welcome back<span style={{ color: "var(--accent)" }}>.</span>
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 6 }}>
            Sign in to access your board
          </p>
        </div>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: 24,
            boxShadow: "0 24px 48px rgba(0,0,0,0.4)",
          }}
        >
          <label
            style={{
              display: "block",
              marginBottom: 6,
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-muted)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Username or Email
          </label>
          <input
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="e.g. alex@company.io"
            style={{
              width: "100%",
              background: "var(--surface2)",
              border: `1px solid ${error ? "var(--danger)" : "var(--border)"}`,
              borderRadius: 8,
              padding: "10px 12px",
              color: "var(--text)",
              fontSize: 14,
              outline: "none",
              fontFamily: "'DM Sans', sans-serif",
              transition: "border-color 0.2s",
              marginBottom: error ? 6 : 16,
            }}
            onFocus={(e) =>
              (e.target.style.borderColor = error
                ? "var(--danger)"
                : "var(--accent)")
            }
            onBlur={(e) =>
              (e.target.style.borderColor = error
                ? "var(--danger)"
                : "var(--border)")
            }
          />
          {error && (
            <p
              style={{ fontSize: 12, color: "var(--danger)", marginBottom: 12 }}
            >
              {error}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: "100%",
              background: loading ? "var(--surface2)" : "var(--accent)",
              border: "none",
              borderRadius: 8,
              padding: "11px 0",
              color: loading ? "var(--text-muted)" : "#0e0f11",
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "'Syne', sans-serif",
              letterSpacing: "0.04em",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 0.2s",
            }}
          >
            {loading && (
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  border: "2px solid var(--text-muted)",
                  borderTopColor: "transparent",
                  animation: "spin 0.7s linear infinite",
                }}
              />
            )}
            {loading ? "Signing in…" : "Sign In →"}
          </button>

          <p
            style={{
              textAlign: "center",
              marginTop: 14,
              fontSize: 12,
              color: "var(--text-faint)",
            }}
          >
            Any non-empty input will work — no password needed
          </p>
        </div>
      </div>
    </div>
  );
}

//  ROOT APP
export default function App() {
  const [user, setUser] = useState(
    () => localStorage.getItem("kb_user") || null,
  );

  // ── Tasks state with full reducer
  const snapshotRef = useRef(INITIAL_TASKS);
  const [tasks, dispatch_] = useReducer((state, action) => {
    switch (action.type) {
      case "ADD_OPTIMISTIC":
        snapshotRef.current = state;
        return [action.task, ...state];
      case "MOVE_OPTIMISTIC":
        snapshotRef.current = state;
        return state.map((t) =>
          t.id === action.taskId ? { ...t, column: action.toColumn } : t,
        );
      case "DELETE_OPTIMISTIC":
        snapshotRef.current = state;
        return state.filter((t) => t.id !== action.taskId);
      case "ADD_PENDING":
        return state; // handled via pendingIds
      case "CONFIRM_ADD":
        return state.map((t) =>
          t.id === action.tempId ? { ...t, id: action.realId } : t,
        );
      case "ROLLBACK_ADD":
        return state.filter((t) => t.id !== action.taskId);
      case "ROLLBACK_MOVE":
        return state.map((t) =>
          t.id === action.taskId ? { ...t, column: action.toColumn } : t,
        );
      case "ROLLBACK_BY_ID": {
        // re-insert the deleted task
        const snap = snapshotRef.current;
        const snapTask = snap.find((t) => t.id === action.taskId);
        if (!snapTask) return state;
        const idx = snap.indexOf(snapTask);
        const next = [...state];
        next.splice(idx, 0, snapTask);
        return next;
      }
      default:
        return state;
    }
  }, INITIAL_TASKS);

  const [pendingIds, setPendingIds] = useState(new Set());
  const toast = useToasts();

  const dispatch = useCallback((action) => {
    if (action.type === "ADD_PENDING") {
      setPendingIds((s) => new Set([...s, action.taskId]));
    } else if (
      action.type === "CONFIRM_ADD" ||
      action.type === "ROLLBACK_ADD"
    ) {
      setPendingIds((s) => {
        const n = new Set(s);
        n.delete(action.tempId || action.taskId);
        return n;
      });
      dispatch_(action);
    } else {
      dispatch_(action);
    }
  }, []);

  const handleLogin = (u) => {
    localStorage.setItem("kb_user", u);
    setUser(u);
  };
  const handleLogout = () => {
    localStorage.removeItem("kb_user");
    setUser(null);
  };

  return (
    <>
      <style>{FONTS + STYLES}</style>
      <div
        className="noise"
        style={{ height: "100%", display: "flex", flexDirection: "column" }}
      >
        <AppCtx.Provider value={{ tasks, dispatch, pendingIds, toast }}>
          {user ? (
            <Board user={user} onLogout={handleLogout} />
          ) : (
            <Login onLogin={handleLogin} />
          )}
          <ToastContainer toasts={toast.toasts} dismiss={toast.dismiss} />
        </AppCtx.Provider>
      </div>
    </>
  );
}
