import React from "react";
import ScholarshipCard, { type Scholarship } from "@/components/ScholarshipCard";

async function getScholarships(): Promise<Scholarship[]> {
  const res = await fetch("/api/scholarships", { cache: "no-store" });
  return res.json();
}

export default async function Scholarships() {
  const items = await getScholarships();
  return (
    <div className="container-prose py-14 md:py-16">
      <h1 className="text-4xl font-black tracking-tight">Scholarships</h1>
      <p className="mt-3 text-slate-700 max-w-3xl">Filtered results from partner feeds + your saved tags. (Mock data for now.)</p>
      <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map(s => <ScholarshipCard key={s.id} s={s} />)}
      </div>
    </div>
  );
}
