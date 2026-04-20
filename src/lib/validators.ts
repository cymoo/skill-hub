import { z } from "zod/v4";

export const registerSchema = z.object({
  username: z
    .string()
    .min(2, "Username must be at least 2 characters")
    .max(50, "Username must be at most 50 characters")
    .regex(/^[a-zA-Z0-9_\-\u4e00-\u9fff]+$/, "Username can only contain letters (including Chinese), numbers, hyphens and underscores"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be at most 100 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const skillNameSchema = z
  .string()
  .min(1, "Name is required")
  .max(64, "Name must be at most 64 characters")
  .regex(
    /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/,
    "Name must be lowercase letters, numbers, and hyphens. Cannot start or end with a hyphen."
  )
  .refine((val) => !val.includes("--"), "Name cannot contain consecutive hyphens");

export const categorySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
});

export const filePathSchema = z
  .string()
  .min(1)
  .refine(
    (val) =>
      !val.includes("..") &&
      !val.startsWith("/") &&
      !val.includes("\\") &&
      !val.includes("\0") &&
      !/^[a-zA-Z]:/.test(val),
    "Invalid file path"
  );
