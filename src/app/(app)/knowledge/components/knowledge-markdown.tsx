"use client";

import { Check, Copy } from "lucide-react";
import { Highlight, themes } from "prism-react-renderer";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function KnowledgeCodeBlock({
  code,
  language,
}: {
  code: string;
  language: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  }

  return (
    <div className="group/code bg-slate-950 my-5 overflow-hidden rounded-xl border border-slate-800 shadow-sm">
      <div className="flex h-10 items-center justify-between border-b border-slate-800 px-3">
        <span className="font-mono text-[11px] font-medium tracking-wide text-slate-400 uppercase">
          {language || "code"}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 px-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <Highlight theme={themes.oneDark} code={code} language={language || "text"}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className={cn(className, "overflow-x-auto py-4 text-[13px] leading-6")}
            style={{ ...style, margin: 0, background: "transparent" }}
          >
            <code>
              {tokens.map((line, lineIndex) => (
                <span
                  key={lineIndex}
                  {...getLineProps({ line })}
                  className="table-row"
                >
                  <span className="table-cell w-11 border-r border-slate-800 px-3 text-right text-slate-600 select-none">
                    {lineIndex + 1}
                  </span>
                  <span className="table-cell px-4">
                    {line.map((token, tokenIndex) => (
                      <span key={tokenIndex} {...getTokenProps({ token })} />
                    ))}
                  </span>
                </span>
              ))}
            </code>
          </pre>
        )}
      </Highlight>
    </div>
  );
}

export function KnowledgeMarkdown({
  content,
  compact = false,
}: {
  content: string;
  compact?: boolean;
}) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1
            className={cn(
              "font-semibold tracking-tight",
              compact ? "mb-2 text-base" : "mb-5 text-3xl",
            )}
          >
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2
            className={cn(
              "font-semibold tracking-tight",
              compact ? "mt-3 mb-1 text-sm" : "mt-8 mb-3 text-xl",
            )}
          >
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className={compact ? "mt-2 text-sm font-semibold" : "mt-6 mb-2 text-lg font-semibold"}>
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p className={compact ? "my-1.5 leading-5" : "my-3 leading-7"}>{children}</p>
        ),
        ul: ({ children }) => (
          <ul className={cn("list-disc pl-6", compact ? "my-2 space-y-1" : "my-4 space-y-2")}>
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className={cn("list-decimal pl-6", compact ? "my-2 space-y-1" : "my-4 space-y-2")}>
            {children}
          </ol>
        ),
        blockquote: ({ children }) => (
          <blockquote className="text-muted-foreground my-5 border-l-4 pl-4 italic">
            {children}
          </blockquote>
        ),
        a: ({ href, children }) => {
          const external = href?.startsWith("http://") || href?.startsWith("https://");
          return (
            <a
              href={href}
              className="text-primary font-medium underline underline-offset-4"
              target={external ? "_blank" : undefined}
              rel={external ? "noreferrer" : undefined}
            >
              {children}
            </a>
          );
        },
        pre: ({ children }) => <>{children}</>,
        code: ({ className, children }) => {
          const code = String(children).replace(/\n$/, "");
          const language = className?.match(/language-([^\s]+)/)?.[1] ?? "";
          if (language || code.includes("\n")) {
            return <KnowledgeCodeBlock code={code} language={language} />;
          }
          return (
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[0.88em]">
              {children}
            </code>
          );
        },
        table: ({ children }) => (
          <div className="my-5 overflow-x-auto">
            <table className="w-full border-collapse text-sm">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="bg-muted border px-3 py-2 text-left font-semibold">{children}</th>
        ),
        td: ({ children }) => <td className="border px-3 py-2">{children}</td>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
