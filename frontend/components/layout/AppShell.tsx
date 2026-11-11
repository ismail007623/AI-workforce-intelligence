"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { cn, formatFullDate, initials } from "@/lib/utils";
import { useSession } from "@/lib/session";
import { Logo } from "./Logo";
import { ComingSoonModal } from "./ComingSoonModal";
import type { NavSection } from "./nav";

function NavLinks({
  sections,
  onNavigate,
  onComingSoon,
}: {
  sections: NavSection[];
  onNavigate?: () => void;
  onComingSoon: (label: string) => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5 scrollbar-thin">
      {sections.map((section) => (
        <div key={section.title}>
          <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
            {section.title}
          </p>
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = item.href && pathname === item.href;

              if (item.comingSoon || !item.href) {
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => onComingSoon(item.label)}
                    className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--color-text-muted)] transition-colors duration-200 hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-text-primary)]"
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    <span className="rounded-md bg-[var(--color-bg-soft)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                      Soon
                    </span>
                  </button>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-[var(--color-primary-xlight)] text-[var(--color-primary)]"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-text-primary)]",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-[18px] w-[18px] shrink-0",
                      active ? "text-[var(--color-primary)]" : "text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)]",
                    )}
                  />
                  <span className="flex-1">{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="rounded-full bg-[var(--color-primary)] px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarBody({
  sections,
  userName,
  userSubtitle,
  onNavigate,
  onComingSoon,
}: {
  sections: NavSection[];
  userName: string;
  userSubtitle: string;
  onNavigate?: () => void;
  onComingSoon: (label: string) => void;
}) {
  const { logout } = useSession();
  const router = useRouter();

  const handleSwitch = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center border-b border-[var(--color-border)] px-5">
        <Logo />
      </div>

      <NavLinks sections={sections} onNavigate={onNavigate} onComingSoon={onComingSoon} />

      <div className="shrink-0 border-t border-[var(--color-border)] p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary-xlight)] text-xs font-bold text-[var(--color-primary)]">
            {initials(userName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{userName}</p>
            <p className="truncate text-xs text-[var(--color-text-muted)]">{userSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={handleSwitch}
            title="Switch role / sign out"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition-colors duration-200 hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-text-primary)]"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppShell({
  sections,
  userName,
  userSubtitle,
  children,
}: {
  sections: NavSection[];
  userName: string;
  userSubtitle: string;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [comingSoon, setComingSoon] = useState<string | null>(null);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar — styling unchanged */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-[var(--color-border)] bg-white lg:flex lg:flex-col">
        <SidebarBody
          sections={sections}
          userName={userName}
          userSubtitle={userSubtitle}
          onComingSoon={setComingSoon}
        />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-[#17172b]/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-soft)]"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarBody
              sections={sections}
              userName={userName}
              userSubtitle={userSubtitle}
              onNavigate={() => setMobileOpen(false)}
              onComingSoon={(label) => {
                setMobileOpen(false);
                setComingSoon(label);
              }}
            />
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col bg-[var(--color-bg-page)] lg:pl-60">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-[var(--color-border)] bg-white/90 px-4 backdrop-blur-xl sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-primary-xlight)] lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm font-medium text-[var(--color-text-muted)] sm:block">
              {formatFullDate()}
            </span>
            <span className="hidden text-sm font-semibold text-[var(--color-text-primary)] md:block">
              {userName}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary-xlight)] text-xs font-bold text-[var(--color-primary)]">
              {initials(userName)}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <div className="mx-auto w-full max-w-[1280px]">{children}</div>
        </main>
      </div>

      {comingSoon && (
        <ComingSoonModal feature={comingSoon} onClose={() => setComingSoon(null)} />
      )}
    </div>
  );
}
