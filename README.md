# Kanban Board — Regrip India Frontend Assignment

A production-quality Kanban board with Optimistic UI, state rollback, and mock async API simulation.

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18
- npm or yarn

### Setup

```bash
# 1. Create a new Vite + React project
npm create vite@latest kanban-board -- --template react
cd kanban-board

# 2. Install dependencies
npm install

# 3. Install Tailwind CSS (used for utilities in the project)
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# 4. Replace src/App.jsx with the provided kanban-board.jsx
cp path/to/kanban-board.jsx src/App.jsx

# 5. Run the dev server
npm run dev
```

The app will be available at `http://localhost:5173`.

### Build for Production

```bash
npm run build
npm run preview
```

---

## ✨ Features

| Feature | Status |
|---|---|
| Mock Auth (any non-empty input) | ✅ |
| Persistent login via localStorage | ✅ |
| Three-column Kanban (To Do / In Progress / Done) | ✅ |
| Add Task to "To Do" | ✅ |
| Drag & Drop between columns | ✅ |
| Delete Task with confirmation | ✅ |
| Optimistic UI (instant updates) | ✅ |
| 1–2s simulated API latency | ✅ |
| 20% random failure rate | ✅ |
| State rollback on failure | ✅ |
| Toast notifications (success + error) | ✅ |
| Pending state indicator (spinner + shimmer) | ✅ |

---

## 🧠 Optimistic UI Approach

### Core Pattern

Every mutating operation follows a **snapshot → optimistic update → async confirm/rollback** cycle:

```
1. Capture a snapshot of current state into a ref (snapshotRef)
2. Dispatch an "optimistic" action → UI updates instantly
3. Fire the mock API call in the background
4. On SUCCESS → confirm (finalize IDs, clear pending indicators)
5. On FAILURE → rollback (restore state from snapshot + show toast)
```

### State Architecture

The app uses a `useReducer` (rather than `useState`) so that complex state transitions — especially rollbacks — are atomic and predictable. A `snapshotRef` is updated **before** each optimistic mutation so it always holds the last-known-good state.

```js
// Before mutation
snapshotRef.current = state;

// Optimistic update (immediate)
dispatch({ type: "MOVE_OPTIMISTIC", taskId, toColumn });

// Async confirmation
try {
  await mockApi.call("move task");
} catch (err) {
  // Precise rollback — only the failed operation reverts
  dispatch({ type: "ROLLBACK_MOVE", taskId, toColumn: fromColumn });
  toast.add(err.message, "error");
}
```

### Why per-action rollbacks instead of full snapshot restore?

Using targeted rollbacks (e.g. `ROLLBACK_MOVE` reverts only the moved card's column) rather than a full snapshot restore means **concurrent operations don't interfere**. If a user moves two cards before the first settles, each failure only reverts its own card — not both.

The `ROLLBACK_BY_ID` action (used for delete failures) re-inserts the task at its original index from the snapshot, preserving column order.

### Pending State UX

While an action is in-flight, the affected task:
- Shows a spinning indicator
- Displays "saving…" text
- Cannot be dragged (prevents race conditions from re-ordering mid-flight)
- Has a shimmer bar at the top of the card

---

## ⚖️ Trade-offs & Decisions

### 1. Single-file vs multi-file architecture
**Decision**: Single `App.jsx` file to meet the deliverable format.  
**Trade-off**: In a real project, components would be split across files with barrel exports. The internal structure (Context, Reducer, components) mirrors what a proper multi-file layout would look like.

### 2. `useReducer` over Zustand/Redux
**Decision**: Used React's built-in `useReducer` + Context API.  
**Rationale**: This is the right level of complexity for this problem — Zustand/Redux would add boilerplate without meaningful benefit here. The reducer's explicit action types make rollbacks highly readable and testable.

### 3. Per-action rollback vs. full snapshot restore
**Decision**: Per-action rollbacks using targeted reducer actions.  
**Rationale**: Supports concurrent operations safely. Two simultaneous drags → two independent rollbacks. A full snapshot restore would clobber any concurrent successful operations.

### 4. Drag & Drop: native HTML5 vs dnd-kit/react-beautiful-dnd
**Decision**: Native HTML5 drag-and-drop API.  
**Rationale**: No heavy library dependency, keeps bundle tiny, and the assignment specifically discourages heavy UI libraries. For accessibility and advanced touch support, `@dnd-kit/core` would be the production upgrade.

### 5. Styling: inline styles vs Tailwind utility classes
**Decision**: Primarily CSS-in-JS (inline styles) with a global `<style>` block for animations and resets.  
**Rationale**: Since this is a self-contained JSX file, inline styles keep everything co-located and avoid needing a build step for Tailwind's purge/JIT. In a normal project setup, Tailwind utility classes would be used throughout.

### 6. 20% failure rate is applied to ALL actions
**Decision**: Add, Move, and Delete all have a 20% failure chance.  
**Rationale**: The assignment specifies this for "Add, Move, Delete" — each has its own rollback behavior: adds are removed, moves are reversed, deletes are re-inserted.

---

## 📁 Project Structure

```
src/
├── App.jsx          # Everything: store, context, components, mock API
└── main.jsx         # Vite entry (unchanged)
```

---

## 🎨 Design Notes

- **Theme**: Dark, minimal, editorial — inspired by professional SaaS tools
- **Typography**: Syne (display/headings) + DM Sans (body)  
- **Palette**: Deep charcoal background with green accent (`#6ee7b7`) as the primary interactive color
- **Column colors**: Indigo (To Do), Orange (In Progress), Green (Done)
- **Micro-interactions**: Card hover borders, confirmation overlay for delete, shimmer loading bar, spinner indicators

---

## 🔗 Deployment

Deploy to Vercel in one command:

```bash
npm i -g vercel
vercel --prod
```

Or connect your GitHub repo to [vercel.com](https://vercel.com) for automatic deploys on push.
