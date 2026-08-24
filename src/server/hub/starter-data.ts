import type { PrismaClient } from "@/generated/prisma/client";

const DAY = 86_400_000;

function atLocalNoon(daysFromToday: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + daysFromToday);
  return date;
}

const projects = [
  {
    id: "hub-starter-project-launch",
    name: "SaaS Platform Launch",
    color: "#8b5cf6",
    icon: "Rocket",
    description: "Core product development and marketing launch",
  },
  {
    id: "hub-starter-project-growth",
    name: "Personal Growth & Health",
    color: "#10b981",
    icon: "Heart",
    description: "Workouts, nutrition, mindfulness, and reading",
  },
  {
    id: "hub-starter-project-studio",
    name: "Home Office & Studio",
    color: "#f59e0b",
    icon: "Home",
    description: "Ergonomic desk, audio setup, and lighting",
  },
  {
    id: "hub-starter-project-finance",
    name: "Financial Independence",
    color: "#3b82f6",
    icon: "DollarSign",
    description: "Investments, tax preparation, and budget tracking",
  },
] as const;

const labels = [
  { id: "hub-starter-label-deep", name: "Deep Work", color: "#6366f1" },
  { id: "hub-starter-label-quick", name: "Quick Win", color: "#10b981" },
  { id: "hub-starter-label-design", name: "Design", color: "#ec4899" },
  { id: "hub-starter-label-engineering", name: "Engineering", color: "#3b82f6" },
  { id: "hub-starter-label-admin", name: "Admin", color: "#64748b" },
] as const;

const tasks = [
  {
    id: "hub-starter-task-1",
    identifier: "PER-1",
    title: "Review quarterly revenue numbers and draft tax deductions",
    description:
      "Pull payment exports and categorize business expenses before meeting with the accountant.",
    status: "IN_PROGRESS" as const,
    priority: "URGENT" as const,
    projectId: projects[3].id,
    labelIds: [labels[0].id, labels[4].id],
    dueOffset: 0,
    estimatePoints: 3,
    subtasks: [
      ["Export quarterly receipts", true],
      ["Categorize hardware and cloud deductions", true],
      ["Schedule a sync with the accountant", false],
    ] as const,
  },
  {
    id: "hub-starter-task-2",
    identifier: "PER-2",
    title: "Design high-speed command palette and key navigation",
    description:
      "Craft frictionless keyboard shortcuts with responsive visual feedback.",
    status: "TODO" as const,
    priority: "HIGH" as const,
    projectId: projects[0].id,
    labelIds: [labels[0].id, labels[2].id, labels[3].id],
    dueOffset: 0,
    estimatePoints: 5,
    subtasks: [
      ["Map hotkeys and browser collisions", false],
      ["Add search filtering for actions and tasks", false],
    ] as const,
  },
  {
    id: "hub-starter-task-3",
    identifier: "PER-3",
    title: "30-minute strength and mobility session",
    description: "Upper-body focus plus a deep stretching routine.",
    status: "DONE" as const,
    priority: "MEDIUM" as const,
    projectId: projects[1].id,
    labelIds: [labels[1].id],
    dueOffset: 0,
    estimatePoints: 1,
    subtasks: [] as const,
  },
  {
    id: "hub-starter-task-4",
    identifier: "PER-4",
    title: "Install monitor arm and cable management tray",
    description: "Clear desk clutter to improve focus and reduce neck strain.",
    status: "TODO" as const,
    priority: "MEDIUM" as const,
    projectId: projects[2].id,
    labelIds: [labels[1].id, labels[4].id],
    dueOffset: 1,
    estimatePoints: 2,
    subtasks: [
      ["Mount the dual-arm clamp", false],
      ["Route cables through sleeves", false],
    ] as const,
  },
  {
    id: "hub-starter-task-5",
    identifier: "PER-5",
    title: "Refactor database indexing for faster API queries",
    description: "Add composite indexes to the highest-volume query paths.",
    status: "TODO" as const,
    priority: "HIGH" as const,
    projectId: projects[0].id,
    labelIds: [labels[0].id, labels[3].id],
    dueOffset: 2,
    estimatePoints: 3,
    subtasks: [] as const,
  },
  {
    id: "hub-starter-task-6",
    identifier: "PER-6",
    title: "Finish the next chapters of Designing Data-Intensive Applications",
    description: "Take structured notes in the knowledge base.",
    status: "TODO" as const,
    priority: "LOW" as const,
    projectId: projects[1].id,
    labelIds: [labels[0].id],
    dueOffset: 4,
    estimatePoints: 2,
    subtasks: [] as const,
  },
  {
    id: "hub-starter-task-7",
    identifier: "PER-7",
    title: "Audit monthly subscriptions and cancel unused licenses",
    description: "Review recurring charges for services that are no longer active.",
    status: "BACKLOG" as const,
    priority: "LOW" as const,
    projectId: projects[3].id,
    labelIds: [labels[1].id, labels[4].id],
    dueOffset: 8,
    estimatePoints: 1,
    subtasks: [] as const,
  },
  {
    id: "hub-starter-task-8",
    identifier: "PER-8",
    title: "Update landing page hero copy with conversion data",
    description: "Test value propositions focused on speed and cost savings.",
    status: "TODO" as const,
    priority: "HIGH" as const,
    projectId: projects[0].id,
    labelIds: [labels[2].id],
    dueOffset: -1,
    estimatePoints: 2,
    subtasks: [] as const,
  },
] as const;

const ideas = [
  {
    id: "hub-starter-idea-1",
    identifier: "IDEA-1",
    title: "Instant voice-to-action note taker",
    description:
      "A lock-screen tool that turns voice notes into categorized tasks and project ideas.",
    category: "Side Project",
    stage: "PRIORITIZED" as const,
    impact: 5,
    effort: 2,
    confidence: 4,
    tags: ["AI", "Mobile", "Audio"],
    targetQuarter: "Q3 2026",
    notes: "Use speech transcription plus semantic structuring.",
    createdOffset: -10,
  },
  {
    id: "hub-starter-idea-2",
    identifier: "IDEA-2",
    title: "Automated micro-investing rebalancer",
    description:
      "Automatically sweep planned idle balances into a low-cost investment allocation.",
    category: "Financial",
    stage: "EXPLORING" as const,
    impact: 4,
    effort: 2,
    confidence: 5,
    tags: ["Finance", "Automation", "Python"],
    targetQuarter: "Q4 2026",
    notes: "Research banking and brokerage integrations first.",
    createdOffset: -8,
  },
  {
    id: "hub-starter-idea-3",
    identifier: "IDEA-3",
    title: "Ambient biometric focus light",
    description:
      "A desk light that reflects deep-work blocks and break windows.",
    category: "Life & Health",
    stage: "RAW" as const,
    impact: 3,
    effort: 4,
    confidence: 3,
    tags: ["IoT", "Hardware", "Focus"],
    targetQuarter: null,
    notes: "Explore local smart-light bridge APIs.",
    createdOffset: -6,
  },
  {
    id: "hub-starter-idea-4",
    identifier: "IDEA-4",
    title: "Full-stack developer mentorship cohort",
    description:
      "A focused sprint teaching modern architecture, state synchronization, and design patterns.",
    category: "Career",
    stage: "EXPLORING" as const,
    impact: 5,
    effort: 5,
    confidence: 4,
    tags: ["Teaching", "Community", "Writing"],
    targetQuarter: "Q4 2026",
    notes: null,
    createdOffset: -4,
  },
  {
    id: "hub-starter-idea-5",
    identifier: "IDEA-5",
    title: "Custom keyboard firmware with navigation layers",
    description:
      "Build a thumb-activated navigation layer to reduce movement while coding.",
    category: "Tech & Tools",
    stage: "IN_ACTION" as const,
    impact: 4,
    effort: 1,
    confidence: 5,
    tags: ["Hardware", "Vim", "Ergonomics"],
    targetQuarter: "Q3 2026",
    notes: "Prototype on a split keyboard.",
    createdOffset: -12,
  },
] as const;

export async function importHubStarterData(database: PrismaClient) {
  const [taskCount, ideaCount, projectCount, labelCount] = await Promise.all([
    database.hubTask.count(),
    database.hubIdea.count(),
    database.hubProject.count(),
    database.hubLabel.count(),
  ]);
  if (taskCount + ideaCount + projectCount + labelCount > 0) {
    throw new Error("Starter data can only be imported into an empty Tasks & Ideas workspace");
  }

  await database.$transaction(async (transaction) => {
    await transaction.hubProject.createMany({ data: projects.map((item) => ({ ...item })) });
    await transaction.hubLabel.createMany({ data: labels.map((item) => ({ ...item })) });

    for (const task of tasks) {
      await transaction.hubTask.create({
        data: {
          id: task.id,
          identifier: task.identifier,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          projectId: task.projectId,
          dueDate: atLocalNoon(task.dueOffset),
          estimatePoints: task.estimatePoints,
          completedAt: task.status === "DONE" ? new Date() : null,
          createdAt: new Date(Date.now() - Math.abs(task.dueOffset) * DAY),
          labels: {
            create: task.labelIds.map((labelId) => ({ labelId })),
          },
          subtasks: {
            create: task.subtasks.map(([title, completed], position) => ({
              title,
              completed,
              position,
            })),
          },
        },
      });
    }

    for (const idea of ideas) {
      await transaction.hubIdea.create({
        data: {
          id: idea.id,
          identifier: idea.identifier,
          title: idea.title,
          description: idea.description,
          category: idea.category,
          stage: idea.stage,
          impact: idea.impact,
          effort: idea.effort,
          confidence: idea.confidence,
          score: (idea.impact * idea.confidence) / idea.effort,
          tags: [...idea.tags],
          targetQuarter: idea.targetQuarter,
          notes: idea.notes,
          createdAt: new Date(Date.now() + idea.createdOffset * DAY),
        },
      });
    }

    await transaction.hubSequence.upsert({
      where: { id: "default" },
      create: { id: "default", taskNumber: tasks.length, ideaNumber: ideas.length },
      update: { taskNumber: tasks.length, ideaNumber: ideas.length },
    });
  });

  return { imported: true, tasks: tasks.length, ideas: ideas.length };
}
