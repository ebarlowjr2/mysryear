"use client";
import React, { useState } from "react";

export type Row = {
  id: string;
  name: string;
  amount: string;     // "$2,500"
  deadline: string;   // "2025-11-15" or "Nov 15"
  link: string;
  state?: string | null;
  tags?: string[];
};

export default function ScholarshipRow({ item, onSave, onApply }:{
  item: Row;
  onSave?: (r: Row)=>void;
  onApply?: (r: Row)=>void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="font-semibold truncate">{item.name}</div>
        <div className="text-sm text-slate-600 flex flex-wrap gap-3 mt-1">
          <span>Amount: <b>{item.amount}</b></span>
          <span>Deadline: <b>{item.deadline}</b></span>
          {item.state && <span>State: <b>{item.state}</b></span>}
          {item.tags?.length ? <span className="truncate">Tags: {item.tags.join(", ")}</span> : null}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {onSave && <button disabled={busy} className="btn-secondary" onClick={()=>{setBusy(true); onSave(item); setBusy(false);}}>Save</button>}
        {onApply && <button disabled={busy} className="btn-primary" onClick={()=>{setBusy(true); onApply(item); setBusy(false);}}>Mark Applied</button>}
        <a className="btn" href={item.link} target="_blank" rel="noreferrer">Open</a>
      </div>
    </div>
  );
}
