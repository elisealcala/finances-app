import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { parseObsidianCanvas } from "./canvas";

const baseNode = {
  x: 10,
  y: -20,
  width: 320,
  height: 180,
};

describe("parseObsidianCanvas", () => {
  test("parses supported node types and their connecting edges", () => {
    const canvas = {
      nodes: [
        {
          ...baseNode,
          id: "text-1",
          type: "text",
          text: "# Validation boundary\n\nValidate before sending.",
          color: "4",
        },
        {
          ...baseNode,
          id: "group-1",
          type: "group",
          label: "Caller",
        },
        {
          ...baseNode,
          id: "link-1",
          type: "link",
          url: "https://example.com/reference",
        },
        {
          ...baseNode,
          id: "file-1",
          type: "file",
          file: "engineering/validator.md",
          subpath: "#Failure behavior",
        },
      ],
      edges: [
        {
          id: "edge-1",
          fromNode: "text-1",
          toNode: "file-1",
          fromSide: "right",
          toSide: "left",
          fromEnd: "none",
          toEnd: "arrow",
          color: "#6f5cff",
          label: "documents",
        },
      ],
    };

    assert.deepEqual(parseObsidianCanvas(JSON.stringify(canvas)), canvas);
  });

  test("defaults a missing edge collection to an empty array", () => {
    const result = parseObsidianCanvas(
      JSON.stringify({
        nodes: [
          {
            ...baseNode,
            id: "text-1",
            type: "text",
            text: "Standalone idea",
          },
        ],
      }),
    );

    assert.deepEqual(result.edges, []);
  });

  test("accepts both HTTP and HTTPS links", () => {
    for (const url of ["http://example.com", "https://example.com"]) {
      const result = parseObsidianCanvas(
        JSON.stringify({
          nodes: [{ ...baseNode, id: url, type: "link", url }],
        }),
      );

      assert.equal(result.nodes[0]?.type, "link");
    }
  });

  test("rejects unsafe and non-HTTP link schemes", () => {
    for (const url of [
      "javascript:alert(document.domain)",
      "file:///Users/example/private.md",
      "mailto:person@example.com",
      "obsidian://open?vault=knowledge",
    ]) {
      assert.throws(() =>
        parseObsidianCanvas(
          JSON.stringify({
            nodes: [{ ...baseNode, id: "unsafe-link", type: "link", url }],
          }),
        ),
      );
    }
  });

  test("rejects coordinates and dimensions outside the supported bounds", () => {
    for (const invalidFields of [
      { x: 100_001 },
      { y: -100_001 },
      { width: 0 },
      { height: -1 },
      { width: 20_001 },
      { x: "10" },
    ]) {
      assert.throws(() =>
        parseObsidianCanvas(
          JSON.stringify({
            nodes: [
              {
                ...baseNode,
                ...invalidFields,
                id: "invalid-node",
                type: "text",
                text: "Invalid geometry",
              },
            ],
          }),
        ),
      );
    }
  });

  test("rejects invalid JSON before schema validation", () => {
    assert.throws(
      () => parseObsidianCanvas('{"nodes": ['),
      SyntaxError,
    );
  });
});
