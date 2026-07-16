type TiptapNode = {
  type?: string;
  text?: string;
  content?: TiptapNode[];
};

export function extractPlainText(doc: unknown, maxLength = 200): string {
  if (!doc || typeof doc !== "object") return "";
  const node = doc as TiptapNode;
  const parts: string[] = [];

  function walk(n: TiptapNode) {
    if (n.text) parts.push(n.text);
    if (n.content) {
      for (const child of n.content) walk(child);
      if (n.type === "paragraph" || n.type === "heading") parts.push(" ");
    }
  }

  walk(node);
  const text = parts.join("").replace(/\s+/g, " ").trim();
  return text.length > maxLength ? text.slice(0, maxLength) + "…" : text;
}
