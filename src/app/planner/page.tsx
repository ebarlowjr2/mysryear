import React from "react";
import Timeline from "@/components/Timeline";

export default function Planner() {
  const timeline = [
    { month: "Aug–Sep", items: ["Finalize schedule", "Build target list", "Common App account"] },
    { month: "Oct", items: ["FAFSA opens", "Request recommendations", "Test dates booked"] },
    { month: "Nov–Dec", items: ["EA/ED deadlines", "Scholarship sprint", "Essay polish"] },
    { month: "Jan–Mar", items: ["Regular decision apps", "Aid comparison", "Campus visits"] },
    { month: "Apr–May", items: ["Decision & deposit", "Housing", "Orientation"] },
  ];
  return (
    <div className="container-prose py-14">
      <h1 className="text-4xl font-black tracking-tight">Senior Year Planner</h1>
      <p className="mt-3 text-slate-700 max-w-3xl">Customize this timeline by your goals and state calendars.</p>
      <div className="mt-8 max-w-3xl">
        <Timeline data={timeline} />
      </div>
    </div>
  );
}
