"use client";
import React, { useEffect, useMemo, useState } from "react";
import ScholarshipFilters, { type Filters } from "./ScholarshipFilters";
import ScholarshipRow, { type Row } from "./ScholarshipRow";

function normalizeDeadline(d: string): string {
  try {
    if (/\d{4}-\d{2}-\d{2}/.test(d)) return d;
    const date = new Date(d + " " + new Date().getFullYear());
    if (!isNaN(date.getTime())) return date.toISOString().slice(0,10);
  } catch {}
  return d;
}

export default function ClientArea({ initialDiscover }:{ initialDiscover: Row[] }) {
  const [applied, setApplied] = useState<Row[]>([]);
  const [todo, setTodo] = useState<Row[]>([]);
  const [filters, setFilters] = useState<Filters>({ q: "", state: "", minAmount: null, deadlineBefore: null });

  useEffect(() => {
    const a = typeof window !== 'undefined' ? localStorage.getItem("msy_applied") : null;
    const t = typeof window !== 'undefined' ? localStorage.getItem("msy_todo") : null;
    if (a) setApplied(JSON.parse(a));
    if (t) setTodo(JSON.parse(t));
  }, []);
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem("msy_applied", JSON.stringify(applied)); }, [applied]);
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem("msy_todo", JSON.stringify(todo)); }, [todo]);

  const onSave = (r: Row) => { if (!todo.find(x=>x.id===r.id) && !applied.find(x=>x.id===r.id)) setTodo([r, ...todo]); };
  const onApply = (r: Row) => { if (!applied.find(x=>x.id===r.id)) setApplied([r, ...applied]); setTodo(todo.filter(x=>x.id!==r.id)); };

  const filterFn = (rows: Row[]) => rows.filter((r) => {
    const q = filters.q.trim().toLowerCase();
    const matchesQ = !q || [r.name, r.tags?.join(" ") || ""].join(" ").toLowerCase().includes(q);
    const amtNum = parseInt((r.amount || "").replace(/[^0-9]/g, "")) || 0;
    const matchesAmt = filters.minAmount == null || amtNum >= (filters.minAmount || 0);
    const matchesState = !filters.state || (r.state||"").toUpperCase() === filters.state.toUpperCase();
    const matchesDeadline = !filters.deadlineBefore || (normalizeDeadline(r.deadline) <= filters.deadlineBefore);
    return matchesQ && matchesAmt && matchesState && matchesDeadline;
  });

  const filteredDiscover = useMemo(()=>filterFn(initialDiscover), [initialDiscover, filters]);
  const filteredTodo = useMemo(()=>filterFn(todo), [todo, filters]);
  const filteredApplied = useMemo(()=>filterFn(applied), [applied, filters]);

  return (
    <div className="mt-6">
      <ScholarshipFilters onChange={setFilters} />

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <section>
          <h2 className="text-xl font-bold">To Apply</h2>
          <div className="mt-3 space-y-3">
            {filteredTodo.length ? filteredTodo.map(s => (
              <ScholarshipRow key={s.id} item={s} onApply={onApply} />
            )) : <div className="text-slate-500 text-sm">No saved scholarships yet.</div>}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold">Applied</h2>
          <div className="mt-3 space-y-3">
            {filteredApplied.length ? filteredApplied.map(s => (
              <ScholarshipRow key={s.id} item={s} />
            )) : <div className="text-slate-500 text-sm">You haven&apos;t marked any as applied.</div>}
          </div>
        </section>
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-bold">Discover</h2>
        <p className="mt-1 text-slate-600 text-sm">From partner feeds and curated sources (mock data).</p>
        <div className="mt-3 space-y-3">
          {filteredDiscover.map((s: Row) => (
            <ScholarshipRow key={s.id} item={s} onSave={onSave} onApply={onApply} />
          ))}
        </div>
      </section>
    </div>
  );
}
