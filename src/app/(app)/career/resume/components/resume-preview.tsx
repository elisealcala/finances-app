import type { ResumeContent } from "@/types/career";

export function ResumePreview({ content }: { content: ResumeContent }) {
  return (
    <article className="bg-white p-8 text-[11px] leading-[1.45] text-slate-900 shadow-sm sm:p-12">
      <header className="border-b border-slate-300 pb-4 text-center">
        <h1 className="text-2xl font-bold tracking-tight">{content.personal.fullName}</h1>
        {content.personal.headline ? <p className="mt-1 text-sm font-medium text-slate-700">{content.personal.headline}</p> : null}
        <p className="mt-2 text-[10px] text-slate-600">
          {[content.personal.email, content.personal.phone, content.personal.location]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {content.personal.links.length ? (
          <p className="mt-1 text-[10px] text-indigo-700">
            {content.personal.links.map((link, index) => (
              <span key={`${link.url}-${index}`}>
                {index ? " · " : ""}<a href={link.url}>{link.label}</a>
              </span>
            ))}
          </p>
        ) : null}
      </header>
      <section className="mt-5">
        <h2 className="border-b border-slate-300 pb-1 text-[11px] font-bold tracking-[0.12em] uppercase">Summary</h2>
        <p className="mt-2">{content.summary}</p>
      </section>
      {content.experiences.length ? (
        <section className="mt-5">
          <h2 className="border-b border-slate-300 pb-1 text-[11px] font-bold tracking-[0.12em] uppercase">Experience</h2>
          <div className="mt-3 space-y-4">
            {content.experiences.map((experience, index) => (
              <div key={`${experience.company}-${experience.role}-${index}`}>
                <div className="flex items-start justify-between gap-4">
                  <div><h3 className="font-bold">{experience.role}</h3><p className="font-medium text-slate-700">{experience.company}{experience.location ? ` · ${experience.location}` : ""}</p></div>
                  <p className="shrink-0 text-[10px] text-slate-600">{experience.startDate} – {experience.endDate}</p>
                </div>
                <ul className="mt-1.5 list-disc space-y-1 pl-4">
                  {experience.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      {content.projects.length ? (
        <section className="mt-5">
          <h2 className="border-b border-slate-300 pb-1 text-[11px] font-bold tracking-[0.12em] uppercase">Projects</h2>
          <div className="mt-3 space-y-3">{content.projects.map((project, index) => <div key={`${project.title}-${index}`}><h3 className="font-bold">{project.title}</h3><p>{project.description}</p>{project.bullets.length ? <ul className="mt-1 list-disc pl-4">{project.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul> : null}</div>)}</div>
        </section>
      ) : null}
      <div className="mt-5 grid gap-5 sm:grid-cols-[1fr_1.5fr]">
        {content.education.length ? <section><h2 className="border-b border-slate-300 pb-1 text-[11px] font-bold tracking-[0.12em] uppercase">Education</h2><div className="mt-2 space-y-2">{content.education.map((item, index) => <div key={`${item.institution}-${index}`}><p className="font-bold">{item.degree}</p><p>{item.institution}</p><p className="text-[10px] text-slate-600">{item.date}</p>{item.details ? <p>{item.details}</p> : null}</div>)}</div></section> : null}
        {content.skills.length ? <section><h2 className="border-b border-slate-300 pb-1 text-[11px] font-bold tracking-[0.12em] uppercase">Skills</h2><p className="mt-2">{content.skills.join(" · ")}</p></section> : null}
      </div>
    </article>
  );
}

