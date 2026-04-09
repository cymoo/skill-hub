import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  serial,
  jsonb,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const skills = pgTable(
  "skills",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 64 }).notNull(),
    description: text("description").notNull(),
    categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
    ownerId: uuid("owner_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    storagePath: varchar("storage_path", { length: 500 }).notNull(),
    starCount: integer("star_count").default(0).notNull(),
    downloadCount: integer("download_count").default(0).notNull(),
    license: varchar("license", { length: 255 }),
    compatibility: varchar("compatibility", { length: 500 }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_skills_category").on(table.categoryId),
    index("idx_skills_owner").on(table.ownerId),
    index("idx_skills_star_count").on(table.starCount),
    index("idx_skills_created_at").on(table.createdAt),
    uniqueIndex("idx_skills_owner_name").on(table.ownerId, table.name),
  ]
);

export const stars = pgTable(
  "stars",
  {
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    skillId: uuid("skill_id")
      .references(() => skills.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.skillId] })]
);
