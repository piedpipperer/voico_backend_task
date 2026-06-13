import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { X, Phone, User, Clock, Calendar, FileText, Sparkles, Pencil, Loader2 } from "lucide-react";
import { callsApi } from "@/services/api";
import { StatusBadge } from "./CallsTable";
import type { Call, PaginatedCallsResponse } from "@/types/calls";

interface CallDetailDrawerProps {
  call: Call | null;
  onClose: () => void;
  onCallUpdated: (call: Call | null) => void;
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <div className="text-sm font-medium text-foreground break-words">{value}</div>
      </div>
    </div>
  );
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "Not available";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m} min ${s} sec` : `${s} sec`;
}

export function CallDetailDrawer({ call, onClose, onCallUpdated }: CallDetailDrawerProps) {
  const queryClient = useQueryClient();
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [notesError, setNotesError] = useState<string | null>(null);

  useEffect(() => {
    setIsEditingNotes(false);
    setNotesError(null);
    setNotesDraft(call?.notes ?? "");
  }, [call]);

  const updateNotesMutation = useMutation({
    mutationFn: async (notes: string) =>
      callsApi.updateNotes(call!.id, { notes: notes.trim() === "" ? null : notes }),
    onMutate: async (notes) => {
      if (!call) return { previousQueries: [], previousCall: null };

      setNotesError(null);
      const nextNotes = notes.trim() === "" ? null : notes;
      const optimisticCall: Call = {
        ...call,
        notes: nextNotes,
      };

      const previousQueries = queryClient.getQueriesData<PaginatedCallsResponse>({
        queryKey: ["calls"],
      });

      queryClient.setQueriesData<PaginatedCallsResponse>({ queryKey: ["calls"] }, (current) => {
        if (!current) return current;

        return {
          ...current,
          data: current.data.map((existingCall) =>
            existingCall.id === call.id ? { ...existingCall, notes: nextNotes } : existingCall
          ),
        };
      });

      onCallUpdated(optimisticCall);

      return {
        previousQueries,
        previousCall: call,
      };
    },
    onError: (_error, _notes, context) => {
      setNotesError("Could not save notes. Try again.");

      for (const [queryKey, previousData] of context?.previousQueries ?? []) {
        queryClient.setQueryData(queryKey, previousData);
      }

      if (context?.previousCall) {
        onCallUpdated(context.previousCall);
        setNotesDraft(context.previousCall.notes ?? "");
      }
    },
    onSuccess: (updatedCall) => {
      queryClient.setQueriesData<PaginatedCallsResponse>({ queryKey: ["calls"] }, (current) => {
        if (!current) return current;

        return {
          ...current,
          data: current.data.map((existingCall) =>
            existingCall.id === updatedCall.id ? updatedCall : existingCall
          ),
        };
      });

      onCallUpdated(updatedCall);
      setNotesDraft(updatedCall.notes ?? "");
      setIsEditingNotes(false);
    },
  });

  if (!call) return null;

  const notesValue = call.notes?.trim() ? call.notes : "Click to add notes";

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-foreground">Call Details</h2>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">#{call.id.slice(0, 8)}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Status banner */}
        <div className="px-6 py-3 bg-muted/50 border-b border-border flex items-center justify-between">
          <StatusBadge status={call.status} />
          {call.label && (
            <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border border-border bg-white text-foreground">
              {call.label}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <DetailRow
            icon={<Phone className="h-4 w-4" />}
            label="Phone Number"
            value={<span className="font-mono">{call.phone_number}</span>}
          />
          <DetailRow
            icon={<User className="h-4 w-4" />}
            label="Caller Name"
            value={call.caller_name ?? "Unknown"}
          />
          <DetailRow
            icon={<Clock className="h-4 w-4" />}
            label="Duration"
            value={formatDuration(call.duration_seconds)}
          />
          <DetailRow
            icon={<Calendar className="h-4 w-4" />}
            label="Started At"
            value={format(new Date(call.started_at), "PPpp")}
          />
          {call.ended_at && (
            <DetailRow
              icon={<Calendar className="h-4 w-4" />}
              label="Ended At"
              value={format(new Date(call.ended_at), "PPpp")}
            />
          )}

          <div className="flex items-start gap-3 py-3 border-b border-border">
            <div className="mt-0.5 text-muted-foreground">
              <FileText className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">Notes</p>
                {!isEditingNotes && (
                  <button
                    type="button"
                    onClick={() => {
                      setNotesDraft(call.notes ?? "");
                      setNotesError(null);
                      setIsEditingNotes(true);
                    }}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                )}
              </div>

              {isEditingNotes ? (
                <div className="space-y-3">
                  <textarea
                    value={notesDraft}
                    onChange={(event) => setNotesDraft(event.target.value)}
                    rows={5}
                    autoFocus
                    className="w-full resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-yellow-300 focus:ring-2 focus:ring-yellow-100"
                    placeholder="Add notes about this call"
                  />
                  <div className="flex items-center justify-between gap-3">
                    {notesError ? (
                      <p className="text-xs text-red-600">{notesError}</p>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Free-text notes saved to the call record.
                      </span>
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setNotesDraft(call.notes ?? "");
                          setNotesError(null);
                          setIsEditingNotes(false);
                        }}
                        className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        disabled={updateNotesMutation.isPending}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => updateNotesMutation.mutate(notesDraft)}
                        className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold text-[#4a3800] transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                        style={{ backgroundColor: "#FDDF5C" }}
                        disabled={updateNotesMutation.isPending}
                      >
                        {updateNotesMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setNotesDraft(call.notes ?? "");
                    setNotesError(null);
                    setIsEditingNotes(true);
                  }}
                  className={`block w-full rounded-lg border border-dashed px-3 py-2 text-left text-sm transition-colors hover:border-border hover:bg-muted/60 ${
                    call.notes?.trim() ? "border-transparent bg-muted/40 text-foreground" : "border-border text-muted-foreground"
                  }`}
                >
                  {notesValue}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* AI Summary */}
        {call.summary && (
          <div className="px-6 py-4 border-t border-border">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4" style={{ color: "#FDDF5C" }} />
              <h3 className="text-sm font-semibold text-foreground">AI Summary</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{call.summary}</p>
          </div>
        )}

        {/* Transcript */}
        {call.raw_transcript && (
          <div className="px-6 py-4 border-t border-border">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Transcript</h3>
            </div>
            <div className="bg-muted rounded-lg p-3 max-h-48 overflow-y-auto">
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
                {call.raw_transcript}
              </pre>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground">
            Created {format(new Date(call.created_at), "PPpp")}
          </p>
        </div>
      </aside>
    </>
  );
}
