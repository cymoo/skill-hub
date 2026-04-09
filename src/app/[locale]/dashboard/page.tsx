"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import {
  Star,
  Download,
  Upload,
  Plus,
  Trash2,
  Pencil,
  Package,
  Clock,
  Loader2,
  FolderPlus,
  Tag,
  BarChart3,
} from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";

interface UserInfo {
  id: string;
  username: string;
  email: string;
}

interface Skill {
  id: string;
  name: string;
  description: string;
  starCount: number;
  downloadCount: number;
  createdAt: string;
  ownerUsername: string;
  categoryName: string | null;
  categorySlug: string | null;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
}

interface Stats {
  totalSkills: number;
  totalStars: number;
  totalDownloads: number;
}

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const tcat = useTranslations("category");
  const locale = useLocale();
  const router = useRouter();

  const [user, setUser] = useState<UserInfo | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalSkills: 0,
    totalStars: 0,
    totalDownloads: 0,
  });
  const [loading, setLoading] = useState(true);

  // Upload dialog
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategoryId, setUploadCategoryId] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createCategoryId, setCreateCategoryId] = useState<string>("");
  const [creating, setCreating] = useState(false);

  // Category dialog
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDesc, setCategoryDesc] = useState("");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryLoading, setCategoryLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [meRes, statsRes, categoriesRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/dashboard/stats"),
        fetch("/api/categories"),
      ]);

      const meData = await meRes.json();
      if (!meData.user) {
        router.push("/auth/login");
        return;
      }

      setUser(meData.user);

      const statsData = await statsRes.json();
      setStats(statsData);

      const catData = await categoriesRes.json();
      setCategories(catData.categories);

      const skillsRes = await fetch(
        `/api/skills?owner=${meData.user.username}&limit=100`
      );
      const skillsData = await skillsRes.json();
      setSkills(skillsData.skills);
    } catch {
      toast({ title: tc("error"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [router, tc]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      if (uploadCategoryId) formData.append("categoryId", uploadCategoryId);

      const res = await fetch("/api/skills/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error, variant: "destructive" });
        return;
      }

      toast({ title: t("uploadSuccess"), variant: "success" });
      setUploadOpen(false);
      setUploadFile(null);
      setUploadCategoryId("");
      fetchData();
    } catch {
      toast({ title: tc("error"), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async () => {
    if (!createName || !createDesc) return;
    setCreating(true);

    try {
      const res = await fetch("/api/skills/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName,
          description: createDesc,
          categoryId: createCategoryId
            ? parseInt(createCategoryId)
            : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error, variant: "destructive" });
        return;
      }

      toast({ title: tc("success"), variant: "success" });
      setCreateOpen(false);
      setCreateName("");
      setCreateDesc("");
      setCreateCategoryId("");
      router.push(`/skills/${data.skill.id}`);
    } catch {
      toast({ title: tc("error"), variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (skillId: string) => {
    if (!confirm(t("deleteConfirm"))) return;

    try {
      const res = await fetch(`/api/skills/${skillId}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: tc("success"), variant: "success" });
        fetchData();
      }
    } catch {
      toast({ title: tc("error"), variant: "destructive" });
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryName) return;
    setCategoryLoading(true);

    try {
      const url = editingCategory
        ? `/api/categories/${editingCategory.id}`
        : "/api/categories";
      const method = editingCategory ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: categoryName,
          description: categoryDesc || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error, variant: "destructive" });
        return;
      }

      toast({ title: tc("success"), variant: "success" });
      setCategoryOpen(false);
      setCategoryName("");
      setCategoryDesc("");
      setEditingCategory(null);
      fetchData();
    } catch {
      toast({ title: tc("error"), variant: "destructive" });
    } finally {
      setCategoryLoading(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm(tc("confirm") + "?")) return;

    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: tc("success"), variant: "success" });
        fetchData();
      }
    } catch {
      toast({ title: tc("error"), variant: "destructive" });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".zip")) {
      setUploadFile(file);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="mb-6 h-8 w-48" />
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Welcome */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-1 font-[family-name:var(--font-display)] text-3xl font-bold">
            {t("title")}
          </h1>
          <p className="text-text-muted">
            {t("welcome", { name: user?.username || "" })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Upload Dialog */}
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Upload className="h-4 w-4" />
                {t("uploadSkill")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("uploadTitle")}</DialogTitle>
                <DialogDescription>{t("uploadDescription")}</DialogDescription>
              </DialogHeader>
              <div className="mt-4 space-y-4">
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className={cn(
                    "cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors",
                    uploadFile
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-border-hover"
                  )}
                  onClick={() => document.getElementById("zip-upload")?.click()}
                >
                  <input
                    id="zip-upload"
                    type="file"
                    accept=".zip"
                    className="hidden"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  />
                  <Upload className="mx-auto mb-3 h-8 w-8 text-text-dim" />
                  {uploadFile ? (
                    <p className="text-sm font-medium text-accent">
                      {uploadFile.name} (
                      {(uploadFile.size / 1024 / 1024).toFixed(1)} MB)
                    </p>
                  ) : (
                    <p className="text-sm text-text-muted">{t("dragDrop")}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>{t("selectCategory")}</Label>
                  <Select
                    value={uploadCategoryId}
                    onValueChange={setUploadCategoryId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("selectCategory")} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleUpload}
                  disabled={!uploadFile || uploading}
                  className="w-full"
                >
                  {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {tc("upload")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Create Dialog */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <FolderPlus className="h-4 w-4" />
                {t("createSkill")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("createTitle")}</DialogTitle>
                <DialogDescription>{t("createDescription")}</DialogDescription>
              </DialogHeader>
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label>{t("skillName")}</Label>
                  <Input
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="my-awesome-skill"
                  />
                  <p className="text-xs text-text-dim">
                    Lowercase letters, numbers, hyphens only
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>{t("skillDescription")}</Label>
                  <Textarea
                    value={createDesc}
                    onChange={(e) => setCreateDesc(e.target.value)}
                    placeholder="Describe what this skill does..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("selectCategory")}</Label>
                  <Select
                    value={createCategoryId}
                    onValueChange={setCreateCategoryId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("selectCategory")} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleCreate}
                  disabled={!createName || !createDesc || creating}
                  className="w-full"
                >
                  {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                  {tc("save")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            label: t("totalSkills"),
            value: stats.totalSkills,
            icon: Package,
            color: "text-accent",
          },
          {
            label: t("totalStars"),
            value: stats.totalStars,
            icon: Star,
            color: "text-yellow-400",
          },
          {
            label: t("totalDownloads"),
            value: stats.totalDownloads,
            icon: Download,
            color: "text-emerald-400",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="flex items-center gap-4 rounded-xl border border-border bg-surface p-5"
          >
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl bg-surface-raised",
                color
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-sm text-text-muted">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* My Skills */}
      <div className="mb-10">
        <h2 className="mb-4 flex items-center gap-2 font-[family-name:var(--font-display)] text-xl font-semibold">
          <BarChart3 className="h-5 w-5 text-accent" />
          {t("mySkills")}
        </h2>
        {skills.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface/50 p-12 text-center">
            <Package className="mx-auto mb-3 h-10 w-10 text-text-dim opacity-30" />
            <p className="text-text-muted">{t("noSkills")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {skills.map((skill) => (
              <Card key={skill.id} className="group hover:border-border-hover">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <Link
                      href={`/skills/${skill.id}`}
                      className="font-[family-name:var(--font-display)] text-lg font-semibold transition-colors group-hover:text-accent"
                    >
                      {skill.name}
                    </Link>
                    {skill.categoryName && (
                      <Badge
                        variant="default"
                        className="shrink-0 text-[10px]"
                      >
                        {skill.categoryName}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  <p className="line-clamp-2 text-sm text-text-muted">
                    {skill.description}
                  </p>
                  <div className="mt-3 flex items-center gap-4 text-xs text-text-dim">
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3" /> {skill.starCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Download className="h-3 w-3" /> {skill.downloadCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />{" "}
                      {formatRelativeTime(new Date(skill.createdAt), locale)}
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="gap-2 border-t border-border pt-3">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/skills/${skill.id}`}>
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      {tc("edit")}
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger hover:text-danger"
                    onClick={() => handleDelete(skill.id)}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    {tc("delete")}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Category Management */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl font-semibold">
            <Tag className="h-5 w-5 text-accent" />
            {tcat("manage")}
          </h2>
          <Dialog
            open={categoryOpen}
            onOpenChange={(open) => {
              setCategoryOpen(open);
              if (!open) {
                setEditingCategory(null);
                setCategoryName("");
                setCategoryDesc("");
              }
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                {tcat("create")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCategory ? tcat("edit") : tcat("create")}
                </DialogTitle>
              </DialogHeader>
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label>{tcat("name")}</Label>
                  <Input
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder="Category name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tcat("description")}</Label>
                  <Textarea
                    value={categoryDesc}
                    onChange={(e) => setCategoryDesc(e.target.value)}
                    placeholder="Optional description"
                    rows={2}
                  />
                </div>
                <Button
                  onClick={handleSaveCategory}
                  disabled={!categoryName || categoryLoading}
                  className="w-full"
                >
                  {categoryLoading && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {tc("save")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {categories.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface/50 p-8 text-center">
            <p className="text-text-muted">{tcat("noCategories")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between rounded-lg border border-border bg-surface p-4"
              >
                <div>
                  <p className="text-sm font-medium">{cat.name}</p>
                  {cat.description && (
                    <p className="mt-0.5 text-xs text-text-muted">
                      {cat.description}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setEditingCategory(cat);
                      setCategoryName(cat.name);
                      setCategoryDesc(cat.description || "");
                      setCategoryOpen(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-danger hover:text-danger"
                    onClick={() => handleDeleteCategory(cat.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
