"use client";

import {
  ExternalLink,
  FileText,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  Scan,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ObsidianCanvas } from "@/server/knowledge/canvas";
import { KnowledgeMarkdown } from "./knowledge-markdown";

type CanvasNode = ObsidianCanvas["nodes"][number];
type CanvasEdge = ObsidianCanvas["edges"][number];
type CanvasSide = "top" | "right" | "bottom" | "left";

const PADDING = 80;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 1.5;

const nodeColors: Record<string, string> = {
  "1": "border-rose-400/70 bg-rose-50 dark:border-rose-500/50 dark:bg-rose-950/70",
  "2": "border-orange-400/70 bg-orange-50 dark:border-orange-500/50 dark:bg-orange-950/70",
  "3": "border-amber-400/70 bg-amber-50 dark:border-amber-500/50 dark:bg-amber-950/70",
  "4": "border-emerald-400/70 bg-emerald-50 dark:border-emerald-500/50 dark:bg-emerald-950/70",
  "5": "border-cyan-400/70 bg-cyan-50 dark:border-cyan-500/50 dark:bg-cyan-950/70",
  "6": "border-violet-400/70 bg-violet-50 dark:border-violet-500/50 dark:bg-violet-950/70",
};

const edgeColors: Record<string, string> = {
  "1": "#fb7185",
  "2": "#fb923c",
  "3": "#fbbf24",
  "4": "#34d399",
  "5": "#22d3ee",
  "6": "#a78bfa",
};

function anchor(node: CanvasNode, side: CanvasSide | undefined) {
  switch (side) {
    case "top":
      return { x: node.x + node.width / 2, y: node.y, dx: 0, dy: -1 };
    case "right":
      return { x: node.x + node.width, y: node.y + node.height / 2, dx: 1, dy: 0 };
    case "bottom":
      return { x: node.x + node.width / 2, y: node.y + node.height, dx: 0, dy: 1 };
    case "left":
      return { x: node.x, y: node.y + node.height / 2, dx: -1, dy: 0 };
    default:
      return { x: node.x + node.width / 2, y: node.y + node.height / 2, dx: 0, dy: 0 };
  }
}

function inferSide(node: CanvasNode, other: CanvasNode): CanvasSide {
  const dx = other.x + other.width / 2 - (node.x + node.width / 2);
  const dy = other.y + other.height / 2 - (node.y + node.height / 2);
  if (Math.abs(dx) > Math.abs(dy)) return dx >= 0 ? "right" : "left";
  return dy >= 0 ? "bottom" : "top";
}

function edgePath(edge: CanvasEdge, nodes: Map<string, CanvasNode>) {
  const fromNode = nodes.get(edge.fromNode);
  const toNode = nodes.get(edge.toNode);
  if (!fromNode || !toNode) return null;
  const from = anchor(fromNode, edge.fromSide ?? inferSide(fromNode, toNode));
  const to = anchor(toNode, edge.toSide ?? inferSide(toNode, fromNode));
  const distance = Math.max(80, Math.hypot(to.x - from.x, to.y - from.y) * 0.35);
  const fromControl = {
    x: from.x + from.dx * distance,
    y: from.y + from.dy * distance,
  };
  const toControl = {
    x: to.x + to.dx * distance,
    y: to.y + to.dy * distance,
  };
  return {
    d: `M ${from.x} ${from.y} C ${fromControl.x} ${fromControl.y}, ${toControl.x} ${toControl.y}, ${to.x} ${to.y}`,
    labelX: (from.x + to.x) / 2,
    labelY: (from.y + to.y) / 2,
  };
}

function CanvasNodeCard({ node }: { node: CanvasNode }) {
  if (node.type === "group") {
    return (
      <div
        className={cn(
          "absolute z-0 rounded-2xl border-2 border-dashed bg-slate-100/35 p-4 dark:bg-slate-900/25",
          nodeColors[node.color ?? ""] ?? "border-slate-300/80 dark:border-slate-700",
        )}
        style={{ left: node.x, top: node.y, width: node.width, height: node.height }}
      >
        {node.label ? (
          <span className="bg-background/90 rounded-md px-2 py-1 text-xs font-semibold shadow-sm">
            {node.label}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "absolute z-20 overflow-auto rounded-xl border bg-white p-4 text-[13px] shadow-sm dark:bg-slate-950",
        nodeColors[node.color ?? ""] ?? "border-slate-300 dark:border-slate-700",
      )}
      style={{ left: node.x, top: node.y, width: node.width, height: node.height }}
    >
      {node.type === "text" ? (
        <KnowledgeMarkdown content={node.text} compact />
      ) : node.type === "link" ? (
        <a
          href={node.url}
          target="_blank"
          rel="noreferrer"
          className="text-primary flex h-full items-center gap-2 font-medium underline underline-offset-4"
        >
          <ExternalLink className="size-4 shrink-0" />
          <span className="break-all">{node.url}</span>
        </a>
      ) : (
        <div className="flex h-full items-center gap-2">
          <FileText className="text-muted-foreground size-4 shrink-0" />
          <span className="break-all font-medium">{node.file}</span>
        </div>
      )}
    </div>
  );
}

export function KnowledgeCanvas({ canvas }: { canvas: ObsidianCanvas }) {
  const [zoom, setZoom] = useState(0.7);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const layout = useMemo(() => {
    const minX = Math.min(...canvas.nodes.map((node) => node.x), 0);
    const minY = Math.min(...canvas.nodes.map((node) => node.y), 0);
    const maxX = Math.max(...canvas.nodes.map((node) => node.x + node.width), 0);
    const maxY = Math.max(...canvas.nodes.map((node) => node.y + node.height), 0);
    const offsetX = PADDING - minX;
    const offsetY = PADDING - minY;
    const nodes = canvas.nodes.map((node) => ({
      ...node,
      x: node.x + offsetX,
      y: node.y + offsetY,
    })) as CanvasNode[];
    return {
      nodes,
      nodeMap: new Map(nodes.map((node) => [node.id, node])),
      width: maxX - minX + PADDING * 2,
      height: maxY - minY + PADDING * 2,
    };
  }, [canvas.nodes]);

  function changeZoom(delta: number) {
    setZoom((current) =>
      Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number((current + delta).toFixed(2)))),
    );
  }

  useEffect(() => {
    if (!isFullscreen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullscreen]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border bg-slate-50 dark:bg-slate-950/60",
        isFullscreen &&
          "bg-background fixed inset-0 z-[100] flex h-dvh w-screen flex-col rounded-none border-0 dark:bg-slate-950",
      )}
    >
      <div className="bg-background/95 flex shrink-0 items-center justify-between border-b px-3 py-2">
        <div>
          <p className="text-sm font-semibold">Obsidian Canvas</p>
          <p className="text-muted-foreground text-xs">
            {canvas.nodes.length} nodes · {canvas.edges.length} connections
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => changeZoom(-0.1)}
            disabled={zoom <= MIN_ZOOM}
            aria-label="Zoom out"
          >
            <Minus className="size-4" />
          </Button>
          <span className="text-muted-foreground w-12 text-center text-xs tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => changeZoom(0.1)}
            disabled={zoom >= MAX_ZOOM}
            aria-label="Zoom in"
          >
            <Plus className="size-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setZoom(0.55)}>
            <Scan className="size-4" /> Fit
          </Button>
          <Button
            type="button"
            variant={isFullscreen ? "default" : "outline"}
            size="sm"
            aria-pressed={isFullscreen}
            onClick={() => setIsFullscreen((current) => !current)}
          >
            {isFullscreen ? (
              <Minimize2 className="size-4" />
            ) : (
              <Maximize2 className="size-4" />
            )}
            {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "h-[720px] overflow-auto bg-[radial-gradient(circle,_rgba(100,116,139,0.22)_1px,_transparent_1px)] bg-size-[20px_20px]",
          isFullscreen && "h-auto flex-1",
        )}
      >
        <div
          className="relative"
          style={{ width: layout.width * zoom, height: layout.height * zoom }}
        >
          <div
            className="absolute top-0 left-0 origin-top-left"
            style={{
              width: layout.width,
              height: layout.height,
              transform: `scale(${zoom})`,
            }}
          >
            {layout.nodes
              .filter((node) => node.type === "group")
              .map((node) => <CanvasNodeCard key={node.id} node={node} />)}

            <svg
              className="pointer-events-none absolute inset-0 z-10 overflow-visible"
              width={layout.width}
              height={layout.height}
              aria-hidden="true"
            >
              <defs>
                <marker
                  id="canvas-arrow"
                  markerWidth="10"
                  markerHeight="10"
                  refX="8"
                  refY="3"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M0,0 L0,6 L9,3 z" fill="context-stroke" />
                </marker>
              </defs>
              {canvas.edges.map((edge) => {
                const path = edgePath(edge, layout.nodeMap);
                if (!path) return null;
                const stroke = edgeColors[edge.color ?? ""] ?? "#94a3b8";
                return (
                  <g key={edge.id}>
                    <path
                      d={path.d}
                      fill="none"
                      stroke={stroke}
                      strokeWidth="3"
                      markerStart={edge.fromEnd === "arrow" ? "url(#canvas-arrow)" : undefined}
                      markerEnd={edge.toEnd === "none" ? undefined : "url(#canvas-arrow)"}
                    />
                    {edge.label ? (
                      <text
                        x={path.labelX}
                        y={path.labelY - 8}
                        textAnchor="middle"
                        className="fill-slate-600 text-[12px] font-medium dark:fill-slate-300"
                        stroke="var(--background)"
                        strokeWidth="5"
                        paintOrder="stroke"
                      >
                        {edge.label}
                      </text>
                    ) : null}
                  </g>
                );
              })}
            </svg>

            {layout.nodes
              .filter((node) => node.type !== "group")
              .map((node) => <CanvasNodeCard key={node.id} node={node} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
