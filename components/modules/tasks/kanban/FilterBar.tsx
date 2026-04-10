"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  X,
  LayoutGrid,
  List,
  CalendarDays,
  Users,
  Workflow,
} from "lucide-react";
import type { TaskFilters, ViewMode, Profile, ProjectColumn } from "@/lib/types/tasks";
import { DEFAULT_FILTERS, getActiveFilterCount } from "@/lib/tasks/filters";

type Client = { id: string; name: string };

export function FilterBar({
  filters,
  onFiltersChange,
  viewMode,
  onViewModeChange,
  profiles,
  clients,
  columns,
}: {
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  profiles: Profile[];
  clients: Client[];
  columns: ProjectColumn[];
}) {
  const [searchInput, setSearchInput] = useState(filters.search);
  const activeCount = getActiveFilterCount(filters);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        onFiltersChange({ ...filters, search: searchInput });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClearAll = useCallback(() => {
    setSearchInput("");
    onFiltersChange(DEFAULT_FILTERS);
  }, [onFiltersChange]);

  // Unique clients from the board
  const uniqueClients = clients.filter((c) =>
    columns.some((col) =>
      (col.tasks || []).some((t) => t.client_id === c.id)
    )
  );

  return (
    <div className="flex flex-col gap-2 pb-3 shrink-0">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search tasks..."
            className="h-8 pl-8 pr-8 text-sm"
          />
          {searchInput && (
            <button
              onClick={() => {
                setSearchInput("");
                onFiltersChange({ ...filters, search: "" });
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Priority */}
        <Select
          value={filters.priority}
          onValueChange={(v) =>
            onFiltersChange({ ...filters, priority: v as TaskFilters["priority"] })
          }
        >
          <SelectTrigger className="h-8 w-[120px] text-xs">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        {/* Assignee */}
        <Select
          value={filters.assignee}
          onValueChange={(v) => onFiltersChange({ ...filters, assignee: v })}
        >
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="Assignee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assignees</SelectItem>
            {profiles.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.full_name || "Unnamed"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Manager */}
        <Select
          value={filters.manager}
          onValueChange={(v) => onFiltersChange({ ...filters, manager: v })}
        >
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="Manager" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Managers</SelectItem>
            {profiles.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.full_name || "Unnamed"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Due Date */}
        <Select
          value={filters.dueDate}
          onValueChange={(v) =>
            onFiltersChange({ ...filters, dueDate: v as TaskFilters["dueDate"] })
          }
        >
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue placeholder="Due Date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Dates</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="this_week">This Week</SelectItem>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="no_date">No Date</SelectItem>
          </SelectContent>
        </Select>

        {/* Client */}
        {uniqueClients.length > 0 && (
          <Select
            value={filters.client}
            onValueChange={(v) => onFiltersChange({ ...filters, client: v })}
          >
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue placeholder="Client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {uniqueClients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Active filter count + clear */}
        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={handleClearAll}
          >
            <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-[10px]">
              {activeCount}
            </Badge>
            Clear All
          </Button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* View Toggle */}
        <div className="flex items-center border rounded-md overflow-hidden">
          <button
            onClick={() => onViewModeChange("kanban")}
            className={`h-8 w-8 flex items-center justify-center transition-colors ${
              viewMode === "kanban"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-muted-foreground"
            }`}
            aria-label="Kanban view"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onViewModeChange("list")}
            className={`h-8 w-8 flex items-center justify-center transition-colors ${
              viewMode === "list"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-muted-foreground"
            }`}
            aria-label="List view"
          >
            <List className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onViewModeChange("calendar")}
            className={`h-8 w-8 flex items-center justify-center transition-colors ${
              viewMode === "calendar"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-muted-foreground"
            }`}
            aria-label="Calendar view"
          >
            <CalendarDays className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onViewModeChange("client")}
            className={`h-8 w-8 flex items-center justify-center transition-colors ${
              viewMode === "client"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-muted-foreground"
            }`}
            aria-label="Client view"
          >
            <Users className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onViewModeChange("stream")}
            className={`h-8 w-8 flex items-center justify-center transition-colors ${
              viewMode === "stream"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-muted-foreground"
            }`}
            aria-label="Stream view"
          >
            <Workflow className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
