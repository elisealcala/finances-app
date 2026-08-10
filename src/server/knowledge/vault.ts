import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { parseObsidianCanvas } from "@/server/knowledge/canvas";

const DEFAULT_VAULT_ROOT = "/Users/elizabethalcala/Sites/obsidian/knowledge";
const MAX_FILE_BYTES = 1_000_000;
const IGNORED_DIRECTORIES = new Set([".obsidian", "meetings"]);

export type ParsedKnowledgeDocument = {
  sourceId: string | null;
  relativePath: string;
  title: string;
  excerpt: string | null;
  content: string;
  frontmatter: Prisma.InputJsonValue;
  pillar: string | null;
  contentHash: string;
  canvas: Prisma.InputJsonValue | null;
  canvasHash: string | null;
  canvasModifiedAt: Date | null;
  date: Date;
  modifiedAt: Date;
  tags: string[];
};

export type KnowledgeSyncResult = {
  scannedDocuments: number;
  canvasDocuments: number;
  createdDocuments: number;
  updatedDocuments: number;
  deletedDocuments: number;
  skippedFiles: number;
};

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export function normalizeKnowledgeTag(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^#+/, "")
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9/-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^[-/]+|[-/]+$/g, "");
}

function extractTags(value: unknown): string[] {
  const candidates = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.replace(/^\[|\]$/g, "").split(",")
      : [];

  return Array.from(
    new Set(
      candidates
        .filter((candidate): candidate is string => typeof candidate === "string")
        .map(normalizeKnowledgeTag)
        .filter(Boolean),
    ),
  ).sort();
}

function extractTitle(content: string, relativePath: string): string {
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (heading) return heading;
  return path.basename(relativePath, path.extname(relativePath)).replace(/[-_]/g, " ");
}

function extractExcerpt(content: string): string | null {
  const plain = content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, "$2 $1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_>`~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) return null;
  return plain.length > 320 ? `${plain.slice(0, 317).trim()}…` : plain;
}

function extractKnowledgeDate(value: unknown, fallback: Date): Date {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    if (
      value.getUTCHours() === 0 &&
      value.getUTCMinutes() === 0 &&
      value.getUTCSeconds() === 0
    ) {
      return new Date(
        Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 12),
      );
    }
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    const dateOnly = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const parsed = dateOnly
      ? new Date(`${trimmed}T12:00:00.000Z`)
      : new Date(trimmed);
    if (Number.isFinite(parsed.getTime())) return parsed;
  }
  return fallback;
}

export function parseKnowledgeMarkdown(input: {
  raw: string;
  relativePath: string;
  modifiedAt: Date;
}): ParsedKnowledgeDocument {
  const parsed = matter(input.raw);
  const metadata = parsed.data as Record<string, unknown>;
  const sourceId =
    typeof metadata.knowledge_id === "string" && metadata.knowledge_id.trim()
      ? metadata.knowledge_id.trim()
      : null;
  const normalizedPath = input.relativePath.split(path.sep).join("/");
  const segments = normalizedPath.split("/");

  return {
    sourceId,
    relativePath: normalizedPath,
    title: extractTitle(parsed.content, normalizedPath),
    excerpt: extractExcerpt(parsed.content),
    content: parsed.content.trim(),
    frontmatter: jsonValue(metadata),
    pillar: segments.length > 1 ? segments[0] : null,
    contentHash: createHash("sha256").update(input.raw).digest("hex"),
    canvas: null,
    canvasHash: null,
    canvasModifiedAt: null,
    date: extractKnowledgeDate(metadata.date, input.modifiedAt),
    modifiedAt: input.modifiedAt,
    tags: extractTags(metadata.tags),
  };
}

async function attachCompanionCanvas(input: {
  document: ParsedKnowledgeDocument;
  rootRealPath: string;
  stats: { skippedFiles: number };
}) {
  const canvasRelativePath = input.document.relativePath.replace(/\.md$/i, ".canvas");
  const candidate = path.join(input.rootRealPath, canvasRelativePath);
  let candidateStats;
  try {
    candidateStats = await fs.lstat(candidate);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }

  if (!candidateStats.isFile() || candidateStats.isSymbolicLink()) {
    input.stats.skippedFiles += 1;
    return;
  }
  const candidateRealPath = await fs.realpath(candidate);
  if (!candidateRealPath.startsWith(`${input.rootRealPath}${path.sep}`)) {
    input.stats.skippedFiles += 1;
    return;
  }
  if (candidateStats.size > MAX_FILE_BYTES) {
    input.stats.skippedFiles += 1;
    return;
  }

  const raw = await fs.readFile(candidateRealPath, "utf8");
  input.document.canvas = jsonValue(parseObsidianCanvas(raw));
  input.document.canvasHash = createHash("sha256").update(raw).digest("hex");
  input.document.canvasModifiedAt = candidateStats.mtime;
}

async function scanDirectory(input: {
  directory: string;
  rootRealPath: string;
  documents: ParsedKnowledgeDocument[];
  stats: { skippedFiles: number };
}) {
  const entries = await fs.readdir(input.directory, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const candidate = path.join(input.directory, entry.name);

    if (entry.isSymbolicLink()) {
      input.stats.skippedFiles += 1;
      continue;
    }
    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORIES.has(entry.name)) continue;
      await scanDirectory({ ...input, directory: candidate });
      continue;
    }
    if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== ".md") {
      continue;
    }

    const candidateRealPath = await fs.realpath(candidate);
    if (!candidateRealPath.startsWith(`${input.rootRealPath}${path.sep}`)) {
      input.stats.skippedFiles += 1;
      continue;
    }
    const fileStats = await fs.stat(candidateRealPath);
    if (fileStats.size > MAX_FILE_BYTES) {
      input.stats.skippedFiles += 1;
      continue;
    }

    const raw = await fs.readFile(candidateRealPath, "utf8");
    input.documents.push(
      parseKnowledgeMarkdown({
        raw,
        relativePath: path.relative(input.rootRealPath, candidateRealPath),
        modifiedAt: fileStats.mtime,
      }),
    );
  }
}

export async function readKnowledgeVault(
  vaultRoot = process.env.OBSIDIAN_KNOWLEDGE_PATH ?? DEFAULT_VAULT_ROOT,
) {
  const rootRealPath = await fs.realpath(vaultRoot);
  const documents: ParsedKnowledgeDocument[] = [];
  const stats = { skippedFiles: 0 };
  await scanDirectory({
    directory: rootRealPath,
    rootRealPath,
    documents,
    stats,
  });
  await Promise.all(
    documents.map((document) =>
      attachCompanionCanvas({ document, rootRealPath, stats }),
    ),
  );
  documents.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
  return { rootRealPath, documents, skippedFiles: stats.skippedFiles };
}

export async function syncKnowledgeVault(
  database: PrismaClient,
  vaultRoot = process.env.OBSIDIAN_KNOWLEDGE_PATH ?? DEFAULT_VAULT_ROOT,
): Promise<KnowledgeSyncResult> {
  const scanned = await readKnowledgeVault(vaultRoot);
  if (scanned.documents.length === 0) {
    throw new Error(
      "No Markdown knowledge files were found; the existing index was left unchanged",
    );
  }
  const existing = await database.knowledgeDocument.findMany({
    select: {
      id: true,
      relativePath: true,
      contentHash: true,
      canvasHash: true,
    },
  });
  const existingByPath = new Map(existing.map((document) => [document.relativePath, document]));
  let createdDocuments = 0;
  let updatedDocuments = 0;

  for (const document of scanned.documents) {
    const previous = existingByPath.get(document.relativePath);
    if (!previous) createdDocuments += 1;
    else if (
      previous.contentHash !== document.contentHash ||
      previous.canvasHash !== document.canvasHash
    ) {
      updatedDocuments += 1;
    }

    await database.knowledgeDocument.upsert({
      where: { relativePath: document.relativePath },
      create: {
        sourceId: document.sourceId,
        relativePath: document.relativePath,
        title: document.title,
        excerpt: document.excerpt,
        content: document.content,
        frontmatter: document.frontmatter,
        pillar: document.pillar,
        contentHash: document.contentHash,
        canvas: document.canvas ?? Prisma.DbNull,
        canvasHash: document.canvasHash,
        canvasModifiedAt: document.canvasModifiedAt,
        date: document.date,
        modifiedAt: document.modifiedAt,
        tags: { create: document.tags.map((tag) => ({ tag })) },
      },
      update: {
        sourceId: document.sourceId,
        title: document.title,
        excerpt: document.excerpt,
        content: document.content,
        frontmatter: document.frontmatter,
        pillar: document.pillar,
        contentHash: document.contentHash,
        canvas: document.canvas ?? Prisma.DbNull,
        canvasHash: document.canvasHash,
        canvasModifiedAt: document.canvasModifiedAt,
        date: document.date,
        modifiedAt: document.modifiedAt,
        indexedAt: new Date(),
        deletedAt: null,
        tags: {
          deleteMany: {},
          create: document.tags.map((tag) => ({ tag })),
        },
      },
    });

  }

  const activePaths = scanned.documents.map((document) => document.relativePath);
  const deleted = await database.knowledgeDocument.updateMany({
    where: {
      deletedAt: null,
      relativePath: { notIn: activePaths },
    },
    data: { deletedAt: new Date() },
  });

  return {
    scannedDocuments: scanned.documents.length,
    canvasDocuments: scanned.documents.filter((document) => document.canvas).length,
    createdDocuments,
    updatedDocuments,
    deletedDocuments: deleted.count,
    skippedFiles: scanned.skippedFiles,
  };
}
