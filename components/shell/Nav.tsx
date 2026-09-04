"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  CalendarClock,
  Columns3,
  FileText,
  LayoutList,
  Mail,
  Radar,
  Settings,
  Terminal,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
}

const SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "DISCOVER",
    items: [
      { href: "/feed", label: "Job Feed", icon: LayoutList },
      { href: "/scans", label: "Scan Runs", icon: Radar },
    ],
  },
  {
    label: "PIPELINE",
    items: [
      { href: "/tracker", label: "Kanban Board", icon: Columns3 },
      { href: "/follow-ups", label: "Follow-ups", icon: CalendarClock },
    ],
  },
  {
    label: "STUDIO",
    items: [
      { href: "/studio/cv", label: "CV Variants", icon: FileText },
      { href: "/studio/emails", label: "Email Drafts", icon: Mail },
    ],
  },
];

const FOOTER_ITEMS: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-all duration-150",
        active
          ? "bg-slate-100 text-slate-900 font-semibold shadow-2xs"
          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
      )}
    >
      <div className="flex items-center gap-2.5 truncate">
        <Icon
          className={cn(
            "h-4 w-4 shrink-0 transition-colors duration-150",
            active ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600",
          )}
          strokeWidth={active ? 2.2 : 1.8}
        />
        <span className="truncate">{item.label}</span>
      </div>
      {active && (
        <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0" />
      )}
    </Link>
  );
}

export function Nav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="flex h-full w-[230px] shrink-0 flex-col border-r border-slate-200 bg-white select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 bg-white">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white font-mono text-xs shadow-xs">
            <Terminal className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="font-sans text-xs font-bold text-slate-900 tracking-tight">
              Job Console
            </p>
            <p className="font-mono text-[9.5px] text-slate-400">DISPATCH V1.0</p>
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-2.5 py-4">
        {SECTIONS.map((section) => (
          <div key={section.label} className="flex flex-col gap-1">
            <p className="px-3 pb-1 font-mono text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              {section.label}
            </p>
            {section.items.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(item.href)} />
            ))}
          </div>
        ))}
      </div>

      {/* Footer Profile & Account Controls */}
      <div className="flex flex-col gap-1 border-t border-slate-200 px-2.5 py-3 bg-white">
        {FOOTER_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} />
        ))}
        <div className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center">
            <UserButton
              appearance={{
                elements: {
                  userButtonAvatarBox: "h-5 w-5 rounded-md",
                  userButtonTrigger: "focus:shadow-none focus:outline-none",
                },
              }}
            />
          </div>
          <span className="truncate">Account Profile</span>
        </div>
      </div>
    </nav>
  );
}


