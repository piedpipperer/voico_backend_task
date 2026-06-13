export type CallStatus = "in_progress" | "success" | "failed";
export type CallLabel =
  | "Sales inquiry"
  | "Support"
  | "Complaint"
  | "Appointment"
  | "Follow-up"
  | "Other";
export type CallSortBy =
  | "phone_number"
  | "caller_name"
  | "status"
  | "label"
  | "duration_seconds"
  | "started_at"
  | "ended_at"
  | "created_at"
  | "updated_at";
export type SortOrder = "asc" | "desc";

export interface Call {
  id: string;
  phone_number: string;
  caller_name: string | null;
  duration_seconds: number | null;
  status: CallStatus;
  summary: string | null;
  notes: string | null;
  label: CallLabel | null;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
  raw_transcript: string | null;
}

export interface UpdateCallNotesPayload {
  notes: string | null;
}

export interface CallCounts {
  in_progress: number;
  success: number;
  failed: number;
}

export interface PaginatedCallsResponse {
  data: Call[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  counts: CallCounts;
}

export interface CallsQueryParams {
  status?: CallStatus;
  caller_name?: string;
  phone_number?: string;
  label?: CallLabel;
  min_duration_seconds?: number;
  max_duration_seconds?: number;
  sort_by?: CallSortBy;
  sort_order?: SortOrder;
  page?: number;
  page_size?: number;
}
