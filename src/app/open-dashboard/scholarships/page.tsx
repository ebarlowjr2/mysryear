import React from 'react';
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function fetchDiscover() {
  const base = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://mysryear.vercel.app');
  const res = await fetch(`${base}/api/scholarships`, { cache: "no-store" });
  return res.json();
}

export default async function Page() {
  const session = await getSession();

  if (!session) {
    return (
      <div className="container-prose py-20">
        <div className="max-w-xl mx-auto card p-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Scholarships</h1>
          <p className="mt-3 text-slate-700">Please sign in to view and manage your scholarships.</p>
          <div className="mt-6 flex justify-center"><a href="/login" className="btn-primary">Sign in</a></div>
        </div>
      </div>
    );
  }

  const discover = await fetchDiscover();

  return (
    <div className="container-prose py-10">
      <h1 className="text-3xl sm:text-4xl font-black tracking-tight">My Scholarships</h1>
      <p className="mt-2 text-slate-700">Track what you&apos;ve applied to, what&apos;s next, and discover more.</p>
      <ClientArea initialDiscover={discover} />
    </div>
  );
}

/* ---------- Client Area (imports) ---------- */
import ClientArea from "./ui/ClientArea";
