"use client";

import { useState, useEffect, use } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";

interface SkillDetail {
  id: string;
  name: string;
  description: string;
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
  const [fileContent, setFileContent] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState<string>("");
  const [authorSkills, setAuthorSkills] = useState<AuthorSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

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
        if (data.content) setReadme(data.content);
      })
      .catch(() => {});
  }, [skill, id]);

  useEffect(() => {
    if (!skill) return;
    fetch(`/api/skills/${id}/files`)
      .then((res) => res.json())
      .then((data) => setFileTree(data))
      .catch(() => {});
  }, [skill, id]);

  useEffect(() => {
    if (!skill) return;
    fetch(`/api/skills/${id}/author-skills`)
      .then((res) => res.json())
      .then((data) => setAuthorSkills(data.skills || []))
      .catch(() => {});
  }, [skill, id]);

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
    setIsEditing(false);

    try {
      const res = await fetch(`/api/skills/${id}/files/${filePath}`);
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
      const res = await fetch(`/api/skills/${id}/files/${selectedFile}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });

      if (res.ok) {
        setFileContent(editContent);
        setIsEditing(false);
        toast({ title: tc("success"), variant: "success" });

        if (selectedFile === "SKILL.md") {
          setReadme(editContent);
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
          {skill.license && (
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
            <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] min-h-[500px]">
              {/* File Tree */}
              <div className="border-r border-border bg-surface">
                <div className="p-3 border-b border-border">
                  <h3 className="text-sm font-medium text-text-muted">
                    {t("files")}
                  </h3>
                </div>
                <ScrollArea className="h-[500px]">
                  <div className="p-2">
                    {fileTree?.children?.map((node) => (
                      <FileTreeItem
                        key={node.name}
                        node={node}
                        path={node.name}
                        selectedFile={selectedFile}
                        onSelect={handleSelectFile}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* File Content */}
              <div className="flex flex-col">
                {selectedFile ? (
                  <>
                    <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface-raised/50">
                      <span className="text-sm font-mono text-text-muted">
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
                    <ScrollArea className="h-[460px]">
                      {isEditing ? (
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full h-full min-h-[460px] p-4 bg-transparent font-[family-name:var(--font-mono)] text-sm leading-relaxed resize-none focus:outline-none"
                          spellCheck={false}
                        />
                      ) : (
                        <pre className="p-4 font-[family-name:var(--font-mono)] text-sm leading-relaxed whitespace-pre-wrap break-all">
                          {fileContent}
                        </pre>
                      )}
                    </ScrollArea>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-[500px] text-text-dim">
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
    </div>
  );
}

function FileTreeItem({
  node,
  path,
  selectedFile,
  onSelect,
  depth = 0,
}: {
  node: FileTreeNode;
  path: string;
  selectedFile: string;
  onSelect: (path: string) => void;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(depth < 1);

  if (node.type === "directory") {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "flex items-center gap-1.5 w-full px-2 py-1.5 text-sm rounded-md hover:bg-surface-hover transition-colors text-left"
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
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
          <span className="truncate">{node.name}</span>
        </button>
        {expanded &&
          node.children?.map((child) => (
            <FileTreeItem
              key={child.name}
              node={child}
              path={`${path}/${child.name}`}
              selectedFile={selectedFile}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelect(path)}
      className={cn(
        "flex items-center gap-1.5 w-full px-2 py-1.5 text-sm rounded-md transition-colors text-left",
        selectedFile === path
          ? "bg-accent/10 text-accent"
          : "hover:bg-surface-hover text-text-muted hover:text-text"
      )}
      style={{ paddingLeft: `${depth * 16 + 26}px` }}
    >
      <FileText className="h-4 w-4 shrink-0" />
      <span className="truncate">{node.name}</span>
    </button>
  );
}
