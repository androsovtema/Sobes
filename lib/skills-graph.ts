/**
 * Граф навыков для алгоритма матчинга.
 *
 * ALIASES — нормализация написаний ("ReactJS" → "React").
 * RELATIONS — родственные навыки с весом 0..1:
 *   если у кандидата есть FROM, а вакансия требует TO,
 *   то требование засчитывается на WEIGHT.
 *
 * Это не симметрия! React→Next.js=0.6 (React-разработчик частично покрывает Next.js),
 * но Next.js→React=0.85 (Next.js-разработчик почти полностью покрывает React).
 */

export type SkillAliasSpec = { canonical: string; aliases: string[] };
export type SkillRelationSpec = { from: string; to: string; weight: number };

export const SKILL_ALIASES: SkillAliasSpec[] = [
  { canonical: "React", aliases: ["ReactJS", "React.js", "reactjs"] },
  { canonical: "Next.js", aliases: ["NextJS", "Next", "nextjs"] },
  { canonical: "Vue.js", aliases: ["Vue", "VueJS", "vuejs"] },
  { canonical: "Node.js", aliases: ["NodeJS", "Node", "nodejs"] },
  { canonical: "TypeScript", aliases: ["TS", "ts"] },
  { canonical: "JavaScript", aliases: ["JS", "js", "ECMAScript"] },
  { canonical: "PostgreSQL", aliases: ["Postgres", "PG", "psql"] },
  { canonical: "HTML/CSS", aliases: ["HTML", "CSS", "HTML5", "CSS3"] },
  { canonical: "Tailwind CSS", aliases: ["Tailwind", "TailwindCSS"] },
  { canonical: "Kotlin Android", aliases: ["Android Kotlin"] },
  { canonical: "UI/UX", aliases: ["UI", "UX", "UI/UX Design"] },
  { canonical: "C#", aliases: ["CSharp", "C-Sharp"] },
  { canonical: ".NET", aliases: ["dotnet", "DotNet", "ASP.NET"] },
  { canonical: "Python (Data)", aliases: ["Python для данных", "Data Python"] },
  { canonical: "Product Management", aliases: ["Продакт", "Product Manager", "Продуктовый менеджмент"] },
];

// Родственные навыки. Вес — насколько FROM покрывает требование TO.
export const SKILL_RELATIONS: SkillRelationSpec[] = [
  // Frontend кластер
  { from: "Next.js", to: "React", weight: 0.85 },
  { from: "React", to: "Next.js", weight: 0.6 },
  { from: "Next.js", to: "TypeScript", weight: 0.5 },
  { from: "React", to: "Redux", weight: 0.55 },
  { from: "React", to: "TypeScript", weight: 0.4 },
  { from: "TypeScript", to: "JavaScript", weight: 0.9 },
  { from: "JavaScript", to: "TypeScript", weight: 0.5 },
  { from: "Vue.js", to: "React", weight: 0.4 },
  { from: "Angular", to: "React", weight: 0.35 },
  { from: "Angular", to: "TypeScript", weight: 0.85 },
  { from: "Tailwind CSS", to: "HTML/CSS", weight: 0.9 },

  // Backend кластер
  { from: "NestJS", to: "Node.js", weight: 0.9 },
  { from: "Node.js", to: "JavaScript", weight: 0.8 },
  { from: "Django", to: "Python", weight: 0.85 },
  { from: "FastAPI", to: "Python", weight: 0.85 },
  { from: "Spring Boot", to: "Java", weight: 0.9 },
  { from: ".NET", to: "C#", weight: 0.9 },
  { from: "C#", to: ".NET", weight: 0.8 },

  // БД
  { from: "PostgreSQL", to: "SQL", weight: 0.95 },
  { from: "MySQL", to: "SQL", weight: 0.95 },
  { from: "SQL", to: "PostgreSQL", weight: 0.5 },
  { from: "SQL", to: "MySQL", weight: 0.5 },

  // Mobile
  { from: "React Native", to: "React", weight: 0.6 },
  { from: "Flutter", to: "React Native", weight: 0.4 },
  { from: "SwiftUI", to: "Swift", weight: 0.85 },
  { from: "Swift", to: "SwiftUI", weight: 0.6 },
  { from: "Jetpack Compose", to: "Kotlin Android", weight: 0.85 },
  { from: "Kotlin Android", to: "Jetpack Compose", weight: 0.5 },
  { from: "Kotlin Android", to: "Kotlin", weight: 0.95 },
  { from: "Kotlin", to: "Java", weight: 0.6 },

  // DevOps
  { from: "Kubernetes", to: "Docker", weight: 0.85 },
  { from: "Docker", to: "Linux", weight: 0.5 },
  { from: "Terraform", to: "AWS", weight: 0.45 },
  { from: "AWS", to: "GCP", weight: 0.55 },
  { from: "GCP", to: "AWS", weight: 0.55 },
  { from: "AWS", to: "Azure", weight: 0.5 },

  // Design
  { from: "Figma", to: "Sketch", weight: 0.7 },
  { from: "Sketch", to: "Figma", weight: 0.7 },
  { from: "Adobe XD", to: "Figma", weight: 0.6 },
  { from: "UI/UX", to: "Prototyping", weight: 0.6 },
  { from: "Prototyping", to: "UI/UX", weight: 0.5 },
  { from: "Photoshop", to: "Illustrator", weight: 0.5 },

  // Data
  { from: "TensorFlow", to: "PyTorch", weight: 0.6 },
  { from: "PyTorch", to: "TensorFlow", weight: 0.6 },
  { from: "pandas", to: "Python (Data)", weight: 0.85 },
  { from: "NumPy", to: "Python (Data)", weight: 0.7 },
  { from: "Power BI", to: "Tableau", weight: 0.6 },
  { from: "Tableau", to: "Power BI", weight: 0.6 },

  // Management
  { from: "Scrum", to: "Agile", weight: 0.9 },
  { from: "Agile", to: "Scrum", weight: 0.7 },
  { from: "Confluence", to: "Jira", weight: 0.5 },
];
