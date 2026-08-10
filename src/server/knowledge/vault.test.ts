import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, test } from "node:test";

import {
  normalizeKnowledgeTag,
  parseKnowledgeMarkdown,
  readKnowledgeVault,
} from "./vault";

const modifiedAt = new Date("2026-08-06T12:00:00.000Z");

describe("normalizeKnowledgeTag", () => {
  test("normalizes Obsidian tags into a stable matching format", () => {
    assert.equal(normalizeKnowledgeTag("  #Career Performance  "), "career-performance");
    assert.equal(normalizeKnowledgeTag("Platform_Engineering"), "platform-engineering");
    assert.equal(normalizeKnowledgeTag("work/Technical Leadership"), "work/technical-leadership");
  });

  test("removes unsupported punctuation and empty tag markers", () => {
    assert.equal(normalizeKnowledgeTag("#Evidence:Shipped!"), "evidenceshipped");
    assert.equal(normalizeKnowledgeTag("###"), "");
  });
});

describe("parseKnowledgeMarkdown", () => {
  test("extracts frontmatter, normalized tags, title, excerpt, and pillar", () => {
    const raw = `---
knowledge_id: platform-rollout
tags:
  - "#Career Performance"
  - platform_engineering
  - platform-engineering
owner: Elizabeth
---
# Platform rollout

Shipped the [[Developer Portal|portal]] and documented the [launch](https://example.com).
`;
    const relativePath = path.join("engineering", "platform", "rollout.md");

    const result = parseKnowledgeMarkdown({ raw, relativePath, modifiedAt });

    assert.equal(result.sourceId, "platform-rollout");
    assert.equal(result.relativePath, "engineering/platform/rollout.md");
    assert.equal(result.title, "Platform rollout");
    assert.equal(result.pillar, "engineering");
    assert.deepEqual(result.tags, ["career-performance", "platform-engineering"]);
    assert.deepEqual(result.frontmatter, {
      knowledge_id: "platform-rollout",
      tags: [
        "#Career Performance",
        "platform_engineering",
        "platform-engineering",
      ],
      owner: "Elizabeth",
    });
    assert.match(result.excerpt ?? "", /Platform rollout/);
    assert.match(result.excerpt ?? "", /portal/);
    assert.equal(result.modifiedAt, modifiedAt);
    assert.equal(result.canvas, null);
    assert.equal(result.canvasHash, null);
    assert.equal(result.canvasModifiedAt, null);
  });

  test("accepts comma-separated tags and falls back to a filename title", () => {
    const result = parseKnowledgeMarkdown({
      raw: `---
tags: "delivery, #Customer Impact, delivery"
---
An outcome-focused note without a heading.
`,
      relativePath: "customer-impact_notes.md",
      modifiedAt,
    });

    assert.equal(result.sourceId, null);
    assert.equal(result.title, "customer impact notes");
    assert.equal(result.pillar, null);
    assert.deepEqual(result.tags, ["customer-impact", "delivery"]);
    assert.equal(
      result.excerpt,
      "An outcome focused note without a heading.",
    );
  });

  test("returns a null excerpt for a note with no body text", () => {
    const result = parseKnowledgeMarkdown({
      raw: `---
tags: []
---
`,
      relativePath: "empty-note.md",
      modifiedAt,
    });

    assert.equal(result.title, "empty note");
    assert.equal(result.excerpt, null);
    assert.equal(result.content, "");
    assert.deepEqual(result.tags, []);
  });

  test("normalizes a date-only frontmatter value to midday UTC", () => {
    const result = parseKnowledgeMarkdown({
      raw: `---
date: 2026-08-05
---
# Dated note
`,
      relativePath: "dated-note.md",
      modifiedAt,
    });

    assert.equal(result.date.toISOString(), "2026-08-05T12:00:00.000Z");
  });

  test("preserves the instant from a timestamp frontmatter value", () => {
    const result = parseKnowledgeMarkdown({
      raw: `---
date: 2026-08-05T18:45:30-05:00
---
# Timestamped note
`,
      relativePath: "timestamped-note.md",
      modifiedAt,
    });

    assert.equal(result.date.toISOString(), "2026-08-05T23:45:30.000Z");
  });

  test("falls back to modifiedAt when date frontmatter is missing", () => {
    const result = parseKnowledgeMarkdown({
      raw: "# Undated note\n",
      relativePath: "undated-note.md",
      modifiedAt,
    });

    assert.equal(result.date, modifiedAt);
  });

  test("falls back to modifiedAt when date frontmatter is invalid", () => {
    const result = parseKnowledgeMarkdown({
      raw: `---
date: definitely-not-a-date
---
# Invalidly dated note
`,
      relativePath: "invalidly-dated-note.md",
      modifiedAt,
    });

    assert.equal(result.date, modifiedAt);
  });

  test("keeps hashes stable for identical source and changes them with content", () => {
    const input = {
      raw: "# Stable note\n\nThe same source.",
      relativePath: "evidence/stable.md",
      modifiedAt,
    };

    const first = parseKnowledgeMarkdown(input);
    const second = parseKnowledgeMarkdown({
      ...input,
      modifiedAt: new Date("2026-08-07T12:00:00.000Z"),
    });
    const changed = parseKnowledgeMarkdown({
      ...input,
      raw: `${input.raw}\nA new observation.`,
    });

    assert.equal(first.contentHash, second.contentHash);
    assert.notEqual(first.contentHash, changed.contentHash);
    assert.match(first.contentHash, /^[a-f0-9]{64}$/);
  });
});

describe("readKnowledgeVault", () => {
  test("pairs a same-basename canvas with its Markdown note", async () => {
    const vaultRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "finances-app-knowledge-vault-"),
    );

    try {
      await fs.mkdir(path.join(vaultRoot, "engineering"));
      await fs.writeFile(
        path.join(vaultRoot, "engineering", "validation.md"),
        "# Validation\n\nValidate before the wire.",
      );
      await fs.writeFile(
        path.join(vaultRoot, "engineering", "validation.canvas"),
        JSON.stringify({
          nodes: [
            {
              id: "text-1",
              type: "text",
              text: "Caller-side validation",
              x: 0,
              y: 0,
              width: 320,
              height: 180,
            },
          ],
        }),
      );
      await fs.writeFile(
        path.join(vaultRoot, "engineering", "without-canvas.md"),
        "# Without canvas\n",
      );

      const result = await readKnowledgeVault(vaultRoot);
      const withCanvas = result.documents.find(
        (document) => document.relativePath === "engineering/validation.md",
      );
      const withoutCanvas = result.documents.find(
        (document) => document.relativePath === "engineering/without-canvas.md",
      );

      assert.ok(withCanvas);
      assert.deepEqual(withCanvas.canvas, {
        nodes: [
          {
            id: "text-1",
            type: "text",
            text: "Caller-side validation",
            x: 0,
            y: 0,
            width: 320,
            height: 180,
          },
        ],
        edges: [],
      });
      assert.match(withCanvas.canvasHash ?? "", /^[a-f0-9]{64}$/);
      assert.ok(withCanvas.canvasModifiedAt instanceof Date);

      assert.ok(withoutCanvas);
      assert.equal(withoutCanvas.canvas, null);
      assert.equal(withoutCanvas.canvasHash, null);
      assert.equal(withoutCanvas.canvasModifiedAt, null);
    } finally {
      await fs.rm(vaultRoot, { recursive: true, force: true });
    }
  });
});
