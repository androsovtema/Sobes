export type SkillGroup = {
  category: string;
  skills: string[];
};

export const SKILL_GROUPS: SkillGroup[] = [
  {
    category: "Frontend",
    skills: ["React", "Next.js", "Vue.js", "Angular", "TypeScript", "JavaScript", "HTML/CSS", "Tailwind CSS", "Redux", "GraphQL"],
  },
  {
    category: "Backend",
    skills: ["Node.js", "Python", "Go", "Java", "Kotlin", "PHP", "Ruby", "C#", ".NET", "Django", "FastAPI", "Spring Boot", "NestJS", "PostgreSQL", "MySQL", "MongoDB", "Redis"],
  },
  {
    category: "Mobile",
    skills: ["React Native", "Flutter", "Swift", "SwiftUI", "Kotlin Android", "Jetpack Compose"],
  },
  {
    category: "DevOps",
    skills: ["Docker", "Kubernetes", "AWS", "GCP", "Azure", "CI/CD", "Terraform", "Linux", "Nginx"],
  },
  {
    category: "Design",
    skills: ["Figma", "Sketch", "Adobe XD", "Photoshop", "Illustrator", "UI/UX", "Prototyping", "Motion Design"],
  },
  {
    category: "Data",
    skills: ["SQL", "Python (Data)", "pandas", "NumPy", "TensorFlow", "PyTorch", "Power BI", "Tableau", "Spark"],
  },
  {
    category: "Management",
    skills: ["Product Management", "Agile", "Scrum", "Jira", "Confluence", "Roadmapping", "A/B Testing", "Analytics"],
  },
];

export const ALL_SKILLS = SKILL_GROUPS.flatMap((g) => g.skills);
