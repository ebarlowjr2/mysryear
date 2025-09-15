"use client";
import React, { useEffect, useState } from "react";

export type Filters = {
  q: string;
  state: string;
  minAmount: number | null;
  deadlineBefore: string | null; // yyyy-mm-dd
};

export default function ScholarshipFilters({ onChange }:{ onChange: (f: Filters)=>void }) {
  const [q, setQ] = useState("");
  const [state, setState] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [deadlineBefore, setDeadlineBefore] = useState("");

  useEffect(() => {
    onChange({
      q,
      state,
      minAmount: minAmount ? parseInt(minAmount) : null,
      deadlineBefore: deadlineBefore || null,
    });
  }, [q, state, minAmount, deadlineBefore, onChange]);

  return (
    <div className="card p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Keyword (e.g., STEM, first-gen)" className="border rounded-2xl px-3 py-2" />
      <select value={state} onChange={e=>setState(e.target.value)} className="border rounded-2xl px-3 py-2">
        <option value="">Any State</option>
        {['AL','AK','AZ','AR','CA','CO','CT','DC','DE','FL','GA','HI','IA','ID','IL','IN','KS','KY','LA','MA','MD','ME','MI','MN','MO','MS','MT','NC','ND','NE','NH','NJ','NM','NV','NY','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VA','VT','WA','WI','WV','WY'].map(s=>(
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <input value={minAmount} onChange={e=>setMinAmount(e.target.value)} placeholder="Min amount ($)" className="border rounded-2xl px-3 py-2" inputMode="numeric" />
      <input type="date" value={deadlineBefore} onChange={e=>setDeadlineBefore(e.target.value)} className="border rounded-2xl px-3 py-2" />
    </div>
  );
}
