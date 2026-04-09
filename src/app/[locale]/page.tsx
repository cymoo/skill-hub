"use client";

import { useState, useEffect, useCallback } from "react";
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
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-12">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
              <span className="text-accent">{t("title")}</span>
            </h1>
            <p className="text-xl sm:text-2xl text-text-muted font-[family-name:var(--font-display)] mb-3">
              {t("subtitle")}
            </p>
            <p className="text-text-dim leading-relaxed mb-10 max-w-2xl mx-auto">
              {t("description")}
            </p>
          </div>

          {/* Advantage cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto mb-10">
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
                className="group p-5 rounded-xl border border-border/50 bg-surface/50 hover:bg-surface hover:border-border transition-all duration-300"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors">
                    <Icon className="h-4 w-4 text-accent" />
                  </div>
                  <h3 className="font-semibold text-sm">{t(titleKey)}</h3>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  {t(descKey)}
                </p>
              </div>
            ))}
          </div>

          {/* Search bar */}
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-dim" />
            <Input
              defaultValue={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={tc("search")}
              className="pl-12 h-12 text-base bg-surface border-border/50 focus:border-accent"
            />
          </div>
        </div>
      </section>

      {/* Filters & Content */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
        {/* Category pills + Sort */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto scrollbar-none">
            <button
              onClick={() => setSelectedCategory("")}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200",
                !selectedCategory
                  ? "bg-accent text-bg"
                  : "bg-surface text-text-muted hover:text-text hover:bg-surface-hover border border-border"
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
                  "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200",
                  selectedCategory === cat.slug
                    ? "bg-accent text-bg"
                    : "bg-surface text-text-muted hover:text-text hover:bg-surface-hover border border-border"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <ArrowUpDown className="h-4 w-4 text-text-dim" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-text focus:border-accent focus:outline-none"
            >
              <option value="created_at">{t("sortNewest")}</option>
              <option value="stars">{t("sortStars")}</option>
            </select>
          </div>
        </div>

        {/* Results count */}
        {!loading && (
          <p className="text-sm text-text-dim mb-4">
            {t("skillCount", { count: total })}
          </p>
        )}

        {/* Skill grid */}
        {loading && skills.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-surface p-6 space-y-4"
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
          <div className="text-center py-20">
            <p className="text-text-muted text-lg">{tc("noResults")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {skills.map((skill, index) => (
              <div
                key={skill.id}
                className="group rounded-xl border border-border bg-surface hover:bg-surface-hover hover:border-border-hover hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
                style={{ animationDelay: `${(index % 12) * 50}ms` }}
              >
                <Link href={`/skills/${skill.id}`} className="block p-6">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold group-hover:text-accent transition-colors line-clamp-1">
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
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
                      skill.isStarred
                        ? "bg-accent/15 text-accent"
                        : "bg-surface-raised text-text-muted hover:text-accent hover:bg-accent/10"
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

        {/* Load More */}
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
      </section>
    </div>
  );
}
