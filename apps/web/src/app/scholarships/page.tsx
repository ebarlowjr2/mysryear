'use client'

import React, { useEffect, useState } from "react";
import ScholarshipCard, { type Scholarship } from "@/components/ScholarshipCard";

export default function Scholarships() {
  const [items, setItems] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getScholarships() {
      try {
        const res = await fetch("/api/scholarships", { cache: "no-store" });
        const data = await res.json();
        setItems(data);
      } catch (error) {
        console.error("Failed to fetch scholarships:", error);
      } finally {
        setLoading(false);
      }
    }
    getScholarships();
  }, []);

  if (loading) {
    return (
      <div className="container-prose py-14 md:py-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading scholarships...</p>
        </div>
      </div>
    );
  }

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
