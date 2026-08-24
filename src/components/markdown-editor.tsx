"use client";

import {
  Bold,
  Code2,
  Eye,
  Heading2,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  PencilLine,
  Quote,
} from "lucide-react";
import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type MarkdownEditorProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
};

type MarkdownMode = "write" | "preview";

const markdownTools = [
  { label: "Bold", icon: Bold, before: "**", after: "**", fallback: "bold text" },
  { label: "Italic", icon: Italic, before: "_", after: "_", fallback: "italic text" },
  { label: "Heading", icon: Heading2, prefix: "## ", fallback: "Heading" },
  { label: "Bulleted list", icon: List, prefix: "- ", fallback: "List item" },
  { label: "Numbered list", icon: ListOrdered, prefix: "1. ", fallback: "List item" },
  { label: "Quote", icon: Quote, prefix: "> ", fallback: "Quote" },
  { label: "Code", icon: Code2, before: "`", after: "`", fallback: "code" },
  { label: "Link", icon: LinkIcon, before: "[", after: "](https://)", fallback: "link text" },
] as const;

export function MarkdownEditor({
  id,
  value,
  onChange,
  placeholder = "Write in Markdown...",
  minHeight = "min-h-64",
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<MarkdownMode>("write");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function replaceSelection(
    before: string,
    after: string,
    fallback: string,
  ) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end) || fallback;
    const nextValue = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
    onChange(nextValue);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selected.length,
      );
    });
  }

  function prefixSelection(prefix: string, fallback: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end) || fallback;
    const prefixed = selected
      .split("\n")
      .map((line) => `${prefix}${line}`)
      .join("\n");
    const nextValue = `${value.slice(0, start)}${prefixed}${value.slice(end)}`;
    onChange(nextValue);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefixed.length);
    });
  }

  return (
    <div className="border-input bg-card overflow-hidden rounded-xl border">
      <div className="bg-muted/30 flex min-h-10 items-center justify-between gap-2 border-b px-2 py-1.5">
        <div className="flex flex-wrap items-center gap-0.5">
          {mode === "write"
            ? markdownTools.map((tool) => {
                const Icon = tool.icon;
                return (
                <Button
                  key={tool.label}
                  type="button"
                  title={tool.label}
                  aria-label={tool.label}
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => {
                    if ("prefix" in tool) {
                      prefixSelection(tool.prefix, tool.fallback);
                    } else {
                      replaceSelection(tool.before, tool.after, tool.fallback);
                    }
                  }}
                >
                  <Icon className="size-3.5" />
                </Button>
                );
              })
            : <span className="text-muted-foreground px-2 text-xs">Rendered Markdown</span>}
        </div>
        <div className="bg-background flex shrink-0 rounded-md border p-0.5">
          <button
            type="button"
            onClick={() => setMode("write")}
            aria-pressed={mode === "write"}
            className={cn(
              "text-muted-foreground flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium",
              mode === "write" && "bg-accent text-accent-foreground",
            )}
          >
            <PencilLine className="size-3" /> Write
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            aria-pressed={mode === "preview"}
            className={cn(
              "text-muted-foreground flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium",
              mode === "preview" && "bg-accent text-accent-foreground",
            )}
          >
            <Eye className="size-3" /> Preview
          </button>
        </div>
      </div>

      {mode === "write" ? (
        <Textarea
          ref={textareaRef}
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          spellCheck
          className={cn(
            minHeight,
            "field-sizing-fixed resize-y rounded-none border-0 bg-transparent px-4 py-3 font-mono text-[13px] leading-6 shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent",
          )}
        />
      ) : (
        <div className={cn(minHeight, "overflow-auto px-5 py-4 text-sm")}>
          {value.trim() ? (
            <MarkdownPreview content={value} />
          ) : (
            <p className="text-muted-foreground">Nothing to preview yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

export function MarkdownPreview({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h1 className="mt-6 mb-3 text-2xl font-semibold first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="mt-5 mb-2 text-xl font-semibold first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="mt-4 mb-2 text-base font-semibold first:mt-0">{children}</h3>,
        p: ({ children }) => <p className="my-2.5 leading-6 first:mt-0 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="my-3 list-disc space-y-1 pl-6">{children}</ul>,
        ol: ({ children }) => <ol className="my-3 list-decimal space-y-1 pl-6">{children}</ol>,
        blockquote: ({ children }) => <blockquote className="text-muted-foreground my-4 border-l-4 pl-4 italic">{children}</blockquote>,
        a: ({ href, children }) => (
          <a
            href={href}
            target={href?.startsWith("http") ? "_blank" : undefined}
            rel={href?.startsWith("http") ? "noreferrer" : undefined}
            className="text-primary font-medium underline underline-offset-4"
          >
            {children}
          </a>
        ),
        pre: ({ children }) => <pre className="bg-muted my-4 overflow-x-auto rounded-lg p-4 text-xs leading-5">{children}</pre>,
        code: ({ children }) => <code className="bg-muted rounded px-1 py-0.5 font-mono text-[0.9em]">{children}</code>,
        hr: () => <hr className="my-5 border-border" />,
        table: ({ children }) => <div className="my-4 overflow-x-auto"><table className="w-full border-collapse text-sm">{children}</table></div>,
        th: ({ children }) => <th className="bg-muted border px-3 py-2 text-left font-medium">{children}</th>,
        td: ({ children }) => <td className="border px-3 py-2">{children}</td>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
