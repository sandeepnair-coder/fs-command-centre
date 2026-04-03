"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Plug2,
  Bot,
  ShieldCheck,
  Eye,
  Lightbulb,
  Hand,
  Power,
  Activity,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getConnectorConfigs, updateConnectorConfig, getAuditLog } from "@/app/(app)/comms/actions";
import { testOpenClawConnection } from "@/app/(app)/comms/openclaw-actions";
import { CONNECTOR_MODES, CONNECTOR_SCOPES } from "@/lib/types/comms";
import type { ConnectorConfig, ConnectorMode, AuditLogEvent } from "@/lib/types/comms";
import { toast } from "sonner";
import { SUCCESS } from "@/lib/copy";
import { format } from "date-fns";

const MODE_ICONS: Record<string, React.ElementType> = {
  disabled: Power,
  observe_only: Eye,
  suggest_only: Lightbulb,
  human_triggered_actions: Hand,
};

export function ConnectorsShell() {
  const [configs, setConfigs] = useState<ConnectorConfig[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAudit, setShowAudit] = useState(false);
  const [healthStatus, setHealthStatus] = useState<{ connected: boolean; status: string; version?: string } | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    Promise.all([
      getConnectorConfigs().catch(() => []),
      getAuditLog({ entity_type: "connector_config", limit: 20 }).catch(() => []),
      testOpenClawConnection().catch(() => ({ connected: false, status: "unreachable" })),
    ]).then(([c, a, h]) => {
      setConfigs(c as ConnectorConfig[]);
      setAuditLog(a);
      setHealthStatus(h);
      setLoading(false);
    });
  }, []);

  async function handleTestConnection() {
    setTesting(true);
    try {
      const result = await testOpenClawConnection();
      setHealthStatus(result);
      if (result.connected) {
        toast.success("Open Claw is connected and responding.");
      } else {
        toast.error(`Open Claw not reachable: ${result.status}`);
      }
    } catch {
      setHealthStatus({ connected: false, status: "unreachable" });
      toast.error("Could not reach Open Claw.");
    } finally {
      setTesting(false);
    }
  }

  async function handleModeChange(config: ConnectorConfig, mode: ConnectorMode) {
    const enabled = mode !== "disabled";
    try {
      const updated = await updateConnectorConfig(config.id, { mode, enabled });
      setConfigs((prev) => prev.map((c) => (c.id === config.id ? (updated as ConnectorConfig) : c)));
      toast.success(SUCCESS.connectorUpdated);
    } catch {
      toast.error("Couldn't update connector. Try again?");
    }
  }

  async function handleScopeToggle(config: ConnectorConfig, scope: string) {
    const current = config.scopes || [];
    const next = current.includes(scope)
      ? current.filter((s) => s !== scope)
      : [...current, scope];
    try {
      const updated = await updateConnectorConfig(config.id, { scopes: next });
      setConfigs((prev) => prev.map((c) => (c.id === config.id ? (updated as ConnectorConfig) : c)));
    } catch {
      toast.error("Scope change didn't save.");
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-64 rounded-xl border bg-muted/30 animate-pulse" />
      </div>
    );
  }

  const openClaw = configs.find((c) => c.connector_key === "open_claw");

  return (
    <div className="space-y-6">
      {/* Connector Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Open Claw Card */}
        {openClaw ? (
          <Card className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/40">
                    <Bot className="size-5 text-violet-600 dark:text-violet-300" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">Open Claw</CardTitle>
                    <CardDescription className="text-[11px]">AI Intelligence Agent</CardDescription>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px]",
                    healthStatus?.connected
                      ? "border-emerald-300 text-emerald-600"
                      : openClaw.enabled
                        ? "border-amber-300 text-amber-600"
                        : "border-muted text-muted-foreground"
                  )}
                >
                  {healthStatus?.connected
                    ? "Connected"
                    : openClaw.enabled
                      ? "Enabled (offline)"
                      : "Not configured"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Connection Status */}
              <div className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium text-foreground/60">Connection Status</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleTestConnection}
                    disabled={testing}
                  >
                    {testing ? "Testing..." : "Test Connection"}
                  </Button>
                </div>
                {healthStatus && (
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "size-2 rounded-full",
                      healthStatus.connected ? "bg-emerald-500" : "bg-red-500"
                    )} />
                    <span className="text-xs">
                      {healthStatus.connected
                        ? `Online${healthStatus.version ? ` (v${healthStatus.version})` : ""}`
                        : healthStatus.status}
                    </span>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground tabular-nums">
                  Endpoint: {process.env.NEXT_PUBLIC_OPENCLAW_API_URL || "configured server-side"}
                </p>
              </div>

              {/* Mode */}
              <div>
                <p className="text-[11px] font-medium text-foreground/60 mb-1.5">Operating Mode</p>
                <Select
                  value={openClaw.mode}
                  onValueChange={(v) => handleModeChange(openClaw, v as ConnectorMode)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4}>
                    {CONNECTOR_MODES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {CONNECTOR_MODES.find((m) => m.value === openClaw.mode)?.description}
                </p>
              </div>

              {/* Scopes */}
              <div>
                <p className="text-[11px] font-medium text-foreground/60 mb-2">Permissions</p>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-foreground/40 mb-1">Read</p>
                    <div className="space-y-1">
                      {CONNECTOR_SCOPES.read.map((scope) => (
                        <label key={scope} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-muted/50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(openClaw.scopes || []).includes(scope)}
                            onChange={() => handleScopeToggle(openClaw, scope)}
                            className="size-3.5 rounded border-border accent-primary"
                          />
                          <span className="text-xs">{scope.replace("read:", "").replace(/_/g, " ")}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-foreground/40 mb-1">Write</p>
                    <div className="space-y-1">
                      {CONNECTOR_SCOPES.write.map((scope) => (
                        <label key={scope} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-muted/50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(openClaw.scopes || []).includes(scope)}
                            onChange={() => handleScopeToggle(openClaw, scope)}
                            className="size-3.5 rounded border-border accent-primary"
                          />
                          <span className="text-xs">{scope.replace("write:", "").replace(/_/g, " ")}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="text-[10px] text-muted-foreground">
              <ShieldCheck className="mr-1 size-3" />
              Human-in-control: Open Claw cannot create tasks or overwrite data without your action.
            </CardFooter>
          </Card>
        ) : (
          <Card className="opacity-50">
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                  <Bot className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-sm">Open Claw</CardTitle>
                  <CardDescription className="text-[11px]">Not available — run the migration first.</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Future connector placeholder */}
        <Card className="border-dashed opacity-60">
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                <Plug2 className="size-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-sm">More Connectors</CardTitle>
                <CardDescription className="text-[11px]">
                  Additional integrations coming soon. The connector framework is ready.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Audit Log */}
      <div>
        <button
          onClick={() => setShowAudit((p) => !p)}
          className="flex items-center gap-1.5 text-sm font-medium text-foreground/70 hover:text-foreground transition-colors"
        >
          <Activity className="size-4" />
          Connector Audit Log
          {showAudit ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </button>
        {showAudit && (
          <div className="mt-3 space-y-1.5">
            {auditLog.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 italic">No connector activity recorded yet.</p>
            ) : (
              auditLog.map((e) => (
                <div key={e.id} className="flex items-start gap-2 rounded-lg border bg-card p-2.5">
                  <Activity className="size-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium">{e.event_type.replace(/_/g, " ")}</p>
                    <p className="text-[10px] text-muted-foreground tabular-nums">
                      {format(new Date(e.created_at), "d MMM yyyy, h:mm a")} · {e.actor_type}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
