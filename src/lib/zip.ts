import archiver from "archiver";
import { Open } from "unzipper";
import path from "path";
import fs from "fs/promises";
import { ensureDir } from "./storage";

export async function createZipFromDirectory(
  dirPath: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    archive.on("data", (chunk: Buffer) => chunks.push(chunk));
    archive.on("end", () => resolve(Buffer.concat(chunks)));
    archive.on("error", reject);

    archive.directory(dirPath, false);
    archive.finalize();
  });
}

export async function extractZipToDirectory(
  zipBuffer: Buffer,
  destPath: string
): Promise<void> {
  await ensureDir(destPath);

  const directory = await Open.buffer(zipBuffer);

  for (const file of directory.files) {
    // Skip directories, __MACOSX, and hidden files
    if (
      file.type === "Directory" ||
      file.path.startsWith("__MACOSX") ||
      file.path.split("/").some((p: string) => p.startsWith("."))
    ) {
      continue;
    }

    // Handle potential nested root folder (e.g., skill-name/SKILL.md)
    const filePath = path.join(destPath, file.path);
    const resolvedPath = path.resolve(filePath);

    // Path traversal check
    if (!resolvedPath.startsWith(path.resolve(destPath))) {
      throw new Error("Zip contains path traversal");
    }

    await ensureDir(path.dirname(filePath));
    const content = await file.buffer();
    await fs.writeFile(filePath, content);
  }
}
