export type HubTaskStatus =
  | "BACKLOG"
  | "TODO"
  | "IN_PROGRESS"
  | "IN_REVIEW"
  | "DONE"
  | "CANCELED";

export type HubTaskPriority = "URGENT" | "HIGH" | "MEDIUM" | "LOW" | "NONE";
export type HubIdeaStage =
  | "RAW"
  | "EXPLORING"
  | "PRIORITIZED"
  | "IN_ACTION"
  | "ARCHIVED";

export type HubProject = {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type HubLabel = {
  id: string;
  name: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
};

export type HubSubtask = {
  id: string;
  title: string;
  completed: boolean;
  position: number;
  taskId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type HubTask = {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  status: HubTaskStatus;
  priority: HubTaskPriority;
  dueDate: Date | null;
  estimatePoints: number | null;
  position: number;
  completedAt: Date | null;
  projectId: string | null;
  sourceIdeaId: string | null;
  createdAt: Date;
  updatedAt: Date;
  project: HubProject | null;
  sourceIdea: { id: string; identifier: string; title: string } | null;
  labels: HubLabel[];
  subtasks: HubSubtask[];
};

export type HubIdea = {
  id: string;
  identifier: string;
  title: string;
  description: string;
  category: string;
  stage: HubIdeaStage;
  impact: number;
  effort: number;
  confidence: number;
  score: number;
  tags: string[];
  targetQuarter: string | null;
  notes: string | null;
  projectId: string | null;
  createdAt: Date;
  updatedAt: Date;
  project: HubProject | null;
  sourceTask: { id: string; identifier: string; title: string } | null;
};

export type HubWorkspace = {
  tasks: HubTask[];
  ideas: HubIdea[];
  projects: HubProject[];
  labels: HubLabel[];
};

export type HubView = "week" | "list" | "board" | "ideas" | "timeline";

export const TASK_STATUSES: HubTaskStatus[] = [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
  "CANCELED",
];

export const BOARD_STATUSES: HubTaskStatus[] = [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
];

export const TASK_PRIORITIES: HubTaskPriority[] = [
  "URGENT",
  "HIGH",
  "MEDIUM",
  "LOW",
  "NONE",
];

export const IDEA_STAGES: HubIdeaStage[] = [
  "RAW",
  "EXPLORING",
  "PRIORITIZED",
  "IN_ACTION",
  "ARCHIVED",
];

export const IDEA_CATEGORIES = [
  "Side Project",
  "Career",
  "Life & Health",
  "Tech & Tools",
  "Creative",
  "Financial",
] as const;

export const statusMeta: Record<
  HubTaskStatus,
  { label: string; dot: string; className: string }
> = {
  BACKLOG: { label: "Backlog", dot: "bg-slate-400", className: "text-slate-600 dark:text-slate-300" },
  TODO: { label: "To do", dot: "bg-zinc-400", className: "text-zinc-600 dark:text-zinc-300" },
  IN_PROGRESS: { label: "In progress", dot: "bg-amber-500", className: "text-amber-700 dark:text-amber-300" },
  IN_REVIEW: { label: "In review", dot: "bg-violet-500", className: "text-violet-700 dark:text-violet-300" },
  DONE: { label: "Done", dot: "bg-emerald-500", className: "text-emerald-700 dark:text-emerald-300" },
  CANCELED: { label: "Canceled", dot: "bg-rose-400", className: "text-rose-600 dark:text-rose-300" },
};

export const priorityMeta: Record<
  HubTaskPriority,
  { label: string; className: string }
> = {
  URGENT: { label: "Urgent", className: "bg-rose-500/12 text-rose-700 dark:text-rose-300" },
  HIGH: { label: "High", className: "bg-orange-500/12 text-orange-700 dark:text-orange-300" },
  MEDIUM: { label: "Medium", className: "bg-amber-500/12 text-amber-700 dark:text-amber-300" },
  LOW: { label: "Low", className: "bg-sky-500/12 text-sky-700 dark:text-sky-300" },
  NONE: { label: "No priority", className: "bg-muted text-muted-foreground" },
};

export const ideaStageMeta: Record<HubIdeaStage, { label: string; className: string }> = {
  RAW: { label: "Raw", className: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-300" },
  EXPLORING: { label: "Exploring", className: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  PRIORITIZED: { label: "Prioritized", className: "bg-violet-500/10 text-violet-700 dark:text-violet-300" },
  IN_ACTION: { label: "In action", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  ARCHIVED: { label: "Archived", className: "bg-muted text-muted-foreground" },
};
