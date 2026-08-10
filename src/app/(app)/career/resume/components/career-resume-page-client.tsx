"use client";

import { format } from "date-fns";
import {
  ArrowRight,
  BriefcaseBusiness,
  FileText,
  GraduationCap,
  Pencil,
  Plus,
  Rocket,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, PageSection, PageShell } from "@/components/page";
import {
  useCareerEducation,
  useCareerEducationMutations,
  useCareerExperienceMutations,
  useCareerExperiences,
  useCareerOpportunities,
  useCareerOpportunityMutations,
  useCareerProfile,
  useCareerProjectMutations,
  useCareerProjects,
  useCareerResumes,
  useGenerateCareerResume,
  useUpdateCareerProfile,
} from "@/hooks/use-career";
import type {
  CareerEducation,
  CareerExperience,
  CareerOpportunity,
  CareerProject,
} from "@/types/career";

function splitLines(value: string) {
  return value.split("\n").map((item) => item.trim()).filter(Boolean);
}

function splitComma(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function inputDate(date: Date | null | undefined) {
  return date ? format(date, "yyyy-MM-dd") : "";
}

function ProfileForm() {
  const profile = useCareerProfile();
  const update = useUpdateCareerProfile();
  const [values, setValues] = useState({
    fullName: "", headline: "", email: "", phone: "", location: "",
    website: "", githubUrl: "", linkedInUrl: "", summary: "", skills: "",
  });

  /* eslint-disable react-hooks/set-state-in-effect -- initialize controlled form from query data */
  useEffect(() => {
    if (!profile.data) return;
    setValues({
      fullName: profile.data.fullName,
      headline: profile.data.headline,
      email: profile.data.email,
      phone: profile.data.phone,
      location: profile.data.location,
      website: profile.data.website ?? "",
      githubUrl: profile.data.githubUrl ?? "",
      linkedInUrl: profile.data.linkedInUrl ?? "",
      summary: profile.data.summary,
      skills: profile.data.skills.join(", "),
    });
  }, [profile.data]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function set(key: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    try {
      await update.mutateAsync({
        ...values,
        website: values.website || null,
        githubUrl: values.githubUrl || null,
        linkedInUrl: values.linkedInUrl || null,
        skills: splitComma(values.skills),
      });
      toast.success("Career profile saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save profile");
    }
  }

  return (
    <Card>
      <CardHeader><div className="flex items-center gap-2"><UserRound className="text-primary size-5" /><CardTitle className="text-lg">Personal information</CardTitle></div></CardHeader>
      <CardContent>
        <form onSubmit={save} className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2"><Label htmlFor="profile-name">Full name</Label><Input id="profile-name" value={values.fullName} onChange={(e) => set("fullName", e.target.value)} required /></div>
            <div className="grid gap-2"><Label htmlFor="profile-headline">Headline</Label><Input id="profile-headline" value={values.headline} onChange={(e) => set("headline", e.target.value)} placeholder="Senior full-stack engineer" /></div>
            <div className="grid gap-2"><Label htmlFor="profile-email">Email</Label><Input id="profile-email" type="email" value={values.email} onChange={(e) => set("email", e.target.value)} /></div>
            <div className="grid gap-2"><Label htmlFor="profile-phone">Phone</Label><Input id="profile-phone" value={values.phone} onChange={(e) => set("phone", e.target.value)} /></div>
            <div className="grid gap-2"><Label htmlFor="profile-location">Location</Label><Input id="profile-location" value={values.location} onChange={(e) => set("location", e.target.value)} /></div>
            <div className="grid gap-2"><Label htmlFor="profile-website">Website</Label><Input id="profile-website" type="url" value={values.website} onChange={(e) => set("website", e.target.value)} /></div>
            <div className="grid gap-2"><Label htmlFor="profile-github">GitHub</Label><Input id="profile-github" type="url" value={values.githubUrl} onChange={(e) => set("githubUrl", e.target.value)} /></div>
            <div className="grid gap-2"><Label htmlFor="profile-linkedin">LinkedIn</Label><Input id="profile-linkedin" type="url" value={values.linkedInUrl} onChange={(e) => set("linkedInUrl", e.target.value)} /></div>
          </div>
          <div className="grid gap-2"><Label htmlFor="profile-summary">Master summary</Label><Textarea id="profile-summary" value={values.summary} onChange={(e) => set("summary", e.target.value)} className="min-h-28" placeholder="Your factual professional summary. Tailored resumes will derive from this." /></div>
          <div className="grid gap-2"><Label htmlFor="profile-skills">Skills</Label><Input id="profile-skills" value={values.skills} onChange={(e) => set("skills", e.target.value)} placeholder="TypeScript, React, PostgreSQL, platform engineering" /><p className="text-muted-foreground text-xs">Comma-separated.</p></div>
          <Button type="submit" className="w-fit" disabled={update.isPending}>{update.isPending ? "Saving…" : "Save profile"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ExperienceDialog({ experience, open, onOpenChange }: { experience?: CareerExperience; open: boolean; onOpenChange: (open: boolean) => void }) {
  const mutations = useCareerExperienceMutations();
  const [company, setCompany] = useState(""); const [role, setRole] = useState("");
  const [location, setLocation] = useState(""); const [employmentType, setEmploymentType] = useState("");
  const [startDate, setStartDate] = useState(""); const [endDate, setEndDate] = useState(""); const [current, setCurrent] = useState(false);
  const [summary, setSummary] = useState(""); const [achievements, setAchievements] = useState(""); const [skills, setSkills] = useState("");
  /* eslint-disable react-hooks/set-state-in-effect -- reset controlled dialog fields */
  useEffect(() => {
    if (!open) return;
    setCompany(experience?.company ?? ""); setRole(experience?.role ?? ""); setLocation(experience?.location ?? ""); setEmploymentType(experience?.employmentType ?? "");
    setStartDate(inputDate(experience?.startDate)); setEndDate(inputDate(experience?.endDate)); setCurrent(experience?.current ?? false); setSummary(experience?.summary ?? "");
    setAchievements(experience?.achievements.join("\n") ?? ""); setSkills(experience?.skills.join(", ") ?? "");
  }, [experience, open]);
  /* eslint-enable react-hooks/set-state-in-effect */
  async function save(event: React.FormEvent) {
    event.preventDefault();
    const values = { company, role, location: location || null, employmentType: employmentType || null, startDate: new Date(`${startDate}T12:00:00`), endDate: current || !endDate ? null : new Date(`${endDate}T12:00:00`), current, summary: summary || null, achievements: splitLines(achievements), skills: splitComma(skills) };
    try { if (experience) await mutations.update.mutateAsync({ id: experience.id, ...values }); else await mutations.create.mutateAsync(values); toast.success("Experience saved"); onOpenChange(false); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save experience"); }
  }
  async function remove() { if (!experience || !confirm(`Delete ${experience.role} at ${experience.company}?`)) return; await mutations.remove.mutateAsync({ id: experience.id }); onOpenChange(false); }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl"><form onSubmit={save} className="grid gap-4"><DialogHeader><DialogTitle>{experience ? "Edit experience" : "Add experience"}</DialogTitle><DialogDescription>Store factual source material; AI resumes will only rewrite what is here.</DialogDescription></DialogHeader>
    <div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label>Company</Label><Input value={company} onChange={(e) => setCompany(e.target.value)} required /></div><div className="grid gap-2"><Label>Role</Label><Input value={role} onChange={(e) => setRole(e.target.value)} required /></div><div className="grid gap-2"><Label>Location</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} /></div><div className="grid gap-2"><Label>Employment type</Label><Input value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} placeholder="Full-time" /></div><div className="grid gap-2"><Label>Start date</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required /></div><div className="grid gap-2"><Label>End date</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={current} /></div></div>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={current} onChange={(e) => setCurrent(e.target.checked)} className="size-4" /> Current role</label>
    <div className="grid gap-2"><Label>Role summary</Label><Textarea value={summary} onChange={(e) => setSummary(e.target.value)} /></div>
    <div className="grid gap-2"><Label>Achievements</Label><Textarea value={achievements} onChange={(e) => setAchievements(e.target.value)} className="min-h-36" placeholder={"One factual achievement per line\nInclude metrics only when verified"} /></div>
    <div className="grid gap-2"><Label>Skills used</Label><Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="TypeScript, AWS, mentoring" /></div>
    <DialogFooter className="sm:justify-between"><div>{experience ? <Button type="button" variant="ghost" onClick={remove}><Trash2 className="size-4" /> Delete</Button> : null}</div><div className="flex gap-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit">Save</Button></div></DialogFooter>
  </form></DialogContent></Dialog>;
}

function EducationDialog({ education, open, onOpenChange }: { education?: CareerEducation; open: boolean; onOpenChange: (open: boolean) => void }) {
  const mutations = useCareerEducationMutations();
  const [institution, setInstitution] = useState(""); const [degree, setDegree] = useState(""); const [field, setField] = useState(""); const [startDate, setStartDate] = useState(""); const [endDate, setEndDate] = useState(""); const [details, setDetails] = useState("");
  /* eslint-disable react-hooks/set-state-in-effect -- reset controlled dialog fields */
  useEffect(() => { if (!open) return; setInstitution(education?.institution ?? ""); setDegree(education?.degree ?? ""); setField(education?.field ?? ""); setStartDate(inputDate(education?.startDate)); setEndDate(inputDate(education?.endDate)); setDetails(education?.details ?? ""); }, [education, open]);
  /* eslint-enable react-hooks/set-state-in-effect */
  async function save(event: React.FormEvent) { event.preventDefault(); const values = { institution, degree, field: field || null, startDate: startDate ? new Date(`${startDate}T12:00:00`) : null, endDate: endDate ? new Date(`${endDate}T12:00:00`) : null, details: details || null }; try { if (education) await mutations.update.mutateAsync({ id: education.id, ...values }); else await mutations.create.mutateAsync(values); toast.success("Education saved"); onOpenChange(false); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save education"); } }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><form onSubmit={save} className="grid gap-4"><DialogHeader><DialogTitle>{education ? "Edit education" : "Add education"}</DialogTitle></DialogHeader><div className="grid gap-2"><Label>Institution</Label><Input value={institution} onChange={(e) => setInstitution(e.target.value)} required /></div><div className="grid gap-2"><Label>Degree</Label><Input value={degree} onChange={(e) => setDegree(e.target.value)} required /></div><div className="grid gap-2"><Label>Field</Label><Input value={field} onChange={(e) => setField(e.target.value)} /></div><div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label>Start</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div><div className="grid gap-2"><Label>End</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div></div><div className="grid gap-2"><Label>Details</Label><Textarea value={details} onChange={(e) => setDetails(e.target.value)} /></div><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit">Save</Button></DialogFooter></form></DialogContent></Dialog>;
}

function ProjectDialog({ project, open, onOpenChange }: { project?: CareerProject; open: boolean; onOpenChange: (open: boolean) => void }) {
  const mutations = useCareerProjectMutations(); const [title, setTitle] = useState(""); const [description, setDescription] = useState(""); const [url, setUrl] = useState(""); const [githubUrl, setGithubUrl] = useState(""); const [highlights, setHighlights] = useState(""); const [skills, setSkills] = useState("");
  /* eslint-disable react-hooks/set-state-in-effect -- reset controlled dialog fields */
  useEffect(() => { if (!open) return; setTitle(project?.title ?? ""); setDescription(project?.description ?? ""); setUrl(project?.url ?? ""); setGithubUrl(project?.githubUrl ?? ""); setHighlights(project?.highlights.join("\n") ?? ""); setSkills(project?.skills.join(", ") ?? ""); }, [open, project]);
  /* eslint-enable react-hooks/set-state-in-effect */
  async function save(event: React.FormEvent) { event.preventDefault(); const values = { title, description, url: url || null, githubUrl: githubUrl || null, highlights: splitLines(highlights), skills: splitComma(skills) }; try { if (project) await mutations.update.mutateAsync({ id: project.id, ...values }); else await mutations.create.mutateAsync(values); toast.success("Project saved"); onOpenChange(false); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save project"); } }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[92vh] overflow-y-auto"><form onSubmit={save} className="grid gap-4"><DialogHeader><DialogTitle>{project ? "Edit project" : "Add project"}</DialogTitle></DialogHeader><div className="grid gap-2"><Label>Project title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></div><div className="grid gap-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-24" required /></div><div className="grid gap-2"><Label>Project URL</Label><Input type="url" value={url} onChange={(e) => setUrl(e.target.value)} /></div><div className="grid gap-2"><Label>GitHub URL</Label><Input type="url" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} /></div><div className="grid gap-2"><Label>Highlights</Label><Textarea value={highlights} onChange={(e) => setHighlights(e.target.value)} /></div><div className="grid gap-2"><Label>Skills</Label><Input value={skills} onChange={(e) => setSkills(e.target.value)} /></div><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit">Save</Button></DialogFooter></form></DialogContent></Dialog>;
}

function OpportunityDialog({ opportunity, open, onOpenChange }: { opportunity?: CareerOpportunity; open: boolean; onOpenChange: (open: boolean) => void }) {
  const mutations = useCareerOpportunityMutations(); const [company, setCompany] = useState(""); const [role, setRole] = useState(""); const [url, setUrl] = useState(""); const [jobDescription, setJobDescription] = useState("");
  /* eslint-disable react-hooks/set-state-in-effect -- reset controlled dialog fields */
  useEffect(() => { if (!open) return; setCompany(opportunity?.company ?? ""); setRole(opportunity?.role ?? ""); setUrl(opportunity?.url ?? ""); setJobDescription(opportunity?.jobDescription ?? ""); }, [open, opportunity]);
  /* eslint-enable react-hooks/set-state-in-effect */
  async function save(event: React.FormEvent) { event.preventDefault(); const values = { company, role, url: url || null, jobDescription, status: opportunity?.status ?? "DRAFT" as const }; try { if (opportunity) await mutations.update.mutateAsync({ id: opportunity.id, ...values }); else await mutations.create.mutateAsync(values); toast.success("Opportunity saved"); onOpenChange(false); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save opportunity"); } }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-2xl"><form onSubmit={save} className="grid gap-4"><DialogHeader><DialogTitle>{opportunity ? "Edit opportunity" : "Add opportunity"}</DialogTitle><DialogDescription>The job description is used to select and rewrite only facts already in your career profile.</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label>Company</Label><Input value={company} onChange={(e) => setCompany(e.target.value)} required /></div><div className="grid gap-2"><Label>Role</Label><Input value={role} onChange={(e) => setRole(e.target.value)} required /></div></div><div className="grid gap-2"><Label>Opportunity URL</Label><Input type="url" value={url} onChange={(e) => setUrl(e.target.value)} /></div><div className="grid gap-2"><Label>Job description</Label><Textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} className="min-h-64" required /></div><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit">Save opportunity</Button></DialogFooter></form></DialogContent></Dialog>;
}

export function CareerResumePageClient() {
  const router = useRouter(); const experiences = useCareerExperiences(); const education = useCareerEducation(); const projects = useCareerProjects(); const opportunities = useCareerOpportunities(); const resumes = useCareerResumes(); const generate = useGenerateCareerResume();
  const [experienceOpen, setExperienceOpen] = useState(false); const [selectedExperience, setSelectedExperience] = useState<CareerExperience>();
  const [educationOpen, setEducationOpen] = useState(false); const [selectedEducation, setSelectedEducation] = useState<CareerEducation>();
  const [projectOpen, setProjectOpen] = useState(false); const [selectedProject, setSelectedProject] = useState<CareerProject>();
  const [opportunityOpen, setOpportunityOpen] = useState(false); const [selectedOpportunity, setSelectedOpportunity] = useState<CareerOpportunity>();
  async function generateResume(opportunity: CareerOpportunity) { try { const result = await generate.mutateAsync({ opportunityId: opportunity.id }); toast.success("Tailored resume generated"); router.push(`/career/resume/${result.resume.id}`); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not generate resume"); } }
  return <PageShell><PageHeader title="Resume" description="Maintain one factual career profile, then create grounded, editable resumes for individual opportunities." actions={<Button onClick={() => { setSelectedOpportunity(undefined); setOpportunityOpen(true); }}><Plus className="size-4" /> Opportunity</Button>} />
    <ProfileForm />
    <PageSection><div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold">Experience</h2><p className="text-muted-foreground text-sm">Your master achievement library.</p></div><Button variant="outline" onClick={() => { setSelectedExperience(undefined); setExperienceOpen(true); }}><Plus className="size-4" /> Experience</Button></div><div className="grid gap-3">{experiences.data?.map((item) => <Card key={item.id}><CardContent className="flex items-start justify-between gap-4 pt-6"><div><div className="flex items-center gap-2"><BriefcaseBusiness className="text-primary size-4" /><p className="font-semibold">{item.role}</p></div><p className="text-muted-foreground mt-1 text-sm">{item.company} · {format(item.startDate, "MMM yyyy")} – {item.current ? "Present" : item.endDate ? format(item.endDate, "MMM yyyy") : ""}</p><p className="text-muted-foreground mt-2 text-xs">{item.achievements.length} achievements · {item.skills.length} skills</p></div><Button size="sm" variant="ghost" onClick={() => { setSelectedExperience(item); setExperienceOpen(true); }}><Pencil className="size-4" /> Edit</Button></CardContent></Card>)}</div></PageSection>
    <div className="grid gap-6 lg:grid-cols-2"><PageSection><div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold">Education</h2></div><Button size="sm" variant="outline" onClick={() => { setSelectedEducation(undefined); setEducationOpen(true); }}><Plus className="size-4" /></Button></div><div className="grid gap-3">{education.data?.map((item) => <Card key={item.id}><CardContent className="flex items-start justify-between pt-6"><div><p className="flex items-center gap-2 font-medium"><GraduationCap className="size-4" />{item.degree}</p><p className="text-muted-foreground mt-1 text-sm">{item.institution}</p></div><Button size="icon" variant="ghost" onClick={() => { setSelectedEducation(item); setEducationOpen(true); }}><Pencil className="size-4" /></Button></CardContent></Card>)}</div></PageSection>
    <PageSection><div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold">Projects</h2></div><Button size="sm" variant="outline" onClick={() => { setSelectedProject(undefined); setProjectOpen(true); }}><Plus className="size-4" /></Button></div><div className="grid gap-3">{projects.data?.map((item) => <Card key={item.id}><CardContent className="flex items-start justify-between pt-6"><div><p className="flex items-center gap-2 font-medium"><Rocket className="size-4" />{item.title}</p><p className="text-muted-foreground mt-1 line-clamp-2 text-sm">{item.description}</p></div><Button size="icon" variant="ghost" onClick={() => { setSelectedProject(item); setProjectOpen(true); }}><Pencil className="size-4" /></Button></CardContent></Card>)}</div></PageSection></div>
    <PageSection><div><h2 className="text-lg font-semibold">Opportunities</h2><p className="text-muted-foreground text-sm">Generate a new resume without changing your master profile.</p></div><div className="grid gap-4 md:grid-cols-2">{opportunities.data?.map((item) => <Card key={item.id}><CardHeader><div className="flex items-start justify-between"><div><Badge variant="outline">{item.status.toLowerCase()}</Badge><CardTitle className="mt-3 text-base">{item.role} at {item.company}</CardTitle></div><Button size="icon" variant="ghost" onClick={() => { setSelectedOpportunity(item); setOpportunityOpen(true); }}><Pencil className="size-4" /></Button></div></CardHeader><CardContent><Button onClick={() => generateResume(item)} disabled={generate.isPending}><Sparkles className="size-4" /> Generate tailored resume</Button></CardContent></Card>)}</div></PageSection>
    {resumes.data?.length ? <PageSection><div><h2 className="text-lg font-semibold">Generated resumes</h2></div><div className="grid gap-3 md:grid-cols-2">{resumes.data.map((resume) => <Link key={resume.id} href={`/career/resume/${resume.id}`}><Card className="hover:border-primary/40 transition-colors"><CardContent className="flex items-center justify-between pt-6"><div><p className="flex items-center gap-2 font-medium"><FileText className="size-4" />{resume.title}</p><p className="text-muted-foreground mt-1 text-xs">{resume.versions.length ? `Version ${resume.versions[0]?.version}` : "No versions"}</p></div><ArrowRight className="text-muted-foreground size-4" /></CardContent></Card></Link>)}</div></PageSection> : null}
    <ExperienceDialog experience={selectedExperience} open={experienceOpen} onOpenChange={setExperienceOpen} /><EducationDialog education={selectedEducation} open={educationOpen} onOpenChange={setEducationOpen} /><ProjectDialog project={selectedProject} open={projectOpen} onOpenChange={setProjectOpen} /><OpportunityDialog opportunity={selectedOpportunity} open={opportunityOpen} onOpenChange={setOpportunityOpen} />
  </PageShell>;
}
