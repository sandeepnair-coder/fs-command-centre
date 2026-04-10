"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Brain,
  Hash,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { getInsights, type OpportunityInsight } from "./actions";

const STATUS_STYLES: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  new: { label: "New", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", icon: Clock },
  analyzing: { label: "Analyzing", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", icon: Brain },
  analyzed: { label: "Analyzed", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", icon: CheckCircle },
  error: { label: "Error", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300", icon: XCircle },
};

export default function SlackInsightsPage() {
  const [insights, setInsights] = useState<OpportunityInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getInsights()
      .then(setInsights)
      .catch(() => setInsights([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="mb-4 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <Link href="/settings/integrations">
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <Brain className="h-5 w-5" />
          <h1 className="text-xl font-bold tracking-tight">Slack Insights</h1>
          {!loading && (
            <Badge variant="secondary" className="text-xs">{insights.length}</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground ml-9">
          Meeting notes detected from Slack channels, analyzed by OpenClaw for opportunities.
        </p>
      </div>

      <Separator className="mb-4 shrink-0" />

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
          </div>
        ) : insights.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Brain className="h-10 w-10 mb-3" />
            <p className="text-sm font-medium">No insights yet</p>
            <p className="text-xs mt-1 text-pretty text-center max-w-sm">
              When Granola meeting notes are posted in monitored Slack channels,
              they will appear here with AI-generated opportunity analysis.
            </p>
          </div>
        ) : (
          <div className="space-y-3 pb-4">
            {insights.map((insight) => {
              const statusConfig = STATUS_STYLES[insight.status] || STATUS_STYLES.new;
              const StatusIcon = statusConfig.icon;

              return (
                <div key={insight.id} className="rounded-lg border bg-card p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {insight.channel_name && (
                        <Badge variant="outline" className="text-[10px] gap-1 shrink-0">
                          <Hash className="h-2.5 w-2.5" />
                          {insight.channel_name}
                        </Badge>
                      )}
                      <Badge variant="secondary" className={cn("text-[10px] gap-1 shrink-0", statusConfig.color)}>
                        <StatusIcon className="h-2.5 w-2.5" />
                        {statusConfig.label}
                      </Badge>
                      {insight.upsell_opportunity && (
                        <Badge variant="secondary" className="text-[10px] gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 shrink-0">
                          <TrendingUp className="h-2.5 w-2.5" />
                          Opportunity
                        </Badge>
                      )}
                      {insight.is_client_related && !insight.upsell_opportunity && (
                        <Badge variant="secondary" className="text-[10px] gap-1 shrink-0">
                          Client Related
                        </Badge>
                      )}
                    </div>
                    <span className="text-[10px] tabular-nums text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(insight.created_at), { addSuffix: true })}
                    </span>
                  </div>

                  {/* Summary */}
                  {insight.summary && (
                    <p className="text-sm text-foreground leading-relaxed">{insight.summary}</p>
                  )}

                  {/* Details */}
                  {insight.status === "analyzed" && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      {insight.recommended_service && (
                        <div className="rounded border p-2">
                          <p className="text-muted-foreground text-[10px] mb-0.5">Recommended</p>
                          <p className="font-medium">{insight.recommended_service}</p>
                        </div>
                      )}
                      {insight.confidence_score !== null && (
                        <div className="rounded border p-2">
                          <p className="text-muted-foreground text-[10px] mb-0.5">Confidence</p>
                          <p className="font-medium tabular-nums">{Math.round(insight.confidence_score * 100)}%</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Rationale */}
                  {insight.rationale && insight.status === "analyzed" && (
                    <p className="text-xs text-muted-foreground italic">{insight.rationale}</p>
                  )}

                  {/* Note preview */}
                  <details className="group">
                    <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                      Show original note
                    </summary>
                    <pre className="mt-2 text-xs bg-muted/50 rounded p-3 whitespace-pre-wrap max-h-40 overflow-y-auto text-muted-foreground leading-relaxed">
                      {insight.note_text}
                    </pre>
                  </details>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
