import React from 'react';

export default function StatTile({ label, value, desc }: { label: string; value: string; desc: string }) {
  return (
    <div className="card p-4">
      <div className="text-sm font-semibold text-slate-600">{label}</div>
      <div className="text-2xl font-black mt-1">{value}</div>
      <p className="mt-2 text-sm text-slate-600">{desc}</p>
    </div>
  );
}
