import React from "react";

export default function Section({ id, title, subtitle, children }:{ id?: string; title: string; subtitle?: string; children: React.ReactNode; }) {
  return (
    <section id={id} className="container-prose py-16">
      <div className="max-w-3xl mb-8">
        <h2 className="text-3xl sm:text-4xl font-black tracking-tight">{title}</h2>
        {subtitle && <p className="mt-3 text-slate-600">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}
