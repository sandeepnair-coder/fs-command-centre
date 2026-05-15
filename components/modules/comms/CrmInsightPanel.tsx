"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ListPlus,
  Bookmark,
  ThumbsUp,
  CheckCircle2,
  Copy,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CalendarClock,
  Zap,
  Target,
  Link2,
  ExternalLink,
  CircleDot,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/lib/types/comms";
import {
  HEALTH_CONFIG,
  SENTIMENT_CONFIG,
} from "@/lib/types/comms";
import { formatDistanceToNow } from "date-fns";
import type { getClientCrmInsight } from "@/app/(app)/comms/actions";

type ClientInsight = Awaited<ReturnType<typeof getClientCrmInsight>> | null;

export function CrmInsightPanel({
  selected,
  clientInsight,
  onCreateTask,
  onCreateProject,
  onSaveFact,
  onAddContact,
  onSetFollowUp,
  onMarkResolved,
  onCopySourceLink,
  onLinkClient,
  onCreateClient,
}: {
  selected: (Conversation & { client_name: string | null }) | undefined;
  clientInsight: ClientInsight;
  onCreateTask: () => void;
  onCreateProject: () => void;
  onSaveFact: () => void;
  onAddContact: () => void;
  onSetFollowUp: () => void;
  onMarkResolved: () => void;
  onCopySourceLink: () => void;
  onLinkClient: () => void;
  onCreateClient: () => void;
}) {
  return (
    <div className="w-80 shrink-0 border-l">
      {selected ? (
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">

            {/* Client Snapshot */}
            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50">Client Snapshot</p>
              {selected.client_name ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">{selected.client_name.charAt(0)}</div>
                    <div>
                      <p className="text-sm font-semibold">{selected.client_name}</p>
                      {selected.client_industry && <p className="text-[10px] text-muted-foreground">{selected.client_industry}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("size-2 rounded-full", HEALTH_CONFIG[selected.relationship_health].dot)} />
                    <span className={cn("text-xs font-medium", HEALTH_CONFIG[selected.relationship_health].color)}>
                      {HEALTH_CONFIG[selected.relationship_health].label}
                    </span>
                    {selected.sentiment && (
                      <span className={cn("text-[10px]", SENTIMENT_CONFIG[selected.sentiment].color)}>
                        {SENTIMENT_CONFIG[selected.sentiment].label}
                      </span>
                    )}
                  </div>
                  {clientInsight && (
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded border p-1.5"><p className="text-lg font-bold tabular-nums">{clientInsight.summary.active_projects}</p><p className="text-[9px] text-muted-foreground">Projects</p></div>
                      <div className="rounded border p-1.5"><p className="text-lg font-bold tabular-nums">{clientInsight.summary.total_open_tasks}</p><p className="text-[9px] text-muted-foreground">Open Tasks</p></div>
                      <div className="rounded border p-1.5"><p className="text-lg font-bold tabular-nums">{clientInsight.summary.total_contacts}</p><p className="text-[9px] text-muted-foreground">Contacts</p></div>
                    </div>
                  )}
                  {selected.client_id && (
                    <Link href={`/clients/${selected.client_id}`} className="flex items-center gap-1 text-xs text-primary hover:underline">
                      <ExternalLink className="size-3" /> Open full profile
                    </Link>
                  )}
                </div>
              ) : (
                <div className="text-center py-2">
                  <AlertTriangle className="mx-auto mb-1 size-5 text-amber-500" />
                  <p className="text-xs font-medium text-amber-600">Unlinked Thread</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground text-pretty">Link to a client to enable task and project creation.</p>
                  <div className="mt-2 flex gap-1.5 justify-center">
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onLinkClient}><Link2 className="mr-1 size-3" /> Link to Client</Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onCreateClient}><UserPlus className="mr-1 size-3" /> New Client</Button>
                  </div>
                </div>
              )}
            </div>

            {/* AI Summary */}
            {selected.ai_summary && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50 mb-2 flex items-center gap-1"><Zap className="size-3" /> AI Summary</p>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground text-pretty leading-relaxed">{selected.ai_summary}</p>
                </div>
              </div>
            )}

            {/* Open Asks */}
            {selected.extracted_asks.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50 mb-2 flex items-center gap-1"><Target className="size-3" /> Open Asks</p>
                <ul className="space-y-1.5">
                  {selected.extracted_asks.map((ask, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                      <CircleDot className={cn("size-3 shrink-0 mt-0.5", ask.resolved ? "text-emerald-500" : "text-amber-500")} />
                      <span className={ask.resolved ? "line-through" : ""}>{ask.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Decisions */}
            {selected.extracted_decisions.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50 mb-2">Decisions</p>
                <ul className="space-y-1.5">
                  {selected.extracted_decisions.map((d, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                      <ThumbsUp className="size-3 shrink-0 mt-0.5 text-emerald-500" />
                      <span>{d.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Deadlines */}
            {selected.extracted_deadlines.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50 mb-2 flex items-center gap-1"><CalendarClock className="size-3" /> Deadlines</p>
                <ul className="space-y-1.5">
                  {selected.extracted_deadlines.map((dl, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                      <Clock className="size-3 shrink-0 mt-0.5 text-red-500" />
                      <span>{dl.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Risks */}
            {(selected.relationship_health === "at_risk" || selected.sentiment === "urgent" || selected.sentiment === "frustrated") && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-red-500 mb-2 flex items-center gap-1"><AlertTriangle className="size-3" /> Risks</p>
                <div className="rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 p-3">
                  <p className="text-xs text-red-700 dark:text-red-300 text-pretty">
                    {selected.relationship_health === "at_risk" ? "This client relationship is at risk. " : ""}
                    {selected.sentiment === "urgent" ? "Client communication has urgent tone. " : ""}
                    {selected.sentiment === "frustrated" ? "Client appears frustrated. Prioritize response. " : ""}
                    {selected.follow_up_at ? `Follow-up due ${formatDistanceToNow(new Date(selected.follow_up_at), { addSuffix: true })}.` : ""}
                  </p>
                </div>
              </div>
            )}

            {/* Recommended Actions */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50 mb-2 flex items-center gap-1"><Zap className="size-3" /> Actions</p>
              <div className="grid grid-cols-1 gap-1.5">
                <Button variant="outline" size="sm" className="h-8 justify-start text-xs" onClick={onCreateTask} disabled={!selected?.client_id}><ListPlus className="mr-1.5 size-3.5" /> Create Task</Button>
                <Button variant="outline" size="sm" className="h-8 justify-start text-xs" onClick={onCreateProject} disabled={!selected?.client_id}><ArrowUpRight className="mr-1.5 size-3.5" /> Create Project</Button>
                <Button variant="outline" size="sm" className="h-8 justify-start text-xs" onClick={onSaveFact} disabled={!selected?.client_id}><Bookmark className="mr-1.5 size-3.5" /> Save Fact to Client</Button>
                <Button variant="outline" size="sm" className="h-8 justify-start text-xs" onClick={onAddContact} disabled={!selected?.client_id}><UserPlus className="mr-1.5 size-3.5" /> Add Contact</Button>
                <Button variant="outline" size="sm" className="h-8 justify-start text-xs" onClick={onSetFollowUp}><CalendarClock className="mr-1.5 size-3.5" /> Set Follow-up</Button>
                <Button variant="outline" size="sm" className="h-8 justify-start text-xs" onClick={onMarkResolved}><CheckCircle2 className="mr-1.5 size-3.5" /> Mark Resolved</Button>
                <Button variant="outline" size="sm" className="h-8 justify-start text-xs" onClick={onCopySourceLink}><Copy className="mr-1.5 size-3.5" /> Copy Source Link</Button>
              </div>
            </div>

            {/* Linked Work */}
            {clientInsight && clientInsight.active_projects.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50 mb-2">Active Projects</p>
                <div className="space-y-1">
                  {clientInsight.active_projects.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 rounded border p-2 text-xs">
                      <CircleDot className="size-3 text-emerald-500 shrink-0" />
                      <span className="truncate font-medium">{p.name}</span>
                      <Badge variant="outline" className="text-[9px] ml-auto">{p.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {clientInsight && clientInsight.open_tasks.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50 mb-2">Open Tasks ({clientInsight.open_tasks.length})</p>
                <div className="space-y-1">
                  {clientInsight.open_tasks.slice(0, 5).map((t) => (
                    <div key={t.id} className="flex items-center gap-2 rounded border p-2 text-xs">
                      <span className={cn("size-1.5 rounded-full shrink-0",
                        t.priority === "urgent" ? "bg-red-500" : t.priority === "high" ? "bg-amber-500" : "bg-gray-400"
                      )} />
                      <span className="truncate">{t.title}</span>
                      <Badge variant="outline" className="text-[9px] ml-auto">{t.column}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Client Intelligence */}
            {clientInsight && clientInsight.facts.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50 mb-2">Client Intelligence</p>
                <div className="space-y-1">
                  {clientInsight.facts.slice(0, 6).map((f) => (
                    <div key={f.id} className="flex items-center justify-between gap-2 rounded border p-2 text-xs">
                      <span className="text-muted-foreground">{(f.key as string).replace(/_/g, " ")}</span>
                      <span className="font-medium truncate max-w-[120px]">{f.value as string}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      ) : (
        <div className="flex h-full items-center justify-center p-4 text-center text-muted-foreground">
          <div>
            <Building2 className="mx-auto mb-2 size-8" />
            <p className="text-xs text-pretty">Select a thread to see client context, insights, linked work, and actions.</p>
          </div>
        </div>
      )}
    </div>
  );
}
