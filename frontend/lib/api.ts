import type {
  AbsentEmployee,
  AttendanceRecord,
  CheckInResponse,
  CheckOutResponse,
  DailyTrendPoint,
  DashboardSummary,
  DepartmentStats,
  Employee,
  EmployeeSummary,
  InsightsResponse,
  PolicyStatusResponse,
  PolicyUploadResponse,
} from "./types";

const BASE = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1`;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function getHrRoleHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const role = localStorage.getItem("awi.role");
  return role === "hr" ? { "X-AWI-Role": "hr" } : {};
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...options?.headers },
    });
  } catch {
    throw new ApiError("Cannot reach the server. Is the API running?", 0);
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? body.message ?? detail;
    } catch {
      /* ignore */
    }
    throw new ApiError(typeof detail === "string" ? detail : JSON.stringify(detail), res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function uploadForm<T>(
  path: string,
  formData: FormData,
  onUploadProgress?: (percent: number) => void,
  extraHeaders?: Record<string, string>,
  onUploadComplete?: () => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE}${path}`);

    Object.entries({ ...getHrRoleHeader(), ...extraHeaders }).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

    if (onUploadProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onUploadProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
    }

    xhr.upload.onload = () => {
      onUploadComplete?.();
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as T);
        } catch {
          reject(new ApiError("Invalid response from server.", xhr.status));
        }
        return;
      }

      let detail = xhr.statusText;
      try {
        const body = JSON.parse(xhr.responseText);
        detail = body.detail ?? body.message ?? detail;
      } catch {
        /* ignore */
      }
      reject(new ApiError(typeof detail === "string" ? detail : JSON.stringify(detail), xhr.status));
    };

    xhr.onerror = () => reject(new ApiError("Cannot reach the server. Is the API running?", 0));
    xhr.send(formData);
  });
}

export const api = {
  // Employees
  getEmployees: () => request<Employee[]>("/employees"),

  // Attendance actions
  checkIn: (employee_id: string) =>
    request<CheckInResponse>("/attendance/check-in", {
      method: "POST",
      body: JSON.stringify({ employee_id }),
    }),
  checkOut: (employee_id: string) =>
    request<CheckOutResponse>("/attendance/check-out", {
      method: "POST",
      body: JSON.stringify({ employee_id }),
    }),

  // Employee-scoped (own data)
  getEmployeeHistory: (employee_id: string) =>
    request<AttendanceRecord[]>(`/attendance/employee/${employee_id}`),
  getEmployeeSummary: (employee_id: string) =>
    request<EmployeeSummary>(`/attendance/employee/${employee_id}/summary`),

  // HR-scoped
  getTodayAttendance: () => request<AttendanceRecord[]>("/attendance/today"),
  getTodayLate: () => request<AttendanceRecord[]>("/attendance/today?status=late"),
  getTodayAbsent: () => request<AbsentEmployee[]>("/attendance/today/absent"),
  getDashboardSummary: () => request<DashboardSummary>("/dashboard/summary"),
  getDepartmentStats: () => request<DepartmentStats[]>("/dashboard/departments"),
  getAttendanceTrend: (days = 7) =>
    request<DailyTrendPoint[]>(`/dashboard/trend?days=${days}`),

  // AI
  queryInsights: (question: string) =>
    request<InsightsResponse>("/insights/query", {
      method: "POST",
      body: JSON.stringify({ question }),
    }),

  // Policy (HR only)
  getPolicyStatus: () =>
    request<PolicyStatusResponse>("/policy/status", {
      headers: getHrRoleHeader(),
    }),

  uploadPolicyDocument: (
    file: File,
    onUploadProgress?: (percent: number) => void,
    onUploadComplete?: () => void,
  ) => {
    const formData = new FormData();
    formData.append("file", file);
    return uploadForm<PolicyUploadResponse>(
      "/policy/upload",
      formData,
      onUploadProgress,
      undefined,
      onUploadComplete,
    );
  },
};
