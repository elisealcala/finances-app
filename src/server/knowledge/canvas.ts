import { z } from "zod";

const coordinateSchema = z.number().finite().min(-100_000).max(100_000);
const dimensionSchema = z.number().finite().positive().max(20_000);

const baseNodeSchema = z.object({
  id: z.string().min(1).max(200),
  x: coordinateSchema,
  y: coordinateSchema,
  width: dimensionSchema,
  height: dimensionSchema,
  color: z.string().max(30).optional(),
});

const textNodeSchema = baseNodeSchema.extend({
  type: z.literal("text"),
  text: z.string().max(200_000),
});

const groupNodeSchema = baseNodeSchema.extend({
  type: z.literal("group"),
  label: z.string().max(500).optional(),
});

const linkNodeSchema = baseNodeSchema.extend({
  type: z.literal("link"),
  url: z
    .string()
    .url()
    .refine((url) => url.startsWith("https://") || url.startsWith("http://")),
});

const fileNodeSchema = baseNodeSchema.extend({
  type: z.literal("file"),
  file: z.string().min(1).max(1_000),
  subpath: z.string().max(1_000).optional(),
});

export const obsidianCanvasNodeSchema = z.discriminatedUnion("type", [
  textNodeSchema,
  groupNodeSchema,
  linkNodeSchema,
  fileNodeSchema,
]);

const canvasSideSchema = z.enum(["top", "right", "bottom", "left"]);

export const obsidianCanvasEdgeSchema = z.object({
  id: z.string().min(1).max(200),
  fromNode: z.string().min(1).max(200),
  toNode: z.string().min(1).max(200),
  fromSide: canvasSideSchema.optional(),
  toSide: canvasSideSchema.optional(),
  fromEnd: z.enum(["none", "arrow"]).optional(),
  toEnd: z.enum(["none", "arrow"]).optional(),
  color: z.string().max(30).optional(),
  label: z.string().max(500).optional(),
});

export const obsidianCanvasSchema = z.object({
  nodes: z.array(obsidianCanvasNodeSchema).max(1_000),
  edges: z.array(obsidianCanvasEdgeSchema).max(2_000).default([]),
});

export type ObsidianCanvas = z.infer<typeof obsidianCanvasSchema>;

export function parseObsidianCanvas(raw: string): ObsidianCanvas {
  return obsidianCanvasSchema.parse(JSON.parse(raw));
}
