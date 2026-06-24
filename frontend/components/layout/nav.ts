import {
  BarChart3,
  Bell,
  Brain,
  Building2,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  Clock,
  FileText,
  LayoutDashboard,
  LogIn,
  Settings,
  ShieldQuestion,
  UserCog,
  UserX,
  Users,
} from "lucide-react";

export type NavItem = {
  label: string;
  icon: React.ElementType;
  href?: string;
  comingSoon?: boolean;
  badge?: number;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const employeeNav: NavSection[] = [
  {
    title: "Overview",
    items: [
      { label: "Check In / Out", icon: LogIn, href: "/employee" },
      { label: "My Attendance", icon: ClipboardList, href: "/employee/history" },
      { label: "My Summary", icon: BarChart3, href: "/employee/summary" },
    ],
  },
  {
    title: "Personal",
    items: [
      { label: "My Schedule", icon: CalendarDays, comingSoon: true },
      { label: "Leave Requests", icon: CalendarClock, comingSoon: true },
      { label: "Notifications", icon: Bell, comingSoon: true },
    ],
  },
];

export const hrNav: NavSection[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, href: "/hr" },
      { label: "Live Attendance", icon: Clock, href: "/hr/live" },
    ],
  },
  {
    title: "Workforce",
    items: [
      { label: "Late Arrivals", icon: Clock, href: "/hr/late" },
      { label: "Absentees", icon: UserX, href: "/hr/absent" },
      { label: "Departments", icon: Building2, href: "/hr/departments" },
      { label: "Employees", icon: Users, comingSoon: true },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { label: "AI Insights", icon: Brain, href: "/hr/insights" },
      { label: "Reports", icon: FileText, comingSoon: true },
    ],
  },
  {
    title: "Administration",
    items: [
      { label: "Attendance Policy", icon: ShieldQuestion, href: "/hr/policy" },
      { label: "Users & Roles", icon: UserCog, comingSoon: true },
      { label: "Settings", icon: Settings, comingSoon: true },
    ],
  },
];
