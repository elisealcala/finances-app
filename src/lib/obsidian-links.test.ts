import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  type ObsidianLinkDocument,
  resolveObsidianWikiLinks,
} from "./obsidian-links";

const documents: ObsidianLinkDocument[] = [
  { id: "root-index", relativePath: "_index.md", title: "Knowledge index" },
  { id: "roadmap", relativePath: "_roadmap.md", title: "Roadmap" },
  {
    id: "engineering-index",
    relativePath: "engineering/_index.md",
    title: "Engineering",
  },
  {
    id: "delivery",
    relativePath: "engineering/delivery.md",
    title: "Delivery",
  },
  {
    id: "incident-review",
    relativePath: "operations/incident-review.md",
    title: "Incident review",
  },
  {
    id: "engineering-shared",
    relativePath: "engineering/shared.md",
    title: "Engineering shared",
  },
  {
    id: "operations-shared",
    relativePath: "operations/shared.md",
    title: "Operations shared",
  },
];

function resolve(content: string, currentRelativePath = "_index.md") {
  return resolveObsidianWikiLinks({
    content,
    currentRelativePath,
    documents,
  });
}

describe("resolveObsidianWikiLinks", () => {
  test("resolves root and category index links, including escaped table aliases", () => {
    const content = [
      "[[_index|Home]]",
      "| Category | Link |",
      "| --- | --- |",
      String.raw`| Engineering | [[engineering/_index\|Open category]] |`,
    ].join("\n");

    assert.equal(
      resolve(content),
      [
        "[Home](/career/knowledge)",
        "| Category | Link |",
        "| --- | --- |",
        "| Engineering | [Open category](/career/knowledge/engineering-index) |",
      ].join("\n"),
    );
  });

  test("prefers a same-category relative link", () => {
    assert.equal(
      resolve("[[delivery]]", "engineering/_index.md"),
      "[Delivery](/career/knowledge/delivery)",
    );
  });

  test("falls back to a unique basename in another category", () => {
    assert.equal(
      resolve("[[incident-review]]", "engineering/delivery.md"),
      "[Incident review](/career/knowledge/incident-review)",
    );
  });

  test("routes the root roadmap to the knowledge landing page", () => {
    assert.equal(
      resolve("[[_roadmap|View roadmap]]", "engineering/delivery.md"),
      "[View roadmap](/career/knowledge)",
    );
  });

  test("adds normalized heading anchors to resolved links", () => {
    assert.equal(
      resolve(
        "[[delivery#Key Takeaways & Next Steps|Read the takeaways]]",
        "engineering/_index.md",
      ),
      "[Read the takeaways](/career/knowledge/delivery#key-takeaways-next-steps)",
    );
  });

  test("renders unresolved and ambiguous links as plain text", () => {
    assert.equal(
      resolve(
        "[[missing-note|Missing]] / [[shared]] / [[unknown#Next Steps]]",
        "_index.md",
      ),
      "Missing / shared / Next Steps",
    );
  });

  test("preserves wiki links inside fenced code blocks", () => {
    const content = [
      "[[delivery]]",
      "",
      "```md",
      "[[delivery]]",
      "[[missing-note|Missing]]",
      "```",
    ].join("\n");

    assert.equal(
      resolve(content, "engineering/_index.md"),
      [
        "[Delivery](/career/knowledge/delivery)",
        "",
        "```md",
        "[[delivery]]",
        "[[missing-note|Missing]]",
        "```",
      ].join("\n"),
    );
  });
});
