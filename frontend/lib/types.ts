export type CheckInStatus = "present" | "late" | "absent";
export type CheckOutStatus = "on_time" | "early_left";
export type UserRole = "employee" | "hr";

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
  message: string;
}

export interface PolicyStatusResponse {
  has_policy: boolean;
  chunk_count: number;
  namespace: string;
  index_name: string;
}
