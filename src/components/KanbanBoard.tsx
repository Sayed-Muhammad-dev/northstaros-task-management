import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Avatar, Badge, Button, Card } from "./ui";
import { useAppStore } from "../hooks/useAppStore";
import type { Task, TaskStatus } from "../types/app";

export const kanbanColumns: TaskStatus[] = [
  "Backlog",
  "Todo",
  "In Progress",
  "Review",
  "Completed"
];

const columnAccent: Record<TaskStatus, string> = {
  Backlog: "bg-slate-400",
  Todo: "bg-sky-400",
  "In Progress": "bg-brand-500",
  Review: "bg-amber-400",
  Completed: "bg-emerald-500"
};

/**
 * Kanban board with drag-and-drop.
 *
 * Uses the native HTML drag-and-drop API rather than a library: it is enough
 * for column-to-column moves, adds no bundle weight, and gives touch users a
 * working fallback through the keyboard and the Prev/Next buttons on each card.
 */
export function KanbanBoard({ tasks }: { tasks: Task[] }) {
  const { projects, members, moveTask, pushToast } = useAppStore();

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null);
  /** Tracks enter/leave depth so nested children do not clear the drop hint. */
  const dragDepth = useRef(0);

  function handleDrop(status: TaskStatus) {
    dragDepth.current = 0;
    setOverColumn(null);

    if (!draggingId) return;

    const task = tasks.find((item) => item.id === draggingId);
    setDraggingId(null);

    if (!task || task.status === status) return;

    moveTask(task.id, status);
    pushToast({ title: "Task moved", description: `${task.title} moved to ${status}.` });
  }

  /** Keyboard equivalent of a drag, so the board is not mouse-only. */
  function shiftTask(task: Task, direction: -1 | 1) {
    const index = kanbanColumns.indexOf(task.status);
    const next = kanbanColumns[index + direction];
    if (!next) return;
    moveTask(task.id, next);
    pushToast({ title: "Task moved", description: `${task.title} moved to ${next}.` });
  }

  return (
    // Horizontal scroll keeps all five columns reachable on narrow screens.
    <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      <div className="grid min-w-[900px] gap-4 xl:min-w-0 xl:grid-cols-5">
        {kanbanColumns.map((column) => {
          const columnTasks = tasks.filter((task) => task.status === column);
          const isOver = overColumn === column;

          return (
            <Card
              key={column}
              className={`p-4 transition duration-200 ${
                isOver
                  ? "ring-2 ring-brand-400 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-950"
                  : ""
              }`}
              onDragOver={(event) => {
                // Preventing default is what marks this a valid drop target.
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }}
              onDragEnter={() => {
                dragDepth.current += 1;
                setOverColumn(column);
              }}
              onDragLeave={() => {
                dragDepth.current -= 1;
                if (dragDepth.current <= 0) setOverColumn(null);
              }}
              onDrop={() => handleDrop(column)}
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="flex items-center gap-2 font-semibold">
                  <span className={`h-2.5 w-2.5 rounded-full ${columnAccent[column]}`} />
                  {column}
                </p>
                <Badge>{columnTasks.length}</Badge>
              </div>

              <div className="space-y-3">
                {columnTasks.length === 0 ? (
                  <div
                    className={`rounded-3xl border border-dashed p-6 text-center text-xs transition ${
                      isOver
                        ? "border-brand-400 bg-brand-50 text-brand-600 dark:bg-brand-500/10"
                        : "border-slate-300 text-slate-400 dark:border-white/15"
                    }`}
                  >
                    {isOver ? "Release to move here" : "Drop a task here"}
                  </div>
                ) : null}

                {columnTasks.map((task) => {
                  const project = projects.find((item) => item.id === task.projectId);
                  const member = members.find((item) => item.id === task.assigneeId);
                  const index = kanbanColumns.indexOf(task.status);
                  const dragging = draggingId === task.id;

                  return (
                    <article
                      key={task.id}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", task.id);
                        setDraggingId(task.id);
                      }}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setOverColumn(null);
                        dragDepth.current = 0;
                      }}
                      className={`cursor-grab rounded-3xl border border-slate-200/70 bg-slate-50 p-4 transition duration-200 active:cursor-grabbing dark:border-white/10 dark:bg-white/5 ${
                        dragging
                          ? "scale-[0.97] opacity-40"
                          : "hover:-translate-y-1 hover:border-brand-300 hover:shadow-lg"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            to={`/app/tasks/${task.id}`}
                            className="font-medium hover:text-brand-600"
                          >
                            {task.title}
                          </Link>
                          <p className="mt-2 truncate text-xs uppercase tracking-[0.24em] text-slate-400">
                            {project?.name}
                          </p>
                        </div>
                        <Badge
                          tone={
                            task.priority === "Critical"
                              ? "danger"
                              : task.priority === "High"
                                ? "warning"
                                : "default"
                          }
                        >
                          {task.priority}
                        </Badge>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {task.labels.map((label) => (
                          <Badge key={label}>{label}</Badge>
                        ))}
                      </div>

                      <div className="mt-4 h-2 rounded-full bg-slate-200 dark:bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-cyan-400 transition-[width] duration-700"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>

                      <div className="mt-4 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                        <span>{task.comments} comments</span>
                        <span>{task.attachments} files</span>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-2">
                        {member ? <Avatar name={member.name} status={member.status} /> : <span />}
                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            disabled={index === 0}
                            aria-label={`Move ${task.title} to the previous column`}
                            onClick={() => shiftTask(task, -1)}
                          >
                            ←
                          </Button>
                          <Button
                            variant="secondary"
                            disabled={index === kanbanColumns.length - 1}
                            aria-label={`Move ${task.title} to the next column`}
                            onClick={() => shiftTask(task, 1)}
                          >
                            →
                          </Button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
