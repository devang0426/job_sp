"use client";

import { useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { Sparkles, Copy, Check, Eye, EyeOff, KeyRound, Mail, Zap, LogOut } from "lucide-react";

interface DemoCredentialsCardProps {
  defaultEmail?: string;
  defaultPassword?: string;
}

export function DemoCredentialsCard({
  defaultEmail = process.env.NEXT_PUBLIC_DEMO_EMAIL || "recruiter.demo@example.com",
  defaultPassword = process.env.NEXT_PUBLIC_DEMO_PASSWORD || "DemoRecruiter2026!",
}: DemoCredentialsCardProps) {
  const { isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const [copiedField, setCopiedField] = useState<"email" | "password" | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [autofillStatus, setAutofillStatus] = useState<"idle" | "success" | "partial">("idle");
  const [signingOut, setSigningOut] = useState(false);


  const handleCopy = async (text: string, field: "email" | "password") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback
    }
  };

  const setNativeInputValue = (input: HTMLInputElement, value: string) => {
    const lastValue = input.value;
    input.value = value;
    
    // Trigger React's internal value tracker if present
    const tracker = (input as unknown as { _valueTracker?: { setValue: (val: string) => void } })._valueTracker;
    if (tracker) {
      tracker.setValue(lastValue);
    }

    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.dispatchEvent(new Event("blur", { bubbles: true }));
    input.focus();
  };

  const handleAutofill = () => {
    const emailSelectors = [
      'input[name="identifier"]',
      'input[type="email"]',
      'input[name="email"]',
      'input[autocomplete="username"]',
      'input[placeholder*="email" i]',
      '.cl-formFieldInput[type="text"]',
      '.cl-formFieldInput[type="email"]',
    ];

    const passwordSelectors = [
      'input[name="password"]',
      'input[type="password"]',
      'input[autocomplete="current-password"]',
      '.cl-formFieldInput[type="password"]',
    ];

    let emailFilled = false;
    let passwordFilled = false;

    // Try finding email input
    for (const selector of emailSelectors) {
      const el = document.querySelector(selector);
      if (el instanceof HTMLInputElement && el.offsetParent !== null) {
        setNativeInputValue(el, defaultEmail);
        emailFilled = true;
        break;
      }
    }

    // Try finding password input
    for (const selector of passwordSelectors) {
      const el = document.querySelector(selector);
      if (el instanceof HTMLInputElement && el.offsetParent !== null) {
        setNativeInputValue(el, defaultPassword);
        passwordFilled = true;
        break;
      }
    }

    if (emailFilled || passwordFilled) {
      setAutofillStatus(emailFilled && passwordFilled ? "success" : "partial");
      setTimeout(() => setAutofillStatus("idle"), 2500);
    } else {
      // If no inputs found (e.g. still loading), copy email to clipboard
      handleCopy(defaultEmail, "email");
    }
  };

  return (
    <div className="w-full max-w-[400px] rounded-xl border border-border-default bg-bg-surface p-5 shadow-xs transition-all">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-accent">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                Demo Access
              </span>
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-[13px] font-medium text-text-primary leading-tight">
              Recruiter Test Credentials
            </p>
          </div>
        </div>
        <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-bg-raised text-text-secondary border border-border-default">
          1-Click Fill
        </span>
      </div>

      {/* Active Session Notice */}
      {isSignedIn && (
        <div className="mt-3.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold flex items-center gap-1.5 text-amber-900">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              Active Session Logged In
            </span>
            <button
              type="button"
              disabled={signingOut}
              onClick={async () => {
                setSigningOut(true);
                await signOut({ redirectUrl: "/sign-in" });
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white text-slate-800 font-medium text-[11px] border border-slate-300 hover:bg-slate-50 cursor-pointer shadow-2xs"
            >
              <LogOut className="h-3 w-3 text-slate-600" />
              <span>{signingOut ? "Signing out..." : "Sign Out to Reset"}</span>
            </button>
          </div>
          <p className="text-[11px] text-amber-700 leading-tight">
            You are currently signed in as <strong>{user?.primaryEmailAddress?.emailAddress}</strong>. Click <strong className="text-amber-900">Sign Out</strong> to test the username/password login screen from scratch.
          </p>
        </div>
      )}

      {/* Credentials display */}
      <div className="mt-3.5 space-y-2">
        {/* Email */}

        <div className="flex items-center justify-between gap-2 rounded-lg bg-bg-base px-3 py-2 border border-border-default/70">
          <div className="flex items-center gap-2 overflow-hidden">
            <Mail className="h-3.5 w-3.5 text-text-muted shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] uppercase font-mono tracking-wider text-text-muted">
                Email
              </span>
              <span className="text-xs font-mono font-medium text-text-primary truncate select-all">
                {defaultEmail}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleCopy(defaultEmail, "email")}
            className="flex items-center gap-1 text-[11px] font-medium text-text-secondary hover:text-accent px-2 py-1 rounded hover:bg-bg-surface transition-colors shrink-0"
            title="Copy email to clipboard"
          >
            {copiedField === "email" ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-600 font-medium">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Password */}
        <div className="flex items-center justify-between gap-2 rounded-lg bg-bg-base px-3 py-2 border border-border-default/70">
          <div className="flex items-center gap-2 overflow-hidden">
            <KeyRound className="h-3.5 w-3.5 text-text-muted shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] uppercase font-mono tracking-wider text-text-muted">
                Password
              </span>
              <span className="text-xs font-mono font-medium text-text-primary truncate select-all">
                {showPassword ? defaultPassword : "••••••••••••••••"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="p-1 text-text-muted hover:text-text-secondary rounded hover:bg-bg-surface transition-colors"
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => handleCopy(defaultPassword, "password")}
              className="flex items-center gap-1 text-[11px] font-medium text-text-secondary hover:text-accent px-2 py-1 rounded hover:bg-bg-surface transition-colors"
              title="Copy password to clipboard"
            >
              {copiedField === "password" ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-600 font-medium">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Auto-fill Action Button */}
      <div className="mt-3.5">
        <button
          type="button"
          onClick={handleAutofill}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-accent-hover transition-all active:scale-[0.99] cursor-pointer"
        >
          {autofillStatus === "idle" ? (
            <>
              <Zap className="h-3.5 w-3.5 fill-white" />
              <span>Auto-fill Test Credentials</span>
            </>
          ) : (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-200" />
              <span>Credentials Injected Into Form!</span>
            </>
          )}
        </button>
      </div>

      {/* Subtext info */}
      <p className="mt-2.5 text-center text-[11px] text-text-muted leading-tight">
        Click <strong className="text-text-secondary font-medium">Auto-fill</strong> or copy credentials directly to sign in to the live demo console.
      </p>
    </div>
  );
}
