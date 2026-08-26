# NorthstarOS — Task Management Web App

A Kanban-first task management application for product and delivery teams:
draggable board, project and task views, calendar, team collaboration, and
reporting — eighteen routes in all.

> **Live demo:** _add the deployment URL here_

## Features

**Kanban board — with real drag-and-drop**
- Five columns (Backlog → Todo → In Progress → Review → Completed) with
  colour-coded headers and live counts.
- **Cards drag between any two columns.** The card being dragged dims and
  scales down; the target column takes a ring; an empty column shows a
  "Release to move here" prompt.
- Arrow buttons on every card do the same move from the keyboard, so the board
  is usable without a pointer — and on touch devices, where HTML drag-and-drop
  is unreliable.
- Search plus project and priority filters narrow what the board shows; moving
  a card raises a toast.
- Below `xl` the board scrolls horizontally rather than collapsing.

**Views**
- Dashboard with operational overview and quick actions.
- Projects list and project detail.
- List view of tasks with a per-task detail page — the alternative to the
  board.
- Calendar view across the month.
- Analytics and reports with charts.
- Team members, messages and notifications.
- Settings, profile and help.

**Marketing and auth** — landing page plus login, register and
forgot-password flows.

**Interaction** — modal open/close transitions, card hover lift, animated
progress bars, toasts, dark mode.

## Tech Stack

| Layer | Choice |
| --- | --- |
| Framework | React 18 + Vite 5 |
| Language | TypeScript (strict) |
| Routing | React Router 7 |
| Styling | Tailwind CSS 3 |
| Icons | lucide-react |
| State | React context store (`useAppStore`) |

Drag-and-drop uses the **native HTML drag-and-drop API** rather than a library:
it handles column-to-column moves perfectly well, adds nothing to the bundle,
and the keyboard controls cover the cases it does not. Enter/leave depth is
tracked with a ref so nested children inside a column do not flicker the drop
hint off.

## Design

A soft neutral background with a single brand accent, and priority colour-coded
on task labels — critical in rose, high in amber, everything else neutral.
Column headers carry their own dot colour so the board reads at a glance.

## Getting Started

```bash
npm install
npm run dev      # http://localhost:5173
```

```bash
npm run build && npm run preview   # type-check + production build
```

## Project Structure

```
src/
  App.tsx                    route table
  main.tsx                   entry point
  layouts/AppLayout.tsx      workspace shell
  pages/
    LandingPage.tsx          marketing page
    AuthPages.tsx            login, register, forgot password
    AppPages.tsx             every in-app screen
  components/
    KanbanBoard.tsx          draggable board
    ui.tsx                   buttons, cards, modals, inputs, badges
    charts.tsx               bar and donut charts
    brand.tsx                logo and wordmark
  hooks/useAppStore.tsx      tasks, projects, members, toasts
  data/mockData.ts           seed content
  types/app.ts               shared domain types
  utils/helpers.ts           class merging and date formatting
```

## Notes on this revision

The board previously advertised itself as "prepared for a future drag-and-drop
integration" and moved cards only through Prev/Next buttons. It now actually
drags. The build script also runs `tsc --noEmit` before Vite, which surfaced a
latent typing bug in the `cn` class-name helper that the Vite-only build had
been skipping past.
