import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Job Application Dispatch Console",
  description:
    "Pulls real postings from multiple sources, evaluates match scores against your CV, and dispatches applications.",
};

const clerkAppearance = {
  variables: {
    colorBackground: "var(--color-bg-surface)",
    colorInputBackground: "var(--color-bg-base)",
    colorText: "var(--color-text-primary)",
    colorTextSecondary: "var(--color-text-secondary)",
    colorInputText: "var(--color-text-primary)",
    colorPrimary: "var(--color-text-primary)",
    colorNeutral: "var(--color-text-primary)",
    colorDanger: "var(--color-state-error)",
    colorSuccess: "var(--color-state-success)",
    borderRadius: "8px",
    fontFamily: "var(--font-sans)",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ClerkProvider
      appearance={clerkAppearance}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignOutUrl="/sign-in"
    >
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <body className="min-h-full bg-[var(--color-bg-base)] text-[var(--color-text-primary)] font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
