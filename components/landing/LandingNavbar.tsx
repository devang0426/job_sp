"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Terminal, ArrowRight } from "lucide-react";

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 24);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-4 transition-all duration-200">
      <nav
        className={`flex items-center justify-between gap-6 px-4 sm:px-5 py-2.5 rounded-xl transition-all duration-200 w-full max-w-5xl ${
          scrolled
            ? "bg-white/90 backdrop-blur-md border border-slate-200 shadow-sm"
            : "bg-white/75 backdrop-blur-sm border border-slate-200/80 shadow-2xs"
        }`}
      >
        {/* Brand Mark & Telemetry Pill */}
        <Link href="/" className="flex items-center gap-2.5 group select-none">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white font-mono text-xs font-bold shadow-xs group-hover:bg-blue-600 transition-colors">
            <Terminal className="h-3.5 w-3.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold tracking-tight text-slate-900">
              Job Console
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[9.5px] font-mono text-emerald-600 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live ATS Syndication
            </span>
          </div>
        </Link>

        {/* Core Navigation Links */}
        <div className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600">
          <a href="#how-it-works" className="hover:text-slate-900 transition-colors">
            How It Works
          </a>
          <a href="#interactive-demo" className="hover:text-slate-900 transition-colors">
            Live Preview
          </a>
          <a href="#philosophy" className="hover:text-slate-900 transition-colors">
            Our Rule
          </a>
          <a href="#faq" className="hover:text-slate-900 transition-colors">
            FAQ
          </a>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/sign-in"
            className="hidden sm:inline-block text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-slate-100"
          >
            Sign In
          </Link>
          <Link
            href="/feed"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <span>Start Free</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </nav>
    </header>
  );
}
