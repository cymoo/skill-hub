import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users, categories, skills } from "./schema";
import { hash } from "bcryptjs";
import { generateStoragePath, getSkillFullPath } from "../lib/storage";
import fs from "fs/promises";
import path from "path";

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const client = postgres(connectionString);
  const db = drizzle(client);

  console.log("🌱 Seeding database...");

  // Create categories
  const categoryData = [
    { name: "Code Review", slug: "code-review", description: "Skills for reviewing and analyzing code" },
    { name: "Data Analysis", slug: "data-analysis", description: "Skills for data processing and analysis" },
    { name: "Web Development", slug: "web-development", description: "Skills for web development tasks" },
    { name: "DevOps", slug: "devops", description: "Skills for CI/CD, deployment, and infrastructure" },
    { name: "Documentation", slug: "documentation", description: "Skills for writing and managing documentation" },
    { name: "Testing", slug: "testing", description: "Skills for test creation and quality assurance" },
    { name: "Security", slug: "security", description: "Skills for security analysis and vulnerability detection" },
    { name: "AI & ML", slug: "ai-ml", description: "Skills for machine learning and AI tasks" },
    { name: "PDF Processing", slug: "pdf-processing", description: "Skills for handling PDF documents" },
    { name: "Other", slug: "other", description: "Miscellaneous skills" },
  ];

  console.log("  Creating categories...");
  const insertedCategories = await db
    .insert(categories)
    .values(categoryData)
    .onConflictDoNothing()
    .returning();

  console.log(`  ✓ ${insertedCategories.length} categories created`);

  // Create demo user
  console.log("  Creating demo user...");
  const passwordHash = await hash("demo1234", 12);
  const [demoUser] = await db
    .insert(users)
    .values({
      username: "demo",
      email: "demo@skillhub.dev",
      passwordHash,
    })
    .onConflictDoNothing()
    .returning();

  if (!demoUser) {
    console.log("  ⓘ Demo user already exists, skipping skill creation");
    await client.end();
    return;
  }

  console.log("  ✓ Demo user created (demo@skillhub.dev / demo1234)");

  // Create demo skills
  const uploadDir = process.env.UPLOAD_DIR || "./data/skills";
  
  const demoSkills = [
    {
      name: "code-review",
      description: "Review code for best practices, bugs, and security vulnerabilities. Use when analyzing pull requests or code submissions.",
      categorySlug: "code-review",
      license: "MIT",
      skillMd: `---
name: code-review
description: Review code for best practices, bugs, and security vulnerabilities. Use when analyzing pull requests or code submissions.
license: MIT
---

# Code Review

## When to use this skill
Use this skill when you need to review code changes, analyze pull requests, or evaluate code quality.

## Instructions

### Step 1: Understand Context
Read the code diff and understand what changes are being made.

### Step 2: Check for Issues
- **Bugs**: Look for logical errors, off-by-one errors, null pointer dereferences
- **Security**: Check for SQL injection, XSS, path traversal, hardcoded secrets
- **Performance**: Identify N+1 queries, unnecessary re-renders, memory leaks
- **Style**: Verify consistent naming, proper error handling, adequate comments

### Step 3: Provide Feedback
Structure your review with:
1. Summary of changes
2. Critical issues (must fix)
3. Suggestions (nice to have)
4. Positive observations

## Examples

\`\`\`python
# Bad: SQL injection vulnerability
query = f"SELECT * FROM users WHERE id = {user_id}"

# Good: Parameterized query
query = "SELECT * FROM users WHERE id = %s"
cursor.execute(query, (user_id,))
\`\`\`
`,
    },
    {
      name: "frontend-design",
      description: "Create distinctive, production-grade frontend interfaces with high design quality. Use when building web components, pages, or applications.",
      categorySlug: "web-development",
      license: "MIT",
      skillMd: `---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces with high design quality. Use when building web components, pages, or applications.
license: MIT
---

# Frontend Design

## When to use this skill
Use this skill when the user asks to build web components, pages, artifacts, or applications including websites, landing pages, dashboards, React components, or HTML/CSS layouts.

## Design Thinking

Before coding, understand the context:

1. **Purpose**: What problem does this interface solve?
2. **Tone**: Pick an aesthetic direction (minimal, maximalist, retro, editorial, etc.)
3. **Constraints**: Framework, performance, accessibility requirements
4. **Differentiation**: What makes this unforgettable?

## Typography Guidelines
- Choose distinctive fonts, avoid generic (Arial, Inter, Roboto)
- Pair a display font with a refined body font
- Use proper hierarchy with size, weight, and spacing

## Color Guidelines
- Commit to a cohesive palette
- Use CSS variables for consistency
- Dominant colors with sharp accents work best
- Avoid evenly-distributed, timid palettes

## Motion & Animation
- Focus on high-impact moments
- Staggered reveals on page load
- Scroll-triggered animations
- Purposeful hover states
`,
    },
    {
      name: "pdf-processing",
      description: "Extract PDF text, fill forms, merge files. Use when handling PDF documents in any format.",
      categorySlug: "pdf-processing",
      license: "Apache-2.0",
      skillMd: `---
name: pdf-processing
description: Extract PDF text, fill forms, merge files. Use when handling PDF documents in any format.
license: Apache-2.0
---

# PDF Processing

## When to use this skill
Use this skill when the user needs to work with PDF files, including:
- Extracting text from PDFs
- Filling PDF forms
- Merging multiple PDFs
- Converting PDFs to other formats

## How to extract text

Use pdfplumber for reliable text extraction:

\`\`\`python
import pdfplumber

with pdfplumber.open("document.pdf") as pdf:
    for page in pdf.pages:
        text = page.extract_text()
        print(text)
\`\`\`

## How to fill forms

Use PyPDF2 for form filling:

\`\`\`python
from PyPDF2 import PdfReader, PdfWriter

reader = PdfReader("form.pdf")
writer = PdfWriter()
writer.append(reader)

writer.update_page_form_field_values(
    writer.pages[0],
    {"field_name": "value"}
)

with open("filled_form.pdf", "wb") as output:
    writer.write(output)
\`\`\`

## How to merge files

\`\`\`python
from PyPDF2 import PdfMerger

merger = PdfMerger()
merger.append("file1.pdf")
merger.append("file2.pdf")
merger.write("merged.pdf")
merger.close()
\`\`\`
`,
    },
  ];

  for (const skillData of demoSkills) {
    const cat = insertedCategories.find((c) => c.slug === skillData.categorySlug);
    const storagePath = generateStoragePath(demoUser.id, skillData.name);
    const fullPath = path.resolve(uploadDir, storagePath);

    // Create skill directory
    await fs.mkdir(fullPath, { recursive: true });

    // Write SKILL.md
    await fs.writeFile(path.join(fullPath, "SKILL.md"), skillData.skillMd, "utf-8");

    // Create in DB
    await db.insert(skills).values({
      name: skillData.name,
      description: skillData.description,
      categoryId: cat?.id || null,
      ownerId: demoUser.id,
      storagePath,
      license: skillData.license,
    });

    console.log(`  ✓ Skill "${skillData.name}" created`);
  }

  console.log("\n✅ Seeding complete!");
  console.log("   Demo login: demo@skillhub.dev / demo1234");

  await client.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
