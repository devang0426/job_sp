"use client";

import { SignOutButton, UserButton } from "@clerk/nextjs";
import { LogOut, Radar } from "lucide-react";

interface OnboardingHeaderProps {
  userEmail?: string;
}

export function OnboardingHeader({ userEmail }: OnboardingHeaderProps) {
  return (
    <header className="w-full border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-30 shadow-2xs">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand identity */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white shadow-xs">
            <Radar className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-slate-900 block leading-tight">
              Job Dispatch
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
              Autonomous Match Engine
            </span>
          </div>
        </div>

        {/* User profile & Sign Out */}
        <div className="flex items-center gap-3">
          {userEmail && (
            <span className="hidden sm:inline-block text-xs font-mono text-slate-500 truncate max-w-[200px]">
              {userEmail}
            </span>
          )}

          <UserButton
            afterSignOutUrl="/sign-in"
            appearance={{
              elements: {
                avatarBox: "w-8 h-8 rounded-full border border-slate-200",
              },
            }}
          />

          <SignOutButton redirectUrl="/sign-in">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer active:scale-95"
              title="Sign out of your account"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </SignOutButton>
        </div>
      </div>
    </header>
  );
}
