import "server-only";
import {
  Document,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { ResumeContent } from "@/types/career";

const styles = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingBottom: 34,
    paddingHorizontal: 42,
    fontFamily: "Helvetica",
    fontSize: 9.5,
    lineHeight: 1.4,
    color: "#0f172a",
  },
  header: { textAlign: "center", borderBottomWidth: 1, borderBottomColor: "#cbd5e1", paddingBottom: 10 },
  name: { fontFamily: "Helvetica-Bold", fontSize: 21 },
  headline: { marginTop: 3, fontFamily: "Helvetica-Bold", fontSize: 11, color: "#334155" },
  contact: { marginTop: 5, fontSize: 8.5, color: "#475569" },
  links: { marginTop: 2, flexDirection: "row", justifyContent: "center", gap: 8 },
  link: { color: "#4338ca", textDecoration: "none", fontSize: 8.5 },
  section: { marginTop: 12 },
  sectionTitle: { fontFamily: "Helvetica-Bold", fontSize: 9.5, letterSpacing: 1.1, textTransform: "uppercase", borderBottomWidth: 0.75, borderBottomColor: "#cbd5e1", paddingBottom: 2, marginBottom: 5 },
  item: { marginBottom: 7 },
  itemHeader: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  itemTitle: { fontFamily: "Helvetica-Bold", fontSize: 9.5 },
  itemSubtitle: { fontFamily: "Helvetica-Bold", color: "#334155", marginTop: 1 },
  itemDate: { fontSize: 8.5, color: "#475569" },
  bulletRow: { flexDirection: "row", marginTop: 2, paddingLeft: 4 },
  bullet: { width: 10 },
  bulletText: { flex: 1 },
  columns: { flexDirection: "row", gap: 20 },
  columnSmall: { width: "35%" },
  columnLarge: { flex: 1 },
});

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function Bullets({ items }: { items: string[] }) {
  return <>{items.map((item, index) => <View key={`${item}-${index}`} style={styles.bulletRow} wrap={false}><Text style={styles.bullet}>•</Text><Text style={styles.bulletText}>{item}</Text></View>)}</>;
}

function ResumePdfDocument({ content }: { content: ResumeContent }) {
  return (
    <Document title={`${content.personal.fullName} Resume`}>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.name}>{content.personal.fullName}</Text>
          {content.personal.headline ? <Text style={styles.headline}>{content.personal.headline}</Text> : null}
          <Text style={styles.contact}>{[content.personal.email, content.personal.phone, content.personal.location].filter(Boolean).join("  •  ")}</Text>
          {content.personal.links.length ? <View style={styles.links}>{content.personal.links.map((link) => <Link key={link.url} src={link.url} style={styles.link}>{link.label}</Link>)}</View> : null}
        </View>
        <View style={styles.section}><SectionTitle>Summary</SectionTitle><Text>{content.summary}</Text></View>
        {content.experiences.length ? <View style={styles.section}><SectionTitle>Experience</SectionTitle>{content.experiences.map((experience, index) => <View key={`${experience.company}-${index}`} style={styles.item} wrap={false}><View style={styles.itemHeader}><View><Text style={styles.itemTitle}>{experience.role}</Text><Text style={styles.itemSubtitle}>{experience.company}{experience.location ? ` • ${experience.location}` : ""}</Text></View><Text style={styles.itemDate}>{experience.startDate} – {experience.endDate}</Text></View><Bullets items={experience.bullets} /></View>)}</View> : null}
        {content.projects.length ? <View style={styles.section}><SectionTitle>Projects</SectionTitle>{content.projects.map((project, index) => <View key={`${project.title}-${index}`} style={styles.item} wrap={false}><Text style={styles.itemTitle}>{project.title}</Text><Text>{project.description}</Text><Bullets items={project.bullets} /></View>)}</View> : null}
        <View style={[styles.section, styles.columns]}>
          {content.education.length ? <View style={styles.columnSmall}><SectionTitle>Education</SectionTitle>{content.education.map((item, index) => <View key={`${item.institution}-${index}`} style={styles.item} wrap={false}><Text style={styles.itemTitle}>{item.degree}</Text><Text>{item.institution}</Text><Text style={styles.itemDate}>{item.date}</Text>{item.details ? <Text>{item.details}</Text> : null}</View>)}</View> : null}
          {content.skills.length ? <View style={styles.columnLarge}><SectionTitle>Skills</SectionTitle><Text>{content.skills.join("  •  ")}</Text></View> : null}
        </View>
      </Page>
    </Document>
  );
}

export async function renderResumePdf(content: ResumeContent) {
  return renderToBuffer(<ResumePdfDocument content={content} />);
}

