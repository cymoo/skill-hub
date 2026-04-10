"use client";

import { useState, useEffect, use, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import {
  Star,
  Download,
  FileText,
  Folder,
  FolderOpen,
  ChevronRight,
  User,
  Clock,
  Tag,
  Shield,
  BookOpen,
  Files,
  Users,
  Loader2,
  Save,
  X,
  Pencil,
  FilePlus2,
  FolderPlus,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";

interface SkillDetail {
  id: string;
  name: string;
  description: string;
  customDescription: string | null;
  metadataDescription: string;
  starCount: number;
  downloadCount: number;
  license: string | null;
  compatibility: string | null;
  metadata: Record<string, string> | null;
  storagePath: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  ownerUsername: string;
  categoryId: number | null;
  categoryName: string | null;
  categorySlug: string | null;
  isStarred: boolean;
}

interface FileTreeNode {
  name: string;
  type: "file" | "directory";
  size?: number;
  children?: FileTreeNode[];
}

interface AuthorSkill {
  id: string;
  name: string;
  description: string;
  starCount: number;
  downloadCount: number;
  createdAt: string;
  ownerUsername: string;
  categoryName: string | null;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

const FILE_TREE_INDENT_PER_LEVEL = 16;
const FILE_TREE_BASE_FOLDER_INDENT = 8;
const FILE_TREE_BASE_FILE_INDENT = 26;

function stripFrontmatter(content: string): string {
  if (!content.startsWith("---")) return content;
  return content.replace(/^---[\s\S]*?\n---\s*/m, "");
}

function getLanguageFromPath(filePath: string): string {
  const extension = filePath.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    json: "json",
    md: "markdown",
    py: "python",
    go: "go",
    java: "java",
    rs: "rust",
    sh: "bash",
    yml: "yaml",
    yaml: "yaml",
    html: "html",
    css: "css",
    sql: "sql",
    xml: "xml",
  };
  return map[extension] || "plaintext";
}

function replacePathPrefix(path: string, oldPrefix: string, newPrefix: string): string {
  if (path === oldPrefix) return newPrefix;
  if (!path.startsWith(`${oldPrefix}/`)) return path;
  return `${newPrefix}/${path.slice(oldPrefix.length + 1)}`;
}

function validateFileNameInput(
  name: string,
  allowSlash: boolean
): "invalidNameInput" | "slashNotAllowedInName" | null {
  if (
    name.includes("..") ||
    name.includes("\\") ||
    name.includes("\0") ||
    name.startsWith("/")
  ) {
    return "invalidNameInput";
  }
  if (!allowSlash && name.includes("/")) {
    return "slashNotAllowedInName";
  }
  return null;
}

export default function SkillDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("skill");
  const tc = useTranslations("common");
  const locale = useLocale();

  const [skill, setSkill] = useState<SkillDetail | null>(null);
  const [readme, setReadme] = useState<string>("");
  const [fileTree, setFileTree] = useState<FileTreeNode | null>(null);
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [selectedDirectory, setSelectedDirectory] = useState<string>("");
  const [fileContent, setFileContent] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState<string>("");
  const [authorSkills, setAuthorSkills] = useState<AuthorSkill[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState("");
  const [summarySaving, setSummarySaving] = useState(false);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const toRoutePath = (filePath: string) =>
    filePath.split("/").map(encodeURIComponent).join("/");

  useEffect(() => {
    const fetchSkill = async () => {
      try {
        const [skillRes, meRes] = await Promise.all([
          fetch(`/api/skills/${id}`),
          fetch("/api/auth/me"),
        ]);

        const skillData = await skillRes.json();
        const meData = await meRes.json();

        if (skillData.skill) {
          setSkill(skillData.skill);
          setSummaryDraft(skillData.skill.customDescription || "");
          if (meData.user) {
            setIsOwner(meData.user.id === skillData.skill.ownerId);
          }
        }
      } catch {
        toast({ title: tc("error"), variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchSkill();
  }, [id, tc]);

  useEffect(() => {
    if (!skill) return;
    fetch(`/api/skills/${id}/files/SKILL.md`)
      .then((res) => res.json())
      .then((data) => {
        if (data.content) setReadme(stripFrontmatter(data.content));
      })
      .catch(() => {});
  }, [skill, id]);

  const refreshFileTree = useCallback(async () => {
    const res = await fetch(`/api/skills/${id}/files`);
    const data = await res.json();
    setFileTree(data);
  }, [id]);

  useEffect(() => {
    if (!skill) return;
    refreshFileTree().catch(() => {});
  }, [skill, refreshFileTree]);

  useEffect(() => {
    if (!skill) return;
    fetch(`/api/skills/${id}/author-skills`)
      .then((res) => res.json())
      .then((data) => setAuthorSkills(data.skills || []))
      .catch(() => {});
  }, [skill, id]);

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data.categories || []))
      .catch(() => {});
  }, []);

  const handleStar = async () => {
    if (!skill) return;
    const wasStarred = skill.isStarred;

    setSkill({
      ...skill,
      isStarred: !wasStarred,
      starCount: wasStarred ? skill.starCount - 1 : skill.starCount + 1,
    });

    try {
      const res = await fetch(`/api/skills/${id}/star`, {
        method: wasStarred ? "DELETE" : "POST",
      });
      if (!res.ok) {
        setSkill({
          ...skill,
          isStarred: wasStarred,
          starCount: skill.starCount,
        });
        if (res.status === 401) {
          toast({ title: t("loginToStar"), variant: "destructive" });
        }
      }
    } catch {
      setSkill({
        ...skill,
        isStarred: wasStarred,
        starCount: skill.starCount,
      });
    }
  };

  const handleDownload = async () => {
    if (!skill) return;
    try {
      const res = await fetch(`/api/skills/${id}/download`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${skill.name}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      setSkill({ ...skill, downloadCount: skill.downloadCount + 1 });
    } catch {
      toast({ title: tc("error"), variant: "destructive" });
    }
  };

  const handleSelectFile = async (filePath: string) => {
    setSelectedFile(filePath);
    setSelectedDirectory(
      filePath.includes("/") ? filePath.slice(0, filePath.lastIndexOf("/")) : ""
    );
    setIsEditing(false);

    try {
      const res = await fetch(`/api/skills/${id}/files/${toRoutePath(filePath)}`);
      const data = await res.json();
      setFileContent(data.content || "");
    } catch {
      setFileContent("Failed to load file");
    }
  };

  const handleSaveFile = async () => {
    if (!selectedFile) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/skills/${id}/files/${toRoutePath(selectedFile)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });

      if (res.ok) {
        setFileContent(editContent);
        setIsEditing(false);
        toast({ title: tc("success"), variant: "success" });

        if (selectedFile === "SKILL.md") {
          setReadme(stripFrontmatter(editContent));
        }
      } else {
        toast({ title: tc("error"), variant: "destructive" });
      }
    } catch {
      toast({ title: tc("error"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCategory = async (value: string) => {
    if (!skill || !isOwner) return;
    const categoryId = value === "__none__" ? null : Number.parseInt(value, 10);
    if (value !== "__none__" && Number.isNaN(categoryId)) {
      toast({ title: tc("error"), variant: "destructive" });
      return;
    }

    try {
      const res = await fetch(`/api/skills/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast({ title: data.error || tc("error"), variant: "destructive" });
        return;
      }

      const selected = categoryId
        ? categories.find((c) => c.id === categoryId) || null
        : null;
      setSkill({
        ...skill,
        categoryId,
        categoryName: selected?.name || null,
        categorySlug: selected?.slug || null,
      });
      toast({ title: tc("success"), variant: "success" });
    } catch {
      toast({ title: tc("error"), variant: "destructive" });
    }
  };

  const handleSaveSummary = async () => {
    if (!skill || !isOwner) return;
    setSummarySaving(true);

    const trimmed = summaryDraft.trim();
    const nextCustomDescription = trimmed.length > 0 ? trimmed : null;

    try {
      const res = await fetch(`/api/skills/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customDescription: nextCustomDescription }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast({ title: data.error || tc("error"), variant: "destructive" });
        return;
      }

      setSkill({
        ...skill,
        customDescription: nextCustomDescription,
        description: nextCustomDescription ?? skill.metadataDescription,
      });
      setSummaryModalOpen(false);
      toast({ title: tc("success"), variant: "success" });
    } catch {
      toast({ title: tc("error"), variant: "destructive" });
    } finally {
      setSummarySaving(false);
    }
  };

  const handleCreateInFiles = async (
    type: "file" | "directory",
    parentPath: string = ""
  ) => {
    if (!isOwner) return;
    const message = type === "file" ? t("newFileName") : t("newFolderName");
    const defaultName = type === "file" ? "new-file.md" : "new-folder";
    const inputName = prompt(
      parentPath
        ? t("createInPathPrompt", { path: parentPath })
        : message,
      defaultName
    )?.trim();
    if (!inputName) return;
    const allowSlashForCreateName = !parentPath;
    const validationError = validateFileNameInput(
      inputName,
      allowSlashForCreateName
    );
    if (validationError) {
      toast({ title: t(validationError), variant: "destructive" });
      return;
    }

    const inputPath = parentPath ? `${parentPath}/${inputName}` : inputName;

    try {
      const res = await fetch(`/api/skills/${id}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, path: inputPath }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error || tc("error"), variant: "destructive" });
        return;
      }

      await refreshFileTree();
      if (type === "file") {
        await handleSelectFile(inputPath);
      } else {
        setSelectedDirectory(inputPath);
      }
      toast({ title: tc("success"), variant: "success" });
    } catch {
      toast({ title: tc("error"), variant: "destructive" });
    }
  };

  const handleRenameInFiles = async (
    currentPath: string,
    type: "file" | "directory"
  ) => {
    if (!isOwner) return;
    const lastSlashIndex = currentPath.lastIndexOf("/");
    const parentPath =
      lastSlashIndex === -1 ? "" : currentPath.slice(0, lastSlashIndex);
    const currentName =
      lastSlashIndex === -1 ? currentPath : currentPath.slice(lastSlashIndex + 1);

    const newName = prompt(
      t(type === "file" ? "renameFilePrompt" : "renameFolderPrompt"),
      currentName
    )?.trim();
    if (!newName || newName === currentName) return;
    const allowSlashForRenameName = false;
    const renameValidationError = validateFileNameInput(
      newName,
      allowSlashForRenameName
    );
    if (renameValidationError) {
      toast({ title: t(renameValidationError), variant: "destructive" });
      return;
    }

    const nextPath = parentPath ? `${parentPath}/${newName}` : newName;
    const shouldRename = confirm(
      t("renameConfirm", {
        from: currentPath,
        to: nextPath,
      })
    );
    if (!shouldRename) return;

    try {
      const res = await fetch(`/api/skills/${id}/files/${toRoutePath(currentPath)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPath: nextPath }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error || tc("error"), variant: "destructive" });
        return;
      }

      setSelectedFile((prev) => replacePathPrefix(prev, currentPath, nextPath));
      setSelectedDirectory((prev) => replacePathPrefix(prev, currentPath, nextPath));

      await refreshFileTree();
      toast({ title: tc("success"), variant: "success" });
    } catch {
      toast({ title: tc("error"), variant: "destructive" });
    }
  };

  const handleDeleteInFiles = async (
    targetPath: string,
    type: "file" | "directory"
  ) => {
    if (!isOwner) return;

    const shouldDelete = confirm(
      t(type === "file" ? "deleteFileConfirm" : "deleteFolderConfirm", {
        path: targetPath,
      })
    );
    if (!shouldDelete) return;

    try {
      const res = await fetch(`/api/skills/${id}/files/${toRoutePath(targetPath)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error || tc("error"), variant: "destructive" });
        return;
      }

      if (selectedFile === targetPath || selectedFile.startsWith(`${targetPath}/`)) {
        setSelectedFile("");
        setFileContent("");
        setIsEditing(false);
      }

      if (
        selectedDirectory === targetPath ||
        selectedDirectory.startsWith(`${targetPath}/`)
      ) {
        setSelectedDirectory("");
      }

      await refreshFileTree();
      toast({ title: tc("success"), variant: "success" });
    } catch {
      toast({ title: tc("error"), variant: "destructive" });
    }
  };

  const filePreviewMarkdown = selectedFile
    ? `\`\`\`${getLanguageFromPath(selectedFile)}\n${fileContent}\n\`\`\`\n`
    : "";

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full max-w-xl" />
          <div className="flex gap-3">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!skill) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 text-center">
        <p className="text-text-muted text-lg">Skill not found</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Skill Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold mb-2">
              {skill.name}
            </h1>
            <p className="text-text-muted text-lg leading-relaxed max-w-2xl">
              {skill.description}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant={skill.isStarred ? "default" : "outline"}
              onClick={handleStar}
              className="gap-2"
            >
              <Star
                className={cn(
                  "h-4 w-4",
                  skill.isStarred && "fill-current"
                )}
              />
              {skill.isStarred ? t("unstarSkill") : t("starSkill")}
              <span className="ml-1 px-2 py-0.5 rounded-full bg-black/20 text-xs">
                {skill.starCount}
              </span>
            </Button>
            <Button variant="outline" onClick={handleDownload} className="gap-2">
              <Download className="h-4 w-4" />
              {t("downloadSkill")}
              <span className="ml-1 px-2 py-0.5 rounded-full bg-black/20 text-xs">
                {skill.downloadCount}
              </span>
            </Button>
          </div>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-text-muted">
          <span className="flex items-center gap-1.5">
            <User className="h-4 w-4" />
            {skill.ownerUsername}
          </span>
          {skill.categoryName && (
            <Badge variant="default">
              <Tag className="h-3 w-3 mr-1" />
              {skill.categoryName}
            </Badge>
          )}
          {skill.license &&
            !/proprietary/i.test(skill.license) &&
            !/license\.txt/i.test(skill.license) && (
            <span className="flex items-center gap-1.5">
              <Shield className="h-4 w-4" />
              {skill.license}
            </span>
            )}
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {t("uploadedAt")}: {formatRelativeTime(new Date(skill.createdAt), locale)}
          </span>
        </div>
        {isOwner && (
          <div className="mt-4 w-full max-w-2xl space-y-3">
            <div className="w-full max-w-xs">
              <Select
                value={
                  skill.categoryId === null ? "__none__" : String(skill.categoryId)
                }
                onValueChange={handleUpdateCategory}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("category")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{tc("all")}</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-text-muted">
                  {t("customSummary")}:
                </p>
                {skill.customDescription ? (
                  <p className="text-sm text-text-muted flex-1 min-w-0 truncate italic">
                    {skill.customDescription}
                  </p>
                ) : (
                  <p className="text-sm text-text-dim flex-1 min-w-0 truncate">
                    {t("customSummaryPlaceholder")}
                  </p>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 shrink-0"
                  onClick={() => {
                    setSummaryDraft(skill.customDescription || "");
                    setSummaryModalOpen(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {t("editSummary")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="readme" className="w-full">
        <TabsList>
          <TabsTrigger value="readme" className="gap-2">
            <BookOpen className="h-4 w-4" />
            {t("readme")}
          </TabsTrigger>
          <TabsTrigger value="files" className="gap-2">
            <Files className="h-4 w-4" />
            {t("files")}
          </TabsTrigger>
          <TabsTrigger value="author" className="gap-2">
            <Users className="h-4 w-4" />
            {t("authorSkills")}
          </TabsTrigger>
        </TabsList>

        {/* README Tab */}
        <TabsContent value="readme">
          <div className="rounded-xl border border-border bg-surface p-6 sm:p-8">
            {readme ? (
              <div className="prose">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeHighlight]}
                >
                  {readme}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="text-text-muted text-center py-10">
                {t("noReadme")}
              </p>
            )}
          </div>
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files">
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] min-h-[600px]">
              {/* File Tree */}
              <div className="border-r border-border bg-surface">
                <div className="p-3 border-b border-border flex items-center justify-between gap-2">
                  <h3 className="text-sm font-medium text-text-muted">{t("files")}</h3>
                  {isOwner && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() =>
                          handleCreateInFiles("directory", selectedDirectory)
                        }
                        title={t("createFolder")}
                      >
                        <FolderPlus className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleCreateInFiles("file", selectedDirectory)}
                        title={t("createFile")}
                      >
                        <FilePlus2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
                <ScrollArea className="h-[600px]">
                  <div className="p-2">
                    {fileTree?.children?.map((node) => (
                      <FileTreeItem
                        key={node.name}
                        node={node}
                        path={node.name}
                        selectedFile={selectedFile}
                        selectedDirectory={selectedDirectory}
                        onSelect={handleSelectFile}
                        onSelectDirectory={setSelectedDirectory}
                        onCreate={handleCreateInFiles}
                        onRename={handleRenameInFiles}
                        onDelete={handleDeleteInFiles}
                        isOwner={isOwner}
                        labels={{
                          createFile: t("createFile"),
                          createFolder: t("createFolder"),
                          rename: t("rename"),
                          delete: tc("delete"),
                        }}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* File Content */}
              <div className="flex flex-col min-w-0 overflow-hidden">
                {selectedFile ? (
                  <>
                    <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border bg-surface-raised/50 min-w-0">
                      <span
                        className="min-w-0 flex-1 truncate text-sm font-mono text-text-muted"
                        title={selectedFile}
                      >
                        {selectedFile}
                      </span>
                      {isOwner && !isEditing && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditContent(fileContent);
                            setIsEditing(true);
                          }}
                          className="gap-1.5"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          {t("editFile")}
                        </Button>
                      )}
                      {isEditing && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsEditing(false)}
                          >
                            <X className="h-3.5 w-3.5 mr-1" />
                            {t("cancelEdit")}
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSaveFile}
                            disabled={saving}
                          >
                            {saving ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                            ) : (
                              <Save className="h-3.5 w-3.5 mr-1" />
                            )}
                            {t("saveFile")}
                          </Button>
                        </div>
                      )}
                    </div>
                    <ScrollArea className="h-[560px]">
                      {isEditing ? (
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full h-full min-h-[560px] p-4 bg-transparent font-[family-name:var(--font-mono)] text-sm leading-relaxed resize-none focus:outline-none"
                          wrap="off"
                          spellCheck={false}
                        />
                      ) : (
                        <div className="p-4 min-w-0">
                          <div className="prose max-w-none min-w-full [&_pre]:max-w-none [&_pre]:min-w-max [&_pre]:whitespace-pre [&_code]:whitespace-pre [&_code]:break-normal">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              rehypePlugins={[rehypeSanitize, rehypeHighlight]}
                            >
                              {filePreviewMarkdown}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </ScrollArea>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-[600px] text-text-dim">
                    <div className="text-center">
                      <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p>{t("fileContent")}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Author's Skills Tab */}
        <TabsContent value="author">
          {authorSkills.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-10 text-center">
              <p className="text-text-muted">{t("noAuthorSkills")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {authorSkills.map((s) => (
                <Link
                  key={s.id}
                  href={`/skills/${s.id}`}
                  className="group rounded-xl border border-border bg-surface hover:bg-surface-hover hover:border-border-hover p-5 transition-all duration-300"
                >
                  <h3 className="font-[family-name:var(--font-display)] font-semibold mb-2 group-hover:text-accent transition-colors">
                    {s.name}
                  </h3>
                  <p className="text-sm text-text-muted line-clamp-2 mb-3">
                    {s.description}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-text-dim">
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3" /> {s.starCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Download className="h-3 w-3" /> {s.downloadCount}
                    </span>
                    {s.categoryName && (
                      <Badge variant="secondary" className="text-[10px]">
                        {s.categoryName}
                      </Badge>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Custom Summary Modal */}
      <Dialog
        open={summaryModalOpen}
        onOpenChange={(open) => {
          if (!open) setSummaryModalOpen(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("customSummary")}</DialogTitle>
            <DialogDescription>{t("customSummaryHint")}</DialogDescription>
          </DialogHeader>
          <textarea
            value={summaryDraft}
            onChange={(e) => setSummaryDraft(e.target.value)}
            placeholder={t("customSummaryPlaceholder")}
            className="w-full min-h-28 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text leading-relaxed focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setSummaryModalOpen(false)}
              disabled={summarySaving}
            >
              {tc("cancel")}
            </Button>
            <Button onClick={handleSaveSummary} disabled={summarySaving}>
              {summarySaving && (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              )}
              {t("saveSummary")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FileTreeItem({
  node,
  path,
  selectedFile,
  selectedDirectory,
  onSelect,
  onSelectDirectory,
  onCreate,
  onRename,
  onDelete,
  isOwner,
  labels,
  depth = 0,
}: {
  node: FileTreeNode;
  path: string;
  selectedFile: string;
  selectedDirectory: string;
  onSelect: (path: string) => void;
  onSelectDirectory: (path: string) => void;
  onCreate: (type: "file" | "directory", parentPath?: string) => void;
  onRename: (path: string, type: "file" | "directory") => void;
  onDelete: (path: string, type: "file" | "directory") => void;
  isOwner: boolean;
  labels: {
    createFile: string;
    createFolder: string;
    rename: string;
    delete: string;
  };
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(depth < 1);

  if (node.type === "directory") {
    return (
      <div>
        <div
          className={cn(
            "group flex items-center gap-1 py-1 rounded-md min-w-0",
            selectedDirectory === path && "bg-accent/10"
          )}
          style={{
            paddingLeft: `${depth * FILE_TREE_INDENT_PER_LEVEL + FILE_TREE_BASE_FOLDER_INDENT}px`,
          }}
        >
          <button
            onClick={() => {
              setExpanded(!expanded);
              onSelectDirectory(path);
            }}
            className="flex w-0 items-center gap-1.5 flex-1 min-w-0 overflow-hidden px-2 py-1.5 text-sm rounded-md hover:bg-surface-hover transition-colors text-left"
          >
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 text-text-dim shrink-0 transition-transform",
                expanded && "rotate-90"
              )}
            />
            {expanded ? (
              <FolderOpen className="h-4 w-4 text-accent shrink-0" />
            ) : (
              <Folder className="h-4 w-4 text-accent shrink-0" />
            )}
            <span className="block min-w-0 flex-1 truncate" title={node.name}>
              {node.name}
            </span>
          </button>
          {isOwner && (
            <div className="flex shrink-0 items-center gap-0.5 pr-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-70 group-hover:opacity-100"
                onClick={() => onCreate("directory", path)}
                title={labels.createFolder}
              >
                <FolderPlus className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-70 group-hover:opacity-100"
                onClick={() => onCreate("file", path)}
                title={labels.createFile}
              >
                <FilePlus2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-70 group-hover:opacity-100"
                onClick={() => onRename(path, "directory")}
                title={labels.rename}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive opacity-70 group-hover:opacity-100"
                onClick={() => onDelete(path, "directory")}
                title={labels.delete}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
        {expanded &&
          node.children?.map((child) => (
            <FileTreeItem
              key={child.name}
              node={child}
              path={`${path}/${child.name}`}
              selectedFile={selectedFile}
              selectedDirectory={selectedDirectory}
              onSelect={onSelect}
              onSelectDirectory={onSelectDirectory}
              onCreate={onCreate}
              onRename={onRename}
              onDelete={onDelete}
              isOwner={isOwner}
              labels={labels}
              depth={depth + 1}
            />
          ))}
      </div>
    );
  }

  return (
    <div
      className="group flex items-center gap-1 min-w-0"
      style={{
        paddingLeft: `${depth * FILE_TREE_INDENT_PER_LEVEL + FILE_TREE_BASE_FILE_INDENT}px`,
      }}
    >
      <button
        onClick={() => onSelect(path)}
        className={cn(
          "flex w-0 items-center gap-1.5 flex-1 min-w-0 overflow-hidden px-2 py-1.5 text-sm rounded-md transition-colors text-left",
          selectedFile === path
            ? "bg-accent/10 text-accent"
            : "hover:bg-surface-hover text-text-muted hover:text-text"
        )}
      >
        <FileText className="h-4 w-4 shrink-0" />
        <span className="block min-w-0 flex-1 truncate" title={node.name}>
          {node.name}
        </span>
      </button>
      {isOwner && (
        <div className="flex shrink-0 items-center gap-0.5 pr-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-70 group-hover:opacity-100"
            onClick={() => onRename(path, "file")}
            title={labels.rename}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive opacity-70 group-hover:opacity-100"
            onClick={() => onDelete(path, "file")}
            title={labels.delete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
