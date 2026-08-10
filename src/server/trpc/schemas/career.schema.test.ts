import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  careerOutputSubmissionSchema,
  careerProfileSchema,
  resumeContentSchema,
} from "./career.schema";

function createProfile(overrides: Record<string, unknown> = {}) {
  return {
    fullName: "Ada Lovelace",
    headline: "Software engineer",
    email: "ada@example.com",
    phone: "+51 999 555 111",
    location: "Lima, Peru",
    website: "https://ada.example.com",
    githubUrl: "https://github.com/ada",
    linkedInUrl: "",
    summary: "I build reliable systems and useful developer tooling.",
    skills: ["TypeScript", "PostgreSQL"],
    ...overrides,
  };
}

function createResumeContent(overrides: Record<string, unknown> = {}) {
  return {
    personal: {
      fullName: "Ada Lovelace",
      headline: "Software engineer",
      email: "ada@example.com",
      phone: "+51 999 555 111",
      location: "Lima, Peru",
      links: [
        { label: "GitHub", url: "https://github.com/ada" },
        { label: "Portfolio", url: "https://ada.example.com" },
      ],
    },
    summary:
      "Software engineer focused on reliable systems and measurable outcomes.",
    experiences: [
      {
        sourceId: "experience-1",
        company: "Analytical Engines",
        role: "Senior Software Engineer",
        location: "Remote",
        startDate: "Jan 2024",
        endDate: "Present",
        bullets: ["Reduced deployment time by improving release automation."],
      },
    ],
    education: [
      {
        sourceId: "education-1",
        institution: "University of London",
        degree: "BSc Mathematics",
        date: "2020",
        details: "Focused on applied mathematics and computing.",
      },
    ],
    skills: ["TypeScript", "PostgreSQL"],
    projects: [
      {
        sourceId: "project-1",
        title: "Career Evidence Tracker",
        description: "Tracks career outputs against measurable rubrics.",
        url: "https://ada.example.com/career-tracker",
        bullets: ["Added auditable evidence collection for each output."],
      },
    ],
    ...overrides,
  };
}

describe("careerOutputSubmissionSchema", () => {
  test("accepts custom form data with nested values", () => {
    const data = {
      projectName: "Career Evidence Tracker",
      shipped: true,
      metrics: { users: 42, satisfaction: 4.8 },
      collaborators: ["Design", "Platform"],
    };

    const result = careerOutputSubmissionSchema.parse({
      keyResultId: "output-1",
      kind: "FORM",
      label: "Quarterly impact form",
      notes: "Submitted after the project review.",
      data,
    });

    assert.deepEqual(result.data, data);
  });

  test("defaults omitted custom data to an empty object", () => {
    const result = careerOutputSubmissionSchema.parse({
      keyResultId: "output-1",
      kind: "MANUAL",
    });

    assert.deepEqual(result.data, {});
  });

  test("rejects invalid identifiers, output kinds, and evidence URLs", () => {
    const cases = [
      {
        input: { keyResultId: "", kind: "FORM" },
        path: ["keyResultId"],
      },
      {
        input: { keyResultId: "output-1", kind: "SURVEY" },
        path: ["kind"],
      },
      {
        input: {
          keyResultId: "output-1",
          kind: "LINK",
          url: "not-a-url",
        },
        path: ["url"],
      },
      {
        input: {
          keyResultId: "output-1",
          kind: "FORM",
          data: ["not", "a", "field", "record"],
        },
        path: ["data"],
      },
    ];

    for (const { input, path } of cases) {
      const result = careerOutputSubmissionSchema.safeParse(input);

      assert.equal(result.success, false);
      if (!result.success) {
        assert.deepEqual(result.error.issues[0]?.path, path);
      }
    }
  });
});

describe("careerProfileSchema", () => {
  test("accepts a complete profile and empty optional contact links", () => {
    const result = careerProfileSchema.parse(
      createProfile({ website: "", linkedInUrl: null }),
    );

    assert.equal(result.website, "");
    assert.equal(result.linkedInUrl, null);
    assert.deepEqual(result.skills, ["TypeScript", "PostgreSQL"]);
  });

  test("accepts an empty email for an incomplete profile", () => {
    const result = careerProfileSchema.parse(createProfile({ email: "" }));

    assert.equal(result.email, "");
  });

  test("rejects invalid contact details and blank skills", () => {
    const cases = [
      { overrides: { email: "ada-at-example.com" }, path: ["email"] },
      { overrides: { githubUrl: "github.com/ada" }, path: ["githubUrl"] },
      { overrides: { skills: [""] }, path: ["skills", 0] },
    ];

    for (const { overrides, path } of cases) {
      const result = careerProfileSchema.safeParse(createProfile(overrides));

      assert.equal(result.success, false);
      if (!result.success) {
        assert.deepEqual(result.error.issues[0]?.path, path);
      }
    }
  });
});

describe("resumeContentSchema", () => {
  test("accepts a complete, source-linked resume", () => {
    const result = resumeContentSchema.safeParse(createResumeContent());

    assert.equal(result.success, true);
  });

  test("rejects invalid required content and links", () => {
    const base = createResumeContent();
    const cases = [
      {
        input: createResumeContent({ summary: "Too short" }),
        path: ["summary"],
      },
      {
        input: createResumeContent({
          personal: {
            ...(base.personal as Record<string, unknown>),
            links: [{ label: "GitHub", url: "github.com/ada" }],
          },
        }),
        path: ["personal", "links", 0, "url"],
      },
      {
        input: createResumeContent({
          experiences: [
            {
              ...(
                base.experiences as Array<Record<string, unknown>>
              )[0],
              company: "",
            },
          ],
        }),
        path: ["experiences", 0, "company"],
      },
      {
        input: createResumeContent({
          projects: [
            {
              ...(base.projects as Array<Record<string, unknown>>)[0],
              description: "tiny",
            },
          ],
        }),
        path: ["projects", 0, "description"],
      },
    ];

    for (const { input, path } of cases) {
      const result = resumeContentSchema.safeParse(input);

      assert.equal(result.success, false);
      if (!result.success) {
        assert.deepEqual(result.error.issues[0]?.path, path);
      }
    }
  });
});
