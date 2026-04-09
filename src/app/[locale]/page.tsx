"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import {
  Star,
  Download,
  Search,
  ArrowUpDown,
  Zap,
  Layers,
  Users,
  Clock,
  User,
} from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";

interface Skill {
  id: string;
  name: string;
  description: string;
  starCount: number;
  downloadCount: number;
  createdAt: string;
  ownerUsername: string;
  ownerId: string;
  categoryName: string | null;
  categorySlug: string | null;
  isStarred: boolean;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

export default function HomePage() {
  const t = useTranslations("home");
  const tc = useTranslations("common");
  const locale = useLocale();

  const [skills, setSkills] = useState<Skill[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sort, setSort] = useState("created_at");
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(
    null
  );
  const totalStars = useMemo(
    () => skills.reduce((sum, item) => sum + item.starCount, 0),
    [skills]
  );

  const fetchSkills = useCallback(
    async (pageNum: number, append: boolean = false) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(pageNum),
          limit: "12",
          sort,
          order: "desc",
        });
        if (search) params.set("search", search);
        if (selectedCategory) params.set("category", selectedCategory);

        const res = await fetch(`/api/skills?${params}`);
        const data = await res.json();

        if (append) {
          setSkills((prev) => [...prev, ...data.skills]);
        } else {
          setSkills(data.skills);
        }
        setTotal(data.total);
        setTotalPages(data.totalPages);
      } catch {
        toast({ title: tc("error"), variant: "destructive" });
      } finally {
        setLoading(false);
      }
    },
    [search, selectedCategory, sort, tc]
  );

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data.categories))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setPage(1);
    fetchSkills(1);
  }, [fetchSkills]);

  const handleSearch = (value: string) => {
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => {
      setSearch(value);
    }, 300);
    setSearchTimeout(timeout);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchSkills(nextPage, true);
  };

  const handleStar = async (skillId: string, isStarred: boolean) => {
    setSkills((prev) =>
      prev.map((s) =>
        s.id === skillId
          ? {
              ...s,
              isStarred: !isStarred,
              starCount: isStarred ? s.starCount - 1 : s.starCount + 1,
            }
          : s
      )
    );

    try {
      const res = await fetch(`/api/skills/${skillId}/star`, {
        method: isStarred ? "DELETE" : "POST",
      });

      if (!res.ok) {
        if (res.status === 401) {
          toast({
            title: locale === "zh" ? "请先登录" : "Please sign in to star",
            variant: "destructive",
          });
        }
        // Revert optimistic update
        setSkills((prev) =>
          prev.map((s) =>
            s.id === skillId
              ? {
                  ...s,
                  isStarred,
                  starCount: isStarred ? s.starCount + 1 : s.starCount - 1,
                }
              : s
          )
        );
      }
    } catch {
      setSkills((prev) =>
        prev.map((s) =>
          s.id === skillId
            ? {
                ...s,
                isStarred,
                starCount: isStarred ? s.starCount + 1 : s.starCount - 1,
              }
            : s
        )
      );
    }
  };

  return (
    <div className="pb-16">
      <section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16">
        <div className="absolute inset-x-4 top-8 h-64 rounded-[2rem] bg-gradient-to-r from-accent/10 via-accent/5 to-transparent blur-3xl pointer-events-none" />
        <div className="relative rounded-[2rem] border border-border bg-surface/90 px-6 py-9 sm:px-10 shadow-[0_32px_70px_-46px_color-mix(in_srgb,var(--color-text)_38%,transparent)]">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div className="space-y-4">
              <h1 className="font-[family-name:var(--font-display)] text-5xl sm:text-6xl lg:text-7xl leading-[0.96] tracking-tight text-accent">
                {t("title")}
              </h1>
              <p className="font-[family-name:var(--font-display)] text-2xl text-text-muted">
                {t("subtitle")}
              </p>
              <p className="text-base sm:text-lg leading-relaxed text-text-muted max-w-2xl">
                {t("description")}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="rounded-2xl border border-border bg-surface-raised p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-text-dim">
                  {t("sortNewest")}
                </p>
                <p className="mt-2 font-[family-name:var(--font-display)] text-3xl text-accent">
                  {total}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-surface-raised p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-text-dim">
                  {t("sortStars")}
                </p>
                <p className="mt-2 font-[family-name:var(--font-display)] text-3xl text-accent">
                  {totalStars}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-7 max-w-2xl relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-dim" />
            <Input
              defaultValue={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={tc("search")}
              className="pl-12 h-12 text-base bg-surface"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          {(
            [
              {
                icon: Zap,
                titleKey: "advantage1Title",
                descKey: "advantage1Desc",
              },
              {
                icon: Layers,
                titleKey: "advantage2Title",
                descKey: "advantage2Desc",
              },
              {
                icon: Users,
                titleKey: "advantage3Title",
                descKey: "advantage3Desc",
              },
            ] as const
          ).map(({ icon: Icon, titleKey, descKey }) => (
            <div
              key={titleKey}
              className="group rounded-2xl border border-border bg-surface p-5 transition-all duration-300 hover:border-border-hover hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-24px_rgba(67,44,25,0.45)]"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-accent/12 text-accent">
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="font-semibold text-sm">{t(titleKey)}</h3>
              </div>
              <p className="text-sm text-text-muted leading-relaxed">
                {t(descKey)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-10">
        <div className="rounded-[1.75rem] border border-border bg-surface/90 p-5 sm:p-7 shadow-[0_20px_45px_-38px_color-mix(in_srgb,var(--color-text)_34%,transparent)]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto scrollbar-none">
              <button
                onClick={() => setSelectedCategory("")}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap border transition-all duration-200",
                  !selectedCategory
                    ? "bg-accent text-on-solid border-accent"
                    : "bg-surface text-text-muted hover:text-text hover:bg-surface-hover border-border"
                )}
              >
                {tc("all")}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.slug}
                  onClick={() =>
                    setSelectedCategory(
                      selectedCategory === cat.slug ? "" : cat.slug
                    )
                  }
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap border transition-all duration-200",
                    selectedCategory === cat.slug
                      ? "bg-accent text-on-solid border-accent"
                      : "bg-surface text-text-muted hover:text-text hover:bg-surface-hover border-border"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 shrink-0 rounded-xl border border-border bg-surface-raised px-3 py-2">
              <ArrowUpDown className="h-4 w-4 text-text-dim" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="bg-transparent text-sm text-text focus:outline-none"
              >
                <option value="created_at">{t("sortNewest")}</option>
                <option value="stars">{t("sortStars")}</option>
              </select>
            </div>
          </div>

          {!loading && (
            <p className="text-sm text-text-dim mb-4">
              {t("skillCount", { count: total })}
            </p>
          )}

          {loading && skills.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-border bg-surface-raised p-6 space-y-4"
                >
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <div className="flex gap-3 pt-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : skills.length === 0 && !loading ? (
            <div className="text-center py-24 rounded-2xl border border-dashed border-border bg-surface-raised/70">
              <p className="font-[family-name:var(--font-display)] text-3xl text-text-muted">
                {tc("noResults")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {skills.map((skill) => (
                <div
                  key={skill.id}
                  className="group rounded-2xl border border-border bg-surface hover:bg-surface-raised hover:border-border-hover hover:-translate-y-1 transition-all duration-300 shadow-[0_1px_0_0_rgba(255,255,255,0.6)] hover:shadow-[0_20px_40px_-28px_rgba(51,36,21,0.5)]"
                >
                  <Link href={`/skills/${skill.id}`} className="block p-6">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3
                        className="font-[family-name:var(--font-display)] text-2xl leading-tight font-semibold group-hover:text-accent transition-colors line-clamp-1"
                        title={skill.name}
                        aria-label={skill.name}
                      >
                        {skill.name}
                      </h3>
                      {skill.categoryName && (
                        <Badge variant="default" className="shrink-0 text-[10px]">
                          {skill.categoryName}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-text-muted line-clamp-2 mb-4 leading-relaxed">
                      {skill.description}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-text-dim">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {skill.ownerUsername}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatRelativeTime(new Date(skill.createdAt), locale)}
                      </span>
                    </div>
                  </Link>
                  <div className="px-6 pb-5 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-text-muted">
                      <span className="flex items-center gap-1.5">
                        <Download className="h-3.5 w-3.5" />
                        {skill.downloadCount}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleStar(skill.id, skill.isStarred);
                      }}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-200",
                        skill.isStarred
                          ? "bg-accent/12 border-accent/30 text-accent"
                          : "bg-surface-raised border-border text-text-muted hover:text-accent hover:border-accent/35 hover:bg-accent/8"
                      )}
                    >
                      <Star
                        className={cn(
                          "h-3.5 w-3.5",
                          skill.isStarred && "fill-accent"
                        )}
                      />
                      {skill.starCount}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {page < totalPages && (
            <div className="flex justify-center mt-10">
              <Button
                variant="outline"
                size="lg"
                onClick={handleLoadMore}
                disabled={loading}
              >
                {loading ? tc("loading") : t("loadMore")}
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
