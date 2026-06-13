import { format } from "date-fns";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Phone,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Call, CallSortBy, CallStatus, SortOrder } from "@/types/calls";

interface StatusBadgeProps {
  status: CallStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  if (status === "in_progress") {
    return (
      <Badge variant="in_progress">
        <Loader2 className="h-3 w-3 animate-spin" />
        In Progress
      </Badge>
    );
  }
  if (status === "success") {
    return (
      <Badge variant="success">
        <CheckCircle2 className="h-3 w-3" />
        Success
      </Badge>
    );
  }
  return (
    <Badge variant="failed">
      <XCircle className="h-3 w-3" />
      Failed
    </Badge>
  );
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

interface CallsTableProps {
  calls: Call[];
  onRowClick: (call: Call) => void;
  sortBy?: CallSortBy;
  sortOrder?: SortOrder;
  onSortChange: (column: CallSortBy) => void;
}

interface SortableHeaderProps {
  column: CallSortBy;
  label: string;
  sortBy?: CallSortBy;
  sortOrder?: SortOrder;
  onSortChange: (column: CallSortBy) => void;
}

function SortableHeader({
  column,
  label,
  sortBy,
  sortOrder,
  onSortChange,
}: SortableHeaderProps) {
  const isActive = sortBy === column;

  return (
    <th className="text-left py-3 px-4">
      <button
        type="button"
        onClick={() => onSortChange(column)}
        className={`inline-flex items-center gap-1 text-xs font-medium transition-colors ${
          isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <span>{label}</span>
        {isActive ? (
          sortOrder === "desc" ? (
            <ArrowDown className="h-3.5 w-3.5" />
          ) : (
            <ArrowUp className="h-3.5 w-3.5" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-60" />
        )}
      </button>
    </th>
  );
}

export function CallsTable({
  calls,
  onRowClick,
  sortBy,
  sortOrder,
  onSortChange,
}: CallsTableProps) {
  if (calls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Phone className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">No calls found</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          No calls match your current filters. Try adjusting them or run the seed script to
          generate test data.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <SortableHeader
              column="phone_number"
              label="Phone"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={onSortChange}
            />
            <SortableHeader
              column="caller_name"
              label="Caller"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={onSortChange}
            />
            <SortableHeader
              column="status"
              label="Status"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={onSortChange}
            />
            <SortableHeader
              column="label"
              label="Label"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={onSortChange}
            />
            <SortableHeader
              column="duration_seconds"
              label="Duration"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={onSortChange}
            />
            <SortableHeader
              column="started_at"
              label="Started At"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={onSortChange}
            />
            <th className="py-3 px-4" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {calls.map((call) => (
            <tr
              key={call.id}
              onClick={() => onRowClick(call)}
              className="group hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <td className="py-3 px-4 font-mono text-xs text-foreground">{call.phone_number}</td>
              <td className="py-3 px-4 text-foreground">{call.caller_name ?? "—"}</td>
              <td className="py-3 px-4">
                <StatusBadge status={call.status} />
              </td>
              <td className="py-3 px-4">
                {call.label ? (
                  <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border border-border bg-muted text-foreground">
                    {call.label}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </td>
              <td className="py-3 px-4 tabular-nums text-muted-foreground">
                {formatDuration(call.duration_seconds)}
              </td>
              <td className="py-3 px-4 tabular-nums text-muted-foreground">
                {format(new Date(call.started_at), "MMM d, HH:mm:ss")}
              </td>
              <td className="py-3 px-4">
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
