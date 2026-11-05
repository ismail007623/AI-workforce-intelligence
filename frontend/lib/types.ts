export type CheckInStatus = "present" | "late" | "absent";
export type CheckOutStatus = "on_time" | "early_left";
export type UserRole = "employee" | "hr" | "admin";
export type AuthRole = UserRole;
export type InviteRole = "hr" | "admin";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  org_id: number | null;
  organization_name: string | null;
  employee_id: string | null;
  department: string | null;
  is_active: boolean;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthData {
  user: AuthUser;
  tokens: TokenPair;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
  employee_id?: string;
}

export interface CompanySignupPayload {
  company_name: string;
  admin_name: string;
  email: string;
  password: string;
  timezone?: string;
  work_start?: string;
  work_end?: string;
  grace_minutes?: number;
}

export interface InvitationCreatePayload {
  email: string;
  role: InviteRole;
}

export interface InvitationAcceptPayload {
  token: string;
  name: string;
  password: string;
}

export interface Invitation {
  id: number;
  org_id: number;
  email: string;
  role: InviteRole;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface InvitationCreated {
  invitation: Invitation;
  token: string;
}

export interface RefreshPayload {
  refresh_token: string;
}

export interface AuthEnvelope<T> {
  data: T;
  message: string;
  status: "success" | "error";
}

export interface Employee {
  employee_id: string;
  name: string;
  email: string;
  department: string;
}

export interface LateStats {
  late_arrivals_this_month: number;
  average_delay_minutes: number;
  risk_level: string;
}

export interface CheckInResponse {
  employee_id: string;
  employee_name: string;
  date: string;
  check_in_time: string;
  check_in_status: CheckInStatus;
  late_minutes: number;
  notification_sent: boolean;
  requires_late_reason?: boolean;
  late_stats: LateStats | null;
}

export interface CheckOutResponse {
  employee_id: string;
  employee_name: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string;
  check_in_status: CheckInStatus | null;
  check_out_status: CheckOutStatus;
  early_leave_minutes: number;
}

export interface AttendanceRecord {
  employee_id: string;
  employee_name: string;
  department: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  check_in_status: CheckInStatus | null;
  check_out_status: CheckOutStatus | null;
  late_minutes: number;
  early_leave_minutes: number;
}

export interface AbsentEmployee {
  employee_id: string;
  employee_name: string;
  department: string;
}

export interface EmployeeSummary {
  employee_id: string;
  employee_name: string;
  department: string;
  today_status: "present" | "late" | "absent" | "not_checked_in";
  late_arrivals_this_month: number;
  average_delay_minutes: number;
  risk_level: string;
  attendance_rate_this_month: number;
  late_reason_pending?: boolean;
  reliability_score?: number | null;
}

export interface LateReasonEvaluation {
  category: string;
  validity_score: number;
  risk_score: number;
  decision: string;
  explanation: string;
  pattern_detected?: boolean;
  pattern_summary?: string | null;
  reliability_score?: number | null;
}

export interface LateReasonSubmitResponse {
  employee_id: string;
  attendance_id: number;
  reason: string;
  status: string;
  evaluation?: LateReasonEvaluation | null;
}

export interface LateIntelligenceRecord {
  employee_id: string;
  employee_name: string;
  department: string;
  check_in_time: string | null;
  late_minutes: number;
  reason: string | null;
  ai_category: string | null;
  ai_decision: string | null;
  validity_score: number | null;
  risk_score: number | null;
  reliability_score: number | null;
  pattern_detected: boolean;
  pattern_summary: string | null;
  reason_status: string | null;
}

export interface DashboardSummary {
  total_employees: number;
  present: number;
  late: number;
  absent: number;
  early_left: number;
  attendance_rate: number;
}

export interface DepartmentStats {
  department: string;
  total_employees: number;
  present: number;
  late: number;
  absent: number;
  early_left: number;
  lateness_rate: number;
  attendance_rate?: number;
  valid_reasons?: number;
  weak_reasons?: number;
  invalid_reasons?: number;
  avg_reliability?: number;
  department_risk_level?: string;
}

export interface DepartmentEmployeeRow {
  employee_id: string;
  employee_name: string;
  late_count_month: number;
  absent_count_month: number;
  on_time_count_month: number;
  concern_score?: number | null;
  avg_validity?: number | null;
  weak_reason_count: number;
  invalid_reason_count: number;
  reliability_score?: number | null;
  evaluation_status: string;
}

export interface DailyTrendPoint {
  date: string;
  day: string;
  present: number;
  late: number;
  absent: number;
}

export interface InsightsResponse {
  question: string;
  summary: string;
  key_findings: string[];
  recommendations: string[];
  raw_answer: string;
}

export interface PolicyUploadResponse {
  filename: string;
  chunk_count: number;
  page_count: number;
  file_size_bytes: number;
  uploaded_at: string;
  last_updated_at: string;
  message: string;
}

export interface PolicyStatusResponse {
  has_policy: boolean;
  chunk_count: number;
  namespace: string;
  index_name: string;
  filename?: string;
  page_count?: number;
  file_size_bytes?: number;
  uploaded_by?: string;
  uploaded_at?: string;
  last_updated_at?: string;
  status?: string;
}

export interface PolicyHistoryItem {
  id: number;
  filename: string;
  uploaded_by: string;
  uploaded_at: string;
  status: string;
  page_count: number;
  file_size_bytes: number;
}

export interface PolicyCitation {
  text: string;
  chunk_index: number | null;
  source_filename: string;
  score: number;
}

export interface PolicyChatApiResponse {
  succeed: boolean;
  data: {
    response: string;
    citations: PolicyCitation[];
  } | null;
  message: string;
}
