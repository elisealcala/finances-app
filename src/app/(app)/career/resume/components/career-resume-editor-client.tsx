"use client";

import { ArrowLeft, Download, Save, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, PageShell } from "@/components/page";
import {
  useCareerResume,
  useGenerateCareerResume,
  useSaveCareerResume,
} from "@/hooks/use-career";
import { resumeContentSchema } from "@/server/trpc/schemas/career.schema";
import type { ResumeContent } from "@/types/career";
import { ResumePreview } from "./resume-preview";

function lines(value: string) {
  return value.split("\n").map((item) => item.trim()).filter(Boolean);
}

export function CareerResumeEditorClient({ id }: { id: string }) {
  const resume = useCareerResume(id);
  const save = useSaveCareerResume();
  const generate = useGenerateCareerResume();
  const [content, setContent] = useState<ResumeContent | null>(null);
  const [version, setVersion] = useState<number | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- initialize editor from selected version */
  useEffect(() => {
    const latest = resume.data?.versions[0];
    if (!latest) return;
    const parsed = resumeContentSchema.safeParse(latest.content);
    if (parsed.success) {
      setContent(parsed.data);
      setVersion(latest.version);
    }
  }, [resume.data]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleSave() {
    if (!content) return;
    try {
      const result = await save.mutateAsync({ resumeId: id, content });
      setVersion(result.version);
      toast.success(`Saved version ${result.version}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save resume");
    }
  }

  async function regenerate() {
    if (!resume.data?.opportunityId) return;
    try {
      const result = await generate.mutateAsync({
        opportunityId: resume.data.opportunityId,
        resumeId: id,
      });
      const parsed = resumeContentSchema.safeParse(result.version.content);
      if (parsed.success) setContent(parsed.data);
      setVersion(result.version.version);
      toast.success("A new tailored version was generated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not regenerate resume");
    }
  }

  if (!resume.data || !content) {
    return <PageShell><p className="text-muted-foreground text-sm">Loading resume…</p></PageShell>;
  }

  const updatePersonal = (key: keyof ResumeContent["personal"], value: string) =>
    setContent((current) =>
      current ? { ...current, personal: { ...current.personal, [key]: value } } : current,
    );

  return (
    <PageShell width="full">
      <Button asChild variant="ghost" size="sm" className="w-fit"><Link href="/career/resume"><ArrowLeft className="size-4" /> Resume home</Link></Button>
      <PageHeader
        title={resume.data.title}
        description={`Version ${version ?? "—"}${resume.data.opportunity ? ` · ${resume.data.opportunity.role} at ${resume.data.opportunity.company}` : ""}`}
        actions={
          <>
            {resume.data.opportunityId ? <Button variant="outline" onClick={regenerate} disabled={generate.isPending}><Sparkles className="size-4" /> Regenerate</Button> : null}
            <Button variant="outline" asChild><a href={`/api/career/resume/${id}/pdf?version=${version ?? "latest"}`}><Download className="size-4" /> PDF</a></Button>
            <Button onClick={handleSave} disabled={save.isPending}><Save className="size-4" /> {save.isPending ? "Saving…" : "Save version"}</Button>
          </>
        }
      />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(620px,0.9fr)]">
        <div className="grid gap-5">
          <Card><CardHeader><CardTitle className="text-base">Header and summary</CardTitle></CardHeader><CardContent className="grid gap-4"><div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label>Full name</Label><Input value={content.personal.fullName} onChange={(e) => updatePersonal("fullName", e.target.value)} /></div><div className="grid gap-2"><Label>Headline</Label><Input value={content.personal.headline} onChange={(e) => updatePersonal("headline", e.target.value)} /></div><div className="grid gap-2"><Label>Email</Label><Input value={content.personal.email} onChange={(e) => updatePersonal("email", e.target.value)} /></div><div className="grid gap-2"><Label>Phone</Label><Input value={content.personal.phone} onChange={(e) => updatePersonal("phone", e.target.value)} /></div><div className="grid gap-2"><Label>Location</Label><Input value={content.personal.location} onChange={(e) => updatePersonal("location", e.target.value)} /></div></div><div className="grid gap-2"><Label>Professional summary</Label><Textarea value={content.summary} onChange={(e) => setContent({ ...content, summary: e.target.value })} className="min-h-32" /></div><div className="grid gap-2"><Label>Skills</Label><Textarea value={content.skills.join(", ")} onChange={(e) => setContent({ ...content, skills: e.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} /></div></CardContent></Card>
          {content.experiences.map((experience, index) => <Card key={`${experience.sourceId}-${index}`}><CardHeader><CardTitle className="text-base">{experience.role} · {experience.company}</CardTitle></CardHeader><CardContent className="grid gap-4"><div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label>Role</Label><Input value={experience.role} onChange={(e) => setContent({ ...content, experiences: content.experiences.map((item, itemIndex) => itemIndex === index ? { ...item, role: e.target.value } : item) })} /></div><div className="grid gap-2"><Label>Company</Label><Input value={experience.company} onChange={(e) => setContent({ ...content, experiences: content.experiences.map((item, itemIndex) => itemIndex === index ? { ...item, company: e.target.value } : item) })} /></div></div><div className="grid gap-2"><Label>Bullets</Label><Textarea value={experience.bullets.join("\n")} onChange={(e) => setContent({ ...content, experiences: content.experiences.map((item, itemIndex) => itemIndex === index ? { ...item, bullets: lines(e.target.value) } : item) })} className="min-h-40" /></div></CardContent></Card>)}
          {content.projects.map((project, index) => <Card key={`${project.sourceId}-${index}`}><CardHeader><CardTitle className="text-base">Project · {project.title}</CardTitle></CardHeader><CardContent className="grid gap-4"><div className="grid gap-2"><Label>Description</Label><Textarea value={project.description} onChange={(e) => setContent({ ...content, projects: content.projects.map((item, itemIndex) => itemIndex === index ? { ...item, description: e.target.value } : item) })} /></div><div className="grid gap-2"><Label>Bullets</Label><Textarea value={project.bullets.join("\n")} onChange={(e) => setContent({ ...content, projects: content.projects.map((item, itemIndex) => itemIndex === index ? { ...item, bullets: lines(e.target.value) } : item) })} /></div></CardContent></Card>)}
        </div>
        <div className="sticky top-20 overflow-hidden rounded-xl border bg-slate-100 p-4"><ResumePreview content={content} /></div>
      </div>
    </PageShell>
  );
}
