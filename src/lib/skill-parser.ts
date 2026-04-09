import matter from "gray-matter";

export interface SkillMetadata {
  name: string;
  description: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
}

export function parseSkillMd(content: string): SkillMetadata {
  const { data } = matter(content);

  if (!data.name || typeof data.name !== "string") {
    throw new Error("SKILL.md must have a 'name' field");
  }
  if (!data.description || typeof data.description !== "string") {
    throw new Error("SKILL.md must have a 'description' field");
  }

  return {
    name: data.name,
    description: data.description,
    license: data.license,
    compatibility: data.compatibility,
    metadata: data.metadata,
  };
}
