import React, { type ReactNode } from "react";

export default function FeatureCard({ icon, title, desc, href }:{ icon: ReactNode; title: string; desc: string; href?: string }) {
  const Wrapper = ({children}:{children:ReactNode}) => href ? <a href={href} className="block"> {children} </a> : <>{children}</>;
  return (
    <Wrapper>
      <div className="card p-6 h-full flex flex-col">
        <div className="h-10 w-10 rounded-xl bg-brand-50 flex items-center justify-center mb-4">{icon}</div>
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="mt-2 text-slate-600 leading-relaxed">{desc}</p>
        {href && <span className="mt-4 text-brand-700 text-sm font-semibold">Open →</span>}
      </div>
    </Wrapper>
  );
}
