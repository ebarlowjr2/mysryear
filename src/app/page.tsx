import Section from "@/components/Section";
import FeatureCard from "@/components/FeatureCard";
import Timeline from "@/components/Timeline";
import { GraduationCap, CalendarClock, ClipboardList, Layers, FileText, Search } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function Home({ searchParams }: { searchParams: Promise<{ code?: string; error?: string }> }) {
  const params = await searchParams;
  
  if (params.code) {
    redirect(`/auth/callback?code=${params.code}`);
  }
  
  if (params.error) {
    redirect(`/login?error=${params.error}`);
  }
  const timeline = [
    { month: "August–September", items: ["Finalize senior schedule", "List target schools or trade paths", "Create Common App / state app accounts"] },
    { month: "October", items: ["Complete FAFSA® (when open)", "Request recommendation letters", "Book ACT/SAT (if needed)"] },
    { month: "November–December", items: ["Early Action/Decision deadlines", "Scholarship application sprints", "Audit resume & activities list"] },
    { month: "January–March", items: ["Regular decision apps", "Compare aid letters", "Visit campuses or programs"] },
    { month: "April–May", items: ["Make your choice", "Submit housing & deposits", "Celebrate next steps"] },
  ];

  return (
    <>
      {/* Hero */}
      <section className="container-prose pt-14 pb-10">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="badge mb-4">Built for Students & Parents</div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
              Your senior year,<br className="hidden sm:block" /> organized and stress‑less.
            </h1>
            <p className="mt-4 text-lg text-slate-700">
              My SR Year is a launchpad to manage applications, track scholarships, and plan life after high school—college, trades, military, or entrepreneurship.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/dashboard" className="btn-primary">Open Dashboard</Link>
              <Link href="/how-it-works" className="btn-secondary">How it Works</Link>
            </div>
            <p className="mt-3 text-xs text-slate-500">No account required to explore. Sign in to save progress.</p>
          </div>
          <div className="relative">
            <div className="card p-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="card p-4">
                  <div className="text-sm font-semibold text-slate-600">Next Deadline</div>
                  <div className="text-2xl font-black mt-1">FAFSA® opens</div>
                  <p className="mt-2 text-sm text-slate-600">Add a reminder and checklist.</p>
                </div>
                <div className="card p-4">
                  <div className="text-sm font-semibold text-slate-600">Scholarships</div>
                  <div className="text-2xl font-black mt-1">12 matches</div>
                  <p className="mt-2 text-sm text-slate-600">Filtered by GPA, state, and interests.</p>
                </div>
                <div className="card p-4">
                  <div className="text-sm font-semibold text-slate-600">Applications</div>
                  <div className="text-2xl font-black mt-1">3 in progress</div>
                  <p className="mt-2 text-sm text-slate-600">Keep essays, docs, and due dates together.</p>
                </div>
                <div className="card p-4">
                  <div className="text-sm font-semibold text-slate-600">Parent View</div>
                  <div className="text-2xl font-black mt-1">On track</div>
                  <p className="mt-2 text-sm text-slate-600">Weekly summary emails and check-ins.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <Section title="Everything in one place" subtitle="Replace sticky notes and scattered tabs with a simple dashboard.">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard icon={<GraduationCap />} title="Scholarship Finder" desc="Curated and scraped sources with filters for GPA, state, major, identity, and deadlines." href="/scholarships" />
          <FeatureCard icon={<CalendarClock />} title="Senior Year Timeline" desc="Auto‑generated milestones you can customize for your state and goals." href="/planner" />
          <FeatureCard icon={<ClipboardList />} title="Application Tracker" desc="Track each school or program with tasks, essays, and required documents." href="/open-dashboard/applications" />
          <FeatureCard icon={<FileText />} title="Essay & Resume Vault" desc="Keep drafts, feedback, and activity lists tidy. Export when ready." href="/resources" />
          <FeatureCard icon={<Search />} title="Post‑HS Paths" desc="Compare college, trades, military, gap year, and entrepreneurship with real steps." href="/resources" />
          <FeatureCard icon={<Layers />} title="Parent & Counselor View" desc="Optional shared view with weekly summaries (no student surveillance)." href="/dashboard" />
        </div>
      </Section>

      {/* Timeline */}
      <Section id="timeline" title="A clear path from August to May" subtitle="Use ours or make your own.">
        <div className="grid lg:grid-cols-2 gap-10 items-start">
          <Timeline data={timeline} />
          <div className="card p-6">
            <h3 className="text-xl font-bold">Why it works</h3>
            <ul className="mt-3 list-disc ml-5 space-y-2 text-slate-700">
              <li>Structured weekly checklists prevent last‑minute scrambles.</li>
              <li>Scholarship feeds reduce busywork and save money.</li>
              <li>Parent view keeps adults looped in without micromanaging.</li>
            </ul>
            <div className="mt-6 flex gap-3">
              <a href="/how-it-works" className="btn-primary">See the flow</a>
              <a href="/dashboard" className="btn-secondary">Try the demo</a>
            </div>
          </div>
        </div>
      </Section>

      {/* CTA */}
      <section className="container-prose pb-24">
        <div className="card p-8 text-center">
          <h3 className="text-2xl sm:text-3xl font-black">Ready to get organized?</h3>
          <p className="mt-2 text-slate-700">Start with the dashboard, then connect a parent/counselor if you want help.</p>
          <div className="mt-4">
            <a className="btn-primary" href="/dashboard">Open the Dashboard</a>
          </div>
        </div>
      </section>
    </>
  );
}
