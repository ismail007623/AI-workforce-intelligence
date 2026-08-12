import type {
  AbsentEmployee,
  AttendanceRecord,
  CheckInResponse,
  CheckOutResponse,
  DailyTrendPoint,
  DashboardSummary,
  DepartmentStats,
  DepartmentEmployeeRow,
  Employee,
  EmployeeSummary,
  InsightsResponse,
  LateIntelligenceRecord,
  LateReasonSubmitResponse,
  PolicyChatApiResponse,
  PolicyHistoryItem,
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

function getHrHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const role = localStorage.getItem("awi.role");
  if (role !== "hr") return {};
  return { "X-AWI-Role": "hr", "X-AWI-User": "HR Admin" };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...getHrHeaders(), ...options?.headers },
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

export type UploadPolicyHandle = {
  promise: Promise<PolicyUploadResponse>;
  cancel: () => void;
};

function uploadForm(
  path: string,
  formData: FormData,
  onUploadProgress?: (percent: number) => void,
  onUploadComplete?: () => void,
): UploadPolicyHandle {
  const xhr = new XMLHttpRequest();

  const promise = new Promise<PolicyUploadResponse>((resolve, reject) => {
    xhr.open("POST", `${BASE}${path}`);

    Object.entries(getHrHeaders()).forEach(([key, value]) => {
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
          resolve(JSON.parse(xhr.responseText) as PolicyUploadResponse);
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
    xhr.onabort = () => reject(new ApiError("Upload cancelled.", 0));
    xhr.send(formData);
  });

  return {
    promise,
    cancel: () => xhr.abort(),
  };
}

export const api = {
  getEmployees: () => request<Employee[]>("/employees"),

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

  submitLateReason: (employee_id: string, reason: string) =>
    request<LateReasonSubmitResponse>("/attendance/late-reason", {
      method: "POST",
      body: JSON.stringify({ employee_id, reason }),
    }),

  getLateIntelligence: (sort_by = "late_minutes") =>
    request<LateIntelligenceRecord[]>(`/attendance/today/late-intelligence?sort_by=${sort_by}`),

  getEmployeeHistory: (employee_id: string) =>
    request<AttendanceRecord[]>(`/attendance/employee/${employee_id}`),
  getEmployeeSummary: (employee_id: string) =>
    request<EmployeeSummary>(`/attendance/employee/${employee_id}/summary`),

  getTodayAttendance: () => request<AttendanceRecord[]>("/attendance/today"),
  getTodayAbsent: () => request<AbsentEmployee[]>("/attendance/today/absent"),
  getAbsentees: (date?: string) =>
    request<AbsentEmployee[]>(date ? `/dashboard/absentees?date=${date}` : "/dashboard/absentees"),
  getDashboardSummary: () => request<DashboardSummary>("/dashboard/summary"),
  getDepartmentStats: (sort_by?: string) =>
    request<DepartmentStats[]>(
      sort_by ? `/dashboard/departments?sort_by=${sort_by}` : "/dashboard/departments",
    ),

  getDepartmentEmployees: (department: string, sort_by?: string) =>
    request<DepartmentEmployeeRow[]>(
      sort_by
        ? `/dashboard/departments/${encodeURIComponent(department)}/employees?sort_by=${sort_by}`
        : `/dashboard/departments/${encodeURIComponent(department)}/employees`,
    ),
  getAttendanceTrend: (days = 7) =>
    request<DailyTrendPoint[]>(`/dashboard/trend?days=${days}`),

  queryInsights: (question: string) =>
    request<InsightsResponse>("/insights/query", {
      method: "POST",
      body: JSON.stringify({ question }),
    }),

  getPolicyStatus: () => request<PolicyStatusResponse>("/policy/status"),

  getPolicyHistory: () => request<PolicyHistoryItem[]>("/policy/history"),

  downloadPolicyDocument: async () => {
    const res = await fetch(`${BASE}/policy/download`, { headers: getHrHeaders() });
    if (!res.ok) {
      let detail = res.statusText;
      try {
        const body = await res.json();
        detail = body.detail ?? detail;
      } catch {
        /* ignore */
      }
      throw new ApiError(typeof detail === "string" ? detail : String(detail), res.status);
    }
    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") ?? "";
    const match = disposition.match(/filename="?([^"]+)"?/);
    const filename = match?.[1] ?? "company-policy.pdf";
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  uploadPolicyDocument: (
    file: File,
    onUploadProgress?: (percent: number) => void,
    onUploadComplete?: () => void,
  ): UploadPolicyHandle => {
    const formData = new FormData();
    formData.append("file", file);
    return uploadForm("/policy/upload", formData, onUploadProgress, onUploadComplete);
  },

  policyChat: (
    employee_id: string,
    conversation_id: string,
    message: string,
  ): Promise<PolicyChatApiResponse> =>
    request<PolicyChatApiResponse>("/policy/chat", {
      method: "POST",
      body: JSON.stringify({ employee_id, conversation_id, message }),
    }),
};
