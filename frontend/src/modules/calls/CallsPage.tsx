import { useDeferredValue, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Phone, RefreshCw, Search, X } from "lucide-react";
import { callsApi } from "@/services/api";
import type { Call, CallLabel, CallSortBy, CallStatus, SortOrder } from "@/types/calls";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CallsTable } from "./CallsTable";
import { CallDetailDrawer } from "./CallDetailDrawer";

type TabValue = "all" | CallStatus;

const TABS: { label: string; value: TabValue }[] = [
  { label: "All", value: "all" },
  { label: "In Progress", value: "in_progress" },
  { label: "Success", value: "success" },
  { label: "Failed", value: "failed" },
];

const PAGE_SIZE = 20;
const LABEL_OPTIONS: CallLabel[] = [
  "Sales inquiry",
  "Support",
  "Complaint",
  "Appointment",
  "Follow-up",
  "Other",
];
const STATUS_LABELS: Record<CallStatus, string> = {
  in_progress: "In Progress",
  success: "Success",
  failed: "Failed",
};
const SORT_LABELS: Record<CallSortBy, string> = {
  phone_number: "Phone",
  caller_name: "Caller",
  status: "Status",
  label: "Label",
  duration_seconds: "Duration",
  started_at: "Started At",
  ended_at: "Ended At",
  created_at: "Created At",
  updated_at: "Updated At",
};

export function CallsPage() {
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [page, setPage] = useState(1);
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [callerNameFilter, setCallerNameFilter] = useState("");
  const [phoneNumberFilter, setPhoneNumberFilter] = useState("");
  const [labelFilter, setLabelFilter] = useState<CallLabel | "">("");
  const [minDurationFilter, setMinDurationFilter] = useState("");
  const [maxDurationFilter, setMaxDurationFilter] = useState("");
  const [sortBy, setSortBy] = useState<CallSortBy | undefined>();
  const [sortOrder, setSortOrder] = useState<SortOrder | undefined>();

  const statusFilter = activeTab === "all" ? undefined : activeTab;
  const deferredCallerNameFilter = useDeferredValue(callerNameFilter.trim());
  const deferredPhoneNumberFilter = useDeferredValue(phoneNumberFilter.trim());
  const minDurationSeconds =
    minDurationFilter.trim() === "" ? undefined : Number(minDurationFilter);
  const maxDurationSeconds =
    maxDurationFilter.trim() === "" ? undefined : Number(maxDurationFilter);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: [
      "calls",
      statusFilter,
      deferredCallerNameFilter,
      deferredPhoneNumberFilter,
      labelFilter || undefined,
      minDurationSeconds,
      maxDurationSeconds,
      sortBy,
      sortOrder,
      page,
      PAGE_SIZE,
    ],
    queryFn: () =>
      callsApi.list({
        status: statusFilter,
        caller_name: deferredCallerNameFilter || undefined,
        phone_number: deferredPhoneNumberFilter || undefined,
        label: labelFilter || undefined,
        min_duration_seconds: Number.isNaN(minDurationSeconds) ? undefined : minDurationSeconds,
        max_duration_seconds: Number.isNaN(maxDurationSeconds) ? undefined : maxDurationSeconds,
        sort_by: sortBy,
        sort_order: sortBy ? sortOrder : undefined,
        page,
        page_size: PAGE_SIZE,
      }),
    refetchInterval: 5000,
  });

  useEffect(() => {
    setPage(1);
  }, [
    activeTab,
    deferredCallerNameFilter,
    deferredPhoneNumberFilter,
    labelFilter,
    minDurationFilter,
    maxDurationFilter,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    if (!selectedCall || !data) return;

    const currentCall = data.data.find((call) => call.id === selectedCall.id);
    if (!currentCall) return;

    if (currentCall.updated_at !== selectedCall.updated_at || currentCall.notes !== selectedCall.notes) {
      setSelectedCall(currentCall);
    }
  }, [data, selectedCall]);

  function handleTabChange(tab: TabValue) {
    setActiveTab(tab);
    setPage(1);
  }

  function handleSortChange(column: CallSortBy) {
    if (sortBy !== column) {
      setSortBy(column);
      setSortOrder("asc");
      return;
    }

    if (sortOrder === "asc") {
      setSortOrder("desc");
      return;
    }

    setSortBy(undefined);
    setSortOrder(undefined);
  }

  function clearAllFilters() {
    setActiveTab("all");
    setCallerNameFilter("");
    setPhoneNumberFilter("");
    setLabelFilter("");
    setMinDurationFilter("");
    setMaxDurationFilter("");
    setSortBy(undefined);
    setSortOrder(undefined);
  }

  const activeFilters = [
    ...(statusFilter
      ? [
          {
            key: "status",
            label: `Status: ${STATUS_LABELS[statusFilter]}`,
            onRemove: () => setActiveTab("all"),
          },
        ]
      : []),
    ...(deferredCallerNameFilter
      ? [
          {
            key: "caller_name",
            label: `Caller: ${deferredCallerNameFilter}`,
            onRemove: () => setCallerNameFilter(""),
          },
        ]
      : []),
    ...(deferredPhoneNumberFilter
      ? [
          {
            key: "phone_number",
            label: `Phone: ${deferredPhoneNumberFilter}`,
            onRemove: () => setPhoneNumberFilter(""),
          },
        ]
      : []),
    ...(labelFilter
      ? [
          {
            key: "label",
            label: `Label: ${labelFilter}`,
            onRemove: () => setLabelFilter(""),
          },
        ]
      : []),
    ...(minDurationFilter
      ? [
          {
            key: "min_duration",
            label: `Min Duration: ${minDurationFilter}s`,
            onRemove: () => setMinDurationFilter(""),
          },
        ]
      : []),
    ...(maxDurationFilter
      ? [
          {
            key: "max_duration",
            label: `Max Duration: ${maxDurationFilter}s`,
            onRemove: () => setMaxDurationFilter(""),
          },
        ]
      : []),
    ...(sortBy && sortOrder
      ? [
          {
            key: "sort",
            label: `Sort: ${SORT_LABELS[sortBy]} ${sortOrder === "asc" ? "↑" : "↓"}`,
            onRemove: () => {
              setSortBy(undefined);
              setSortOrder(undefined);
            },
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b-2 shadow-sm" style={{ borderBottomColor: "#FDDF5C" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-base shadow"
                style={{ backgroundColor: "#FDDF5C" }}
              >
                <span style={{ color: "#7A6000" }}>V</span>
              </div>
              <span className="font-bold text-xl tracking-tight text-gray-900">VOICO</span>
              <span className="hidden sm:block text-sm text-gray-400 font-normal pl-3 border-l border-gray-200">
                Calls Dashboard
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${isFetching ? "animate-pulse" : ""}`}
                  style={{ backgroundColor: isFetching ? "#FDDF5C" : "#86efac" }}
                />
                {isFetching ? "Syncing..." : "Live"}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-gray-700"
                onClick={() => refetch()}
              >
                <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats row */}
        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Calls", value: data.total },
              { label: "In Progress", value: data.counts?.in_progress ?? "—" },
              { label: "Successful", value: data.counts?.success ?? "—" },
              { label: "Failed", value: data.counts?.failed ?? "—" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-border bg-white p-4 shadow-sm">
                <p className="text-xs text-muted-foreground mb-1 font-medium">{stat.label}</p>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              </div>
            ))}
          </div>
        )}

        <Card className="bg-white">
          <div className="border-b border-border px-6 pt-5 pb-5">
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
                  {TABS.map((tab) => (
                    <button
                      key={tab.value}
                      onClick={() => handleTabChange(tab.value)}
                      className="px-3 py-1.5 rounded-md text-sm font-medium transition-all"
                      style={
                        activeTab === tab.value
                          ? {
                              backgroundColor: "#FDDF5C",
                              color: "#4a3800",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.10)",
                            }
                          : { color: "var(--muted-foreground)" }
                      }
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {activeFilters.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Caller Name
                  </span>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={callerNameFilter}
                      onChange={(event) => setCallerNameFilter(event.target.value)}
                      placeholder="Partial caller match"
                      className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-yellow-300 focus:ring-2 focus:ring-yellow-100"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Phone Number
                  </span>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={phoneNumberFilter}
                      onChange={(event) => setPhoneNumberFilter(event.target.value)}
                      placeholder="Partial phone match"
                      className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-yellow-300 focus:ring-2 focus:ring-yellow-100"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Label
                  </span>
                  <select
                    value={labelFilter}
                    onChange={(event) => setLabelFilter(event.target.value as CallLabel | "")}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-yellow-300 focus:ring-2 focus:ring-yellow-100"
                  >
                    <option value="">Any label</option>
                    {LABEL_OPTIONS.map((label) => (
                      <option key={label} value={label}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Min Duration
                  </span>
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={minDurationFilter}
                    onChange={(event) => setMinDurationFilter(event.target.value)}
                    placeholder="Seconds"
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-yellow-300 focus:ring-2 focus:ring-yellow-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Max Duration
                  </span>
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={maxDurationFilter}
                    onChange={(event) => setMaxDurationFilter(event.target.value)}
                    placeholder="Seconds"
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-yellow-300 focus:ring-2 focus:ring-yellow-100"
                  />
                </label>
              </div>

              {activeFilters.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {activeFilters.map((filter) => (
                    <button
                      key={filter.key}
                      type="button"
                      onClick={filter.onRemove}
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted/70"
                    >
                      <span>{filter.label}</span>
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <CardContent className="p-0">
            {isError ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
                  <Phone className="h-5 w-5 text-red-500" />
                </div>
                <p className="text-sm font-medium text-foreground">Failed to load calls</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Make sure the backend is running at localhost:8000
                </p>
                <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-3">
                  Retry
                </Button>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-20">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <CallsTable
                calls={data?.data ?? []}
                onRowClick={setSelectedCall}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={handleSortChange}
              />
            )}
          </CardContent>

          {/* Pagination */}
          {data && data.total_pages > 1 && (
            <div
              className="flex items-center justify-between px-6 py-4 border-t border-border"
            >
              <p className="text-sm text-muted-foreground">
                Page {data.page} of {data.total_pages}{" "}
                <span className="opacity-60">({data.total} total)</span>
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                  disabled={page === data.total_pages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </main>

      <CallDetailDrawer
        call={selectedCall}
        onClose={() => setSelectedCall(null)}
        onCallUpdated={setSelectedCall}
      />
    </div>
  );
}
