import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { LandingHero } from "@/components/landing/LandingHero";
import { ProtocolSection } from "@/components/landing/ProtocolSection";
import { FeaturesArtifacts } from "@/components/landing/FeaturesArtifacts";
import { PhilosophySection } from "@/components/landing/PhilosophySection";
import { LandingFaq } from "@/components/landing/LandingFaq";
import { LandingFooter } from "@/components/landing/LandingFooter";

export const metadata = {
  title: "Job Console — Simple, Honest Job Matching & CV Tailoring",
  description:
    "Zero ghost jobs. Zero arbitrary rejection. Real company postings matched against your CV with clear 0–100 scores and honest recommendations.",
};

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden selection:bg-blue-100 selection:text-blue-800">
      {/* Subtle global SVG turbulence noise overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-40 opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Floating Island Navigation */}
      <LandingNavbar />

      <main>
        {/* 1. Hero with live click-to-preview feed */}
        <LandingHero />

        {/* 2. Simple 4-Step Walkthrough */}
        <ProtocolSection />

        {/* 3. Interactive Tools Deck */}
        <FeaturesArtifacts />

        {/* 4. The Golden Rule / Why Job Console */}
        <PhilosophySection />

        {/* 5. Frequently Asked Questions */}
        <LandingFaq />
      </main>

      {/* Telemetry Status Footer */}
      <LandingFooter />
    </div>
  );
}
