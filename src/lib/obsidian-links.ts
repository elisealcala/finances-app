export type ObsidianLinkDocument = {
  id: string;
  relativePath: string;
  title: string;
};

function withoutMarkdownExtension(value: string) {
  return value.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\.md$/i, "");
}

function pathWithoutExtension(value: string) {
  return withoutMarkdownExtension(value).toLowerCase();
}

export function obsidianHeadingSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function resolveDocument(
  target: string,
  currentRelativePath: string,
  documents: ObsidianLinkDocument[],
) {
  const normalizedTarget = pathWithoutExtension(target);
  const currentDirectory = withoutMarkdownExtension(currentRelativePath)
    .split("/")
    .slice(0, -1)
    .join("/");
  const candidates = [
    currentDirectory ? `${currentDirectory}/${normalizedTarget}` : normalizedTarget,
    normalizedTarget,
  ].map((candidate) => candidate.toLowerCase());

  for (const candidate of candidates) {
    const exact = documents.find(
      (document) => pathWithoutExtension(document.relativePath) === candidate,
    );
    if (exact) return exact;
  }

  if (!normalizedTarget.includes("/")) {
    const basenameMatches = documents.filter(
      (document) =>
        pathWithoutExtension(document.relativePath).split("/").at(-1) ===
        normalizedTarget,
    );
    if (basenameMatches.length === 1) return basenameMatches[0];
  }

  return undefined;
}

function splitWikiLink(value: string) {
  const divider = value.search(/\\?\|/);
  if (divider === -1) return { target: value, label: undefined };
  const escapedDivider = value[divider] === "\\";
  return {
    target: value.slice(0, divider),
    label: value.slice(divider + (escapedDivider ? 2 : 1)),
  };
}

function replaceWikiLinksInText(
  content: string,
  currentRelativePath: string,
  documents: ObsidianLinkDocument[],
) {
  return content.replace(/(!?)\[\[([^\]\n]+)\]\]/g, (match, embed, rawValue) => {
    if (embed) return match;

    const { target: targetWithHeading, label } = splitWikiLink(String(rawValue));
    const [target, heading] = targetWithHeading.split("#", 2);
    const cleanTarget = target?.trim() ?? "";
    const document = resolveDocument(cleanTarget, currentRelativePath, documents);
    const linkLabel = label?.trim() || heading?.trim() || document?.title || cleanTarget;
    if (!document) return linkLabel;

    const basePath =
      document.relativePath === "_roadmap.md" ||
      document.relativePath === "_index.md"
        ? "/career/knowledge"
        : `/career/knowledge/${document.id}`;
    const hash = heading ? `#${obsidianHeadingSlug(heading)}` : "";
    return `[${linkLabel}](${basePath}${hash})`;
  });
}

export function resolveObsidianWikiLinks(input: {
  content: string;
  currentRelativePath: string;
  documents: ObsidianLinkDocument[];
}) {
  return input.content
    .split(/(```[\s\S]*?```)/g)
    .map((part, index) =>
      index % 2 === 1
        ? part
        : replaceWikiLinksInText(
            part,
            input.currentRelativePath,
            input.documents,
          ),
    )
    .join("");
}
