import fs from "fs/promises";
import path from "path";

export interface FileTreeNode {
  name: string;
  type: "file" | "directory";
  size?: number;
  children?: FileTreeNode[];
}

const getUploadDir = () => process.env.UPLOAD_DIR || "./data/skills";

function sanitizePath(basePath: string, relativePath: string): string {
  const resolved = path.resolve(basePath, relativePath);
  if (!resolved.startsWith(path.resolve(basePath))) {
    throw new Error("Path traversal detected");
  }
  return resolved;
}

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function writeFile(
  skillPath: string,
  filePath: string,
  content: string | Buffer
): Promise<void> {
  const fullPath = sanitizePath(getSkillFullPath(skillPath), filePath);
  await ensureDir(path.dirname(fullPath));
  await fs.writeFile(fullPath, content);
}

export async function createDirectory(
  skillPath: string,
  directoryPath: string
): Promise<void> {
  const fullPath = sanitizePath(getSkillFullPath(skillPath), directoryPath);
  await ensureDir(fullPath);
}

export async function readFile(
  skillPath: string,
  filePath: string
): Promise<string> {
  const fullPath = sanitizePath(getSkillFullPath(skillPath), filePath);
  return fs.readFile(fullPath, "utf-8");
}

export async function deleteFile(
  skillPath: string,
  filePath: string
): Promise<void> {
  const fullPath = sanitizePath(getSkillFullPath(skillPath), filePath);
  await fs.unlink(fullPath);
}

export async function deleteEntry(
  skillPath: string,
  targetPath: string
): Promise<void> {
  const fullPath = sanitizePath(getSkillFullPath(skillPath), targetPath);
  const stat = await fs.stat(fullPath);

  if (stat.isDirectory()) {
    await fs.rm(fullPath, { recursive: true, force: true });
    return;
  }

  await fs.unlink(fullPath);
}

export async function renameEntry(
  skillPath: string,
  oldPath: string,
  newPath: string
): Promise<void> {
  const basePath = getSkillFullPath(skillPath);
  const oldFullPath = sanitizePath(basePath, oldPath);
  const newFullPath = sanitizePath(basePath, newPath);

  await fs.access(oldFullPath);
  try {
    await fs.access(newFullPath);
    throw new Error("Target path already exists");
  } catch (error) {
    if (!isErrnoException(error) || error.code !== "ENOENT") {
      throw error;
    }
  }

  await ensureDir(path.dirname(newFullPath));
  await fs.rename(oldFullPath, newFullPath);
}

export async function listDirectory(
  dirPath: string
): Promise<FileTreeNode[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const nodes: FileTreeNode[] = [];

  for (const entry of entries.sort((a, b) => {
    // Directories first, then files
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  })) {
    if (entry.isDirectory()) {
      const children = await listDirectory(path.join(dirPath, entry.name));
      nodes.push({ name: entry.name, type: "directory", children });
    } else {
      const stat = await fs.stat(path.join(dirPath, entry.name));
      nodes.push({ name: entry.name, type: "file", size: stat.size });
    }
  }

  return nodes;
}

export async function deleteDirectory(dirPath: string): Promise<void> {
  await fs.rm(dirPath, { recursive: true, force: true });
}

export async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function getSkillFullPath(storagePath: string): string {
  return path.resolve(getUploadDir(), storagePath);
}

export function generateStoragePath(userId: string, skillName: string): string {
  return `${userId}/${skillName}`;
}

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === "object" && error !== null && "code" in error;
}
