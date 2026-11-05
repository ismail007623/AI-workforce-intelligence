import type {
  AbsentEmployee,
  AttendanceRecord,
  AuthData,
  AuthEnvelope,
  AuthUser,
  CheckInResponse,
  CheckOutResponse,
  CompanySignupPayload,
  DailyTrendPoint,
  DashboardSummary,
  DepartmentStats,
  DepartmentEmployeeRow,
  Employee,
  EmployeeSummary,
  InsightsResponse,
  Invitation,
  InvitationAcceptPayload,
  InvitationCreatePayload,
  InvitationCreated,
  LateIntelligenceRecord,
  LateReasonSubmitResponse,
  LoginPayload,
  PolicyChatApiResponse,
  PolicyHistoryItem,
  PolicyStatusResponse,
  PolicyUploadResponse,
  SignupPayload,
  TokenPair,
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

// Token storage (POC choice): localStorage, matching the existing
// session storage. Production follow-up: move tokens to httpOnly,
// Secure, SameSite cookies set by the backend so JavaScript cannot
// read them, and remove this client-side storage.
const ACCESS_KEY = "awi.access_token";
const REFRESH_KEY = "awi.refresh_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(tokens: TokenPair): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_KEY, tokens.access_token);
  localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
}

export function clearTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem("awi.role");
  localStorage.removeItem("awi.employee");
}

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function parseErrorDetail(body: unknown, fallback: string): string {
  if (body && typeof body === "object") {
    const detail = (body as { detail?: unknown; message?: unknown }).detail
      ?? (body as { message?: unknown }).message;
    if (typeof detail === "string") return detail;
    if (detail !== undefined) return JSON.stringify(detail);
  }
  return fallback;
}

let refreshPromise: Promise<TokenPair> | null = null;

async function refreshTokens(): Promise<TokenPair> {
  if (refreshPromise) return refreshPromise;
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearTokens();
    throw new ApiError("Your session has expired. Please sign in again.", 401);
  }
  refreshPromise = (async () => {
    let res: Response;
    try {
      res = await fetch(`${BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch {
      clearTokens();
      throw new ApiError("Cannot reach the server. Is the API running?", 0);
    }
    if (!res.ok) {
      clearTokens();
      let detail = res.statusText;
      try {
        detail = parseErrorDetail(await res.json(), detail);
      } catch {
        /* ignore */
      }
      throw new ApiError(detail, res.status);
    }
    const envelope = (await res.json()) as AuthEnvelope<AuthData>;
    setTokens(envelope.data.tokens);
    return envelope.data.tokens;
  })();
  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const isAuthCall = path.startsWith("/auth/");
  const doFetch = async (): Promise<Response> => {
    try {
      return await fetch(`${BASE}${path}`, {
        ...options,
        headers: { "Content-Type": "application/json", ...authHeaders(), ...options?.headers },
      });
    } catch {
      throw new ApiError("Cannot reach the server. Is the API running?", 0);
    }
  };

  let res = await doFetch();
  if (res.status === 401 && !isAuthCall && getRefreshToken()) {
    try {
      await refreshTokens();
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError("Your session has expired. Please sign in again.", 401);
    }
    res = await doFetch();
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = parseErrorDetail(body, detail);
    } catch {
      /* ignore */
    }
    throw new ApiError(detail, res.status);
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

    const token = getAccessToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

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
        detail = parseErrorDetail(body, detail);
      } catch {
        /* ignore */
      }
      reject(new ApiError(detail, xhr.status));
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
  signup: async (payload: SignupPayload): Promise<AuthData> => {
    const envelope = await request<AuthEnvelope<AuthData>>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return envelope.data;
  },

  companySignup: async (payload: CompanySignupPayload): Promise<AuthData> => {
    const envelope = await request<AuthEnvelope<AuthData>>("/auth/company-signup", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return envelope.data;
  },

  createInvitation: async (payload: InvitationCreatePayload): Promise<InvitationCreated> => {
    const envelope = await request<AuthEnvelope<InvitationCreated>>("/auth/invitations", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return envelope.data;
  },

  listInvitations: async (): Promise<Invitation[]> => {
    const envelope = await request<AuthEnvelope<Invitation[]>>("/auth/invitations");
    return envelope.data;
  },

  acceptInvitation: async (payload: InvitationAcceptPayload): Promise<AuthData> => {
    const envelope = await request<AuthEnvelope<AuthData>>("/auth/invitations/accept", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return envelope.data;
  },

  login: async (payload: LoginPayload): Promise<AuthData> => {
    const envelope = await request<AuthEnvelope<AuthData>>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return envelope.data;
  },

  refreshTokens,

  logout: async (): Promise<void> => {
    const refreshToken = getRefreshToken();
    try {
      await request<AuthEnvelope<{ user_id: number }>>(
        "/auth/logout",
        refreshToken
          ? { method: "POST", body: JSON.stringify({ refresh_token: refreshToken }) }
          : { method: "POST" },
      );
    } catch {
      /* best-effort: local session is cleared either way */
    } finally {
      clearTokens();
    }
  },

  getMe: async (): Promise<AuthUser> => {
    const envelope = await request<AuthEnvelope<AuthUser>>("/auth/me");
    return envelope.data;
  },

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
    let res = await fetch(`${BASE}/policy/download`, { headers: authHeaders() });
    if (res.status === 401 && getRefreshToken()) {
      try {
        await refreshTokens();
        res = await fetch(`${BASE}/policy/download`, { headers: authHeaders() });
      } catch {
        /* fall through to the error handling below */
      }
    }
    if (!res.ok) {
      let detail = res.statusText;
      try {
        const body = await res.json();
        detail = parseErrorDetail(body, detail);
      } catch {
        /* ignore */
      }
      throw new ApiError(detail, res.status);
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
