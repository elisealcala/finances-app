import "server-only";
import { createHash } from "node:crypto";
import { env } from "@/env";

type GitHubRepository = {
  html_url: string;
  full_name: string;
  description: string | null;
  default_branch: string;
  language: string | null;
  topics: string[];
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  pushed_at: string | null;
};

function githubHeaders() {
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(env.GITHUB_TOKEN
      ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` }
      : {}),
  };
}

function repositoryParts(url: string): { owner: string; repo: string } | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "github.com" && parsed.hostname !== "www.github.com") {
      return null;
    }
    const [owner, rawRepo] = parsed.pathname.split("/").filter(Boolean);
    if (!owner || !rawRepo) return null;
    return { owner, repo: rawRepo.replace(/\.git$/, "") };
  } catch {
    return null;
  }
}

async function githubFetch<T>(path: string): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: githubHeaders(),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`GitHub request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export async function collectGitHubEvidence(url: string) {
  const parts = repositoryParts(url);
  if (!parts) return null;
  const base = `/repos/${encodeURIComponent(parts.owner)}/${encodeURIComponent(parts.repo)}`;

  const [repository, readme, commits, pulls, workflows] = await Promise.all([
    githubFetch<GitHubRepository>(base),
    githubFetch<{ content?: string; encoding?: string }>(`${base}/readme`).catch(
      () => null,
    ),
    githubFetch<
      Array<{
        sha: string;
        html_url: string;
        commit: { message: string; author: { name: string; date: string } | null };
      }>
    >(`${base}/commits?per_page=10`).catch(() => []),
    githubFetch<
      Array<{
        number: number;
        title: string;
        state: string;
        merged_at: string | null;
        html_url: string;
      }>
    >(`${base}/pulls?state=all&per_page=10`).catch(() => []),
    githubFetch<{
      workflow_runs: Array<{
        name: string;
        status: string;
        conclusion: string | null;
        head_sha: string;
        html_url: string;
        updated_at: string;
      }>;
    }>(`${base}/actions/runs?per_page=10`).catch(() => ({ workflow_runs: [] })),
  ]);

  const readmeText =
    readme?.encoding === "base64" && readme.content
      ? Buffer.from(readme.content.replace(/\s/g, ""), "base64")
          .toString("utf8")
          .slice(0, 14_000)
      : null;
  const evidence = {
    repository,
    readme: readmeText,
    commits: commits.map((commit) => ({
      sha: commit.sha,
      url: commit.html_url,
      message: commit.commit.message,
      author: commit.commit.author,
    })),
    pullRequests: pulls,
    workflowRuns: workflows.workflow_runs,
    collectedAt: new Date().toISOString(),
  };

  return {
    evidence,
    snapshotHash: createHash("sha256")
      .update(JSON.stringify(evidence))
      .digest("hex"),
  };
}

export async function createGitHubRepository(input: {
  name: string;
  description?: string;
  isPrivate: boolean;
}) {
  if (!env.GITHUB_TOKEN) {
    throw new Error("GITHUB_TOKEN is required to create a repository");
  }
  const response = await fetch("https://api.github.com/user/repos", {
    method: "POST",
    headers: { ...githubHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      name: input.name,
      description: input.description,
      private: input.isPrivate,
      auto_init: true,
      has_issues: true,
      has_projects: true,
    }),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(payload?.message || `GitHub request failed (${response.status})`);
  }
  return (await response.json()) as GitHubRepository;
}
