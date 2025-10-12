"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import {
  saveProfile,
  loadProfile,
  saveTasks,
  loadTasks,
  saveDocuments,
  loadDocuments,
  saveRecommenders,
  loadRecommenders,
  saveVisits,
  loadVisits,
  type Profile,
  type Task,
  type DocKit,
  type Recommender,
  type Visit,
  type Path,
  type Category,
  type Status
} from "@/lib/planner-storage";



const MONTHS = ["Aug–Sep", "Oct", "Nov–Dec", "Jan–Mar", "Apr–May", "Summer"];

const CATS: Category[] = [
  "Applications","Essays","Testing","Scholarships","Financial Aid","Campus Visits","Housing","Enrollment","Documents","Admin/Other"
];

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function todayISO(){ return new Date().toISOString().slice(0,10); }
function fmtDate(d?: string){ if(!d) return "—"; try{ return new Date(d+"T00:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});}catch{return d;} }
function daysUntil(d?: string){ if(!d) return null; const t = new Date(d+"T00:00:00").getTime() - Date.now(); return Math.ceil(t/86400000); }

function mk(
  title: string,
  category: Category,
  month: string,
  due?: string,
  extras?: Partial<Task>
): Task {
  return { id: uid(), title, category, month, status: "todo", due, notes: extras?.notes, pinned: extras?.pinned ?? false };
}

function baseTasks(p: Profile): Task[] {
  const t: Task[] = [
    mk("Finalize senior schedule","Admin/Other","Aug–Sep"),
    mk("Build initial college/program list","Applications","Aug–Sep"),
    mk("Create application accounts (Common App/State)","Applications","Aug–Sep"),
    mk("Create FSA ID (student + parent)","Financial Aid","Aug–Sep","",{ notes: "https://studentaid.gov/fsa-id/" }),
    mk("Draft academic résumé & activities list","Documents","Aug–Sep"),
    mk("Identify recommenders + ask in person","Applications","Aug–Sep"),
    mk("FAFSA opens — start application","Financial Aid","Oct", undefined, { notes: "https://studentaid.gov/h/apply-for-aid/fafsa" }),
    mk("Request official transcript","Documents","Oct"),
    mk("Confirm test plan (SAT/ACT/none)","Testing","Oct"),
    mk("Early Action/Early Decision deadlines","Applications","Nov–Dec"),
    mk("Scholarship sprint — apply to 3-5","Scholarships","Nov–Dec"),
    mk("Polish personal statement","Essays","Nov–Dec"),
    mk("Regular Decision applications","Applications","Jan–Mar"),
    mk("Send test scores if needed","Testing","Jan–Mar"),
    mk("Compare financial aid offers","Financial Aid","Jan–Mar"),
    mk("Campus visits or admitted student days","Campus Visits","Jan–Mar"),
    mk("Make final choice + deposit","Enrollment","Apr–May"),
    mk("Housing + orientation signup","Housing","Apr–May"),
    mk("Thank-you notes to recommenders","Admin/Other","Apr–May"),
    mk("Finalize immunizations/records","Documents","Summer"),
    mk("Placement testing / onboarding","Enrollment","Summer"),
  ];

  if (p.path === "Trade/Apprenticeship") {
    t.push(
      mk("Identify apprenticeship sponsors/union halls","Admin/Other","Aug–Sep"),
      mk("Apply to pre-apprenticeship/CTE program","Applications","Oct"),
      mk("Schedule aptitude/skills assessments","Testing","Nov–Dec"),
      mk("Tool list + PPE budget","Admin/Other","Jan–Mar"),
    );
  } else if (p.path === "Military") {
    t.push(
      mk("Meet recruiter (with parent)","Admin/Other","Aug–Sep"),
      mk("Schedule ASVAB","Testing","Oct"),
      mk("MEPS processing","Admin/Other","Nov–Dec"),
      mk("Choose MOS/Rate + DEP ship date","Enrollment","Jan–Mar"),
    );
  } else if (p.path === "Gap Year") {
    t.push(
      mk("Research gap programs / volunteering","Admin/Other","Aug–Sep"),
      mk("Budget & safety plan","Admin/Other","Oct"),
      mk("Visas/insurance (if travel)","Admin/Other","Nov–Dec"),
      mk("Defer enrollment or reapply plan","Applications","Jan–Mar"),
    );
  } else if (p.path === "Workforce") {
    t.push(
      mk("Resume + LinkedIn","Documents","Aug–Sep"),
      mk("Apply to 10 jobs/internships","Admin/Other","Oct"),
      mk("Interview practice","Admin/Other","Nov–Dec"),
      mk("Offer evaluation & onboarding","Enrollment","Jan–Mar"),
    );
  } else if (p.path === "Entrepreneurship") {
    t.push(
      mk("Mentor meetings / biz idea vetting","Admin/Other","Aug–Sep"),
      mk("File entity (LLC/DBA) + EIN","Admin/Other","Oct"),
      mk("Open business bank account","Admin/Other","Nov–Dec"),
      mk("Micro-grant applications","Scholarships","Jan–Mar"),
    );
  }

  if (p.earlyAction && p.path === "College") {
    t.push(mk("Finalize EA apps","Applications","Oct"));
  }

  const suggest = (title: string, due: string) => {
    const idx = t.findIndex(x => x.title === title);
    if (idx >= 0) t[idx].due = due;
  };
  suggest("FAFSA opens — start application", `${new Date().getFullYear()}-10-01`);
  suggest("Make final choice + deposit", `${new Date().getFullYear()}-05-01`);

  return t;
}

function icsForTasks(tasks: Task[]){
  const stamp = new Date().toISOString().replace(/[-:]/g,"").split(".")[0]+"Z";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//My SR Year//Planner//EN",
  ];
  for (const t of tasks) {
    if (!t.due) continue;
    const dt = t.due.replace(/-/g,"");
    const desc = `${t.category} • ${t.month}${t.notes ? "\\n"+t.notes : ""}`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${t.id}@mysryear`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${dt}`,
      `SUMMARY:${t.title}`,
      `DESCRIPTION:${desc}`,
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function download(filename: string, content: string, mime = "text/plain"){
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

export default function PlannerPage(){
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile>({ state: "", path: "College", testing: "None", earlyAction: true });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [docs, setDocs] = useState<DocKit>({ idCard:false, ssnReady:false, fsaId:false, taxDocs:false, transcript:false, testScores:false, resume:false, activitiesList:false, essays:false, recLetters:false, portfolio:false });
  const [recs, setRecs] = useState<Recommender[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        
        const savedProfile = await loadProfile(supabase);
        if (savedProfile) {
          setProfile(savedProfile);
        }

        const savedTasks = await loadTasks(supabase);
        if (savedTasks.length > 0) {
          setTasks(savedTasks);
        } else {
          const defaultTasks = baseTasks(savedProfile || profile);
          setTasks(defaultTasks);
          await saveTasks(supabase, defaultTasks);
        }

        const [savedDocs, savedRecs, savedVisits] = await Promise.all([
          loadDocuments(supabase),
          loadRecommenders(supabase),
          loadVisits(supabase)
        ]);
        
        setDocs(savedDocs);
        setRecs(savedRecs);
        setVisits(savedVisits);
      } catch (error) {
        console.error("Failed to load planner data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  useEffect(() => {
    if (loading) return;
    saveProfile(supabase, profile).catch(console.error);
  }, [profile, loading, supabase]);

  useEffect(() => {
    if (loading) return;
    saveTasks(supabase, tasks).catch(console.error);
  }, [tasks, loading, supabase]);

  useEffect(() => {
    if (loading) return;
    saveDocuments(supabase, docs).catch(console.error);
  }, [docs, loading, supabase]);

  useEffect(() => {
    if (loading) return;
    saveRecommenders(supabase, recs).catch(console.error);
  }, [recs, loading, supabase]);

  useEffect(() => {
    if (loading) return;
    saveVisits(supabase, visits).catch(console.error);
  }, [visits, loading, supabase]);

  function regenerateBaseline(replaceAll: boolean){
    const base = baseTasks(profile);
    if (replaceAll) setTasks(base);
    else setTasks(prev => mergeDedup(prev, base));
  }

  function mergeDedup(current: Task[], incoming: Task[]){
    const key = (t: Task) => `${t.title}::${t.month}::${t.category}`;
    const map = new Map(current.map(t => [key(t), t]));
    for (const t of incoming) if (!map.has(key(t))) map.set(key(t), t);
    return Array.from(map.values());
  }

  const [view, setView] = useState<"Month"|"Status">("Month");
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState<"All" | Category>("All");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return tasks.filter(t => {
      const matchesQ = !needle || [t.title, t.notes ?? ""].join(" ").toLowerCase().includes(needle);
      const matchesCat = catFilter === "All" || t.category === catFilter;
      return matchesQ && matchesCat;
    });
  }, [tasks, q, catFilter]);

  const dueSoon = useMemo(() => {
    return [...filtered].filter(t => t.due && (t.status !== "done")).sort((a,b) => (a.due||"").localeCompare(b.due||"")).slice(0,5);
  }, [filtered]);

  const statusCounts = useMemo(() => {
    return filtered.reduce((acc, t) => { acc[t.status] = (acc[t.status]||0)+1; return acc; }, {} as Record<Status,number>);
  }, [filtered]);

  function addTask(t: Omit<Task,"id">){ setTasks(prev => [{...t, id: uid()}, ...prev]); }
  function updateTask(id: string, patch: Partial<Task>){ setTasks(prev => prev.map(t => t.id===id ? {...t, ...patch} : t)); }
  function removeTask(id: string){ if (confirm("Delete this task?")) setTasks(prev => prev.filter(t => t.id!==id)); }
  function clearAll(){ if (confirm("Reset planner to a fresh baseline?")) { setTasks(baseTasks(profile)); setRecs([]); setVisits([]); } }
  function exportAllICS(){ const ics = icsForTasks(tasks); download("mysryear_planner.ics", ics, "text/calendar"); }
  function exportTasksCSV(){
    const header = ["Title","Category","Status","Month","Due","Notes"];
    const rows = tasks.map(t => [t.title,t.category,t.status,t.month,t.due||"", (t.notes||"").replace(/\n/g," ")]);
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    download("mysryear_tasks.csv", csv, "text/csv");
  }
  function exportVisitsCSV(){
    const header = ["School/Program","Date","Rating","Notes"];
    const rows = visits.map(v => [v.name, v.date||"", v.rating??"", (v.notes||"").replace(/\n/g," ")]);
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    download("mysryear_visits.csv", csv, "text/csv");
  }
  function exportJSON(){
    const payload = { profile, tasks, docs, recs, visits, exportedAt: new Date().toISOString() };
    download("mysryear_planner.json", JSON.stringify(payload, null, 2), "application/json");
  }
  function importJSON(file: File){
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(String(reader.result));
        
        if (data.profile) setProfile(data.profile);
        if (data.tasks) setTasks(data.tasks);
        if (data.docs) setDocs(data.docs);
        if (data.recs) setRecs(data.recs);
        if (data.visits) setVisits(data.visits);
        
        await Promise.all([
          data.profile && saveProfile(supabase, data.profile),
          data.tasks && saveTasks(supabase, data.tasks),
          data.docs && saveDocuments(supabase, data.docs),
          data.recs && saveRecommenders(supabase, data.recs),
          data.visits && saveVisits(supabase, data.visits)
        ].filter(Boolean));
        
        alert("Planner imported!");
      } catch (error) {
        console.error("Import error:", error);
        alert("Invalid file");
      }
    };
    reader.readAsText(file);
  }

  if (loading) {
    return (
      <div className="container-prose py-10">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading your planner...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-prose py-10">
      <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Senior Year Planner</h1>
      <p className="mt-2 text-slate-700">Personalize, track everything in one spot, export to calendar/CSV, and print. Built for students & parents together.</p>

      <div className="card p-6 mt-6">
        <h2 className="text-xl font-bold">Your plan</h2>
        <div className="grid md:grid-cols-4 gap-4 mt-3">
          <div>
            <label className="block text-sm font-semibold">State</label>
            <select className="border rounded-2xl px-3 py-2 w-full" value={profile.state} onChange={e=>setProfile({...profile, state: e.target.value})}>
              <option value="">Select...</option>
              {["AL","AK","AZ","AR","CA","CO","CT","DC","DE","FL","GA","HI","IA","ID","IL","IN","KS","KY","LA","MA","MD","ME","MI","MN","MO","MS","MT","NC","ND","NE","NH","NJ","NM","NV","NY","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VA","VT","WA","WI","WV","WY"].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold">Path</label>
            <select className="border rounded-2xl px-3 py-2 w-full" value={profile.path} onChange={e=>setProfile({...profile, path: e.target.value as Path})}>
              {["College","Trade/Apprenticeship","Military","Gap Year","Workforce","Entrepreneurship"].map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold">Testing Plan</label>
            <select className="border rounded-2xl px-3 py-2 w-full" value={profile.testing} onChange={e=>setProfile({...profile, testing: e.target.value as "SAT" | "ACT" | "Both" | "None"})}>
              {["None","SAT","ACT","Both"].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold">Early Action?</label>
            <select className="border rounded-2xl px-3 py-2 w-full" value={String(profile.earlyAction)} onChange={e=>setProfile({...profile, earlyAction: e.target.value==="true"})}>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn-primary" onClick={()=>regenerateBaseline(false)}>Add tasks for my path</button>
          <button className="btn" onClick={()=>regenerateBaseline(true)}>Replace with fresh baseline</button>
          <button className="btn" onClick={()=>window.print()}>Print</button>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 sm:grid-cols-2 gap-4 mt-6">
        <Stat label="To do" value={statusCounts["todo"]||0} />
        <Stat label="In progress" value={statusCounts["doing"]||0} />
        <Stat label="Done" value={statusCounts["done"]||0} />
        <Stat label="Next 5 deadlines" value={dueSoon.length} note={dueSoon.map(t=>`${fmtDate(t.due)} • ${t.title}`).join(" · ") || ""}/>
      </div>
      <div className="card p-4 mt-4 flex flex-wrap gap-2">
        <button className="btn-secondary" onClick={exportAllICS}>Export all deadlines (.ics)</button>
        <button className="btn-secondary" onClick={exportTasksCSV}>Export tasks (CSV)</button>
        <button className="btn-secondary" onClick={exportVisitsCSV}>Export visits (CSV)</button>
        <button className="btn-secondary" onClick={exportJSON}>Export JSON (backup)</button>
        <label className="btn">
          Import JSON
          <input type="file" accept="application/json" className="hidden" onChange={e=>{ const f=e.target.files?.[0]; if(f) importJSON(f); }} />
        </label>
        <button className="btn" onClick={clearAll}>Reset</button>
      </div>

      <div className="card p-4 mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <input className="border rounded-2xl px-3 py-2" placeholder="Search tasks..." value={q} onChange={e=>setQ(e.target.value)} />
        <select className="border rounded-2xl px-3 py-2" value={catFilter} onChange={e=>setCatFilter(e.target.value as "All" | Category)}>
          <option>All</option>
          {CATS.map(c => <option key={c}>{c}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <button className={`btn ${view==="Month" ? "btn-primary" : "btn-secondary"} w-full`} onClick={()=>setView("Month")}>View by Month</button>
          <button className={`btn ${view==="Status" ? "btn-primary" : "btn-secondary"} w-full`} onClick={()=>setView("Status")}>View by Status</button>
        </div>
        <WeeklyPlan dueSoon={dueSoon}/>
      </div>

      <div className="card p-6 mt-6">
        <h2 className="text-xl font-bold">Add a custom task</h2>
        <AddTask onAdd={addTask} />
      </div>

      <div className="mt-6">
        {view === "Month" ? (
          <div className="space-y-6">
            {MONTHS.map(m => (
              <section key={m}>
                <h3 className="text-lg font-bold">{m}</h3>
                <div className="mt-2 space-y-3">
                  {filtered.filter(t => t.month===m).length===0 && <div className="text-sm text-slate-500">No tasks yet.</div>}
                  {filtered.filter(t => t.month===m).map(t => (
                    <TaskRow key={t.id} t={t} onUpdate={updateTask} onDelete={removeTask} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {(["todo","doing","done"] as const).map(s => (
              <section key={s}>
                <h3 className="text-lg font-bold capitalize">{s.replace("doing","in progress")}</h3>
                <div className="mt-2 space-y-3">
                  {filtered.filter(t => t.status===s).length===0 && <div className="text-sm text-slate-500">No tasks in this column.</div>}
                  {filtered.filter(t => t.status===s).map(t => (
                    <TaskRow key={t.id} t={t} onUpdate={updateTask} onDelete={removeTask} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <div className="card p-6 mt-8">
        <h2 className="text-xl font-bold">Document kit</h2>
        <p className="text-slate-700 text-sm">Keep these ready—most apps/aid require them.</p>
        <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-3 text-sm">
          {([
            ["idCard","Government ID (license/permit)"],
            ["ssnReady","Social Security # ready / A-Number"],
            ["fsaId","FSA ID created (student + parent)"],
            ["taxDocs","Tax/W-2/untaxed income info"],
            ["transcript","Transcript (official/unofficial)"],
            ["testScores","SAT/ACT score report"],
            ["resume","Academic résumé"],
            ["activitiesList","Activities & honors list"],
            ["essays","Essays and short answers"],
            ["recLetters","Recommendation letters"],
            ["portfolio","Portfolio (if major requires)"],
          ] as const).map(([k,label]) => (
            <label key={k} className="flex items-center gap-2">
              <input type="checkbox" checked={docs[k as keyof DocKit]} onChange={e=>setDocs((d)=>({ ...d, [k]: e.target.checked }))} />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="card p-6 mt-6">
        <h2 className="text-xl font-bold">Recommenders</h2>
        <AddRecommender onAdd={(r)=>setRecs(prev=>[{...r, id: uid()}, ...prev])}/>
        <div className="mt-4 space-y-3">
          {recs.length===0 && <div className="text-sm text-slate-500">No recommenders yet.</div>}
          {recs.map(r => (
            <div key={r.id} className="card p-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="font-semibold">{r.name}{r.role ? ` — ${r.role}` : ""}</div>
                  <div className="text-sm text-slate-600 flex flex-wrap gap-3 mt-1">
                    {r.email && <a className="text-brand-700 underline" href={`mailto:${encodeURIComponent(r.email)}?subject=Recommendation%20Request&body=Hi%20${encodeURIComponent(r.name)},%0D%0A%0D%0AThanks%20for%20supporting%20my%20application.%20Here%20are%20deadlines%20and%20details...`}>Email</a>}
                    {r.requested && <span>Requested: <b>{fmtDate(r.requested)}</b></span>}
                    {r.submitted && <span>Submitted: <b>{fmtDate(r.submitted)}</b></span>}
                  </div>
                  {r.notes && <div className="text-sm text-slate-700 mt-1">{r.notes}</div>}
                </div>
                <div className="flex gap-2">
                  <button className="btn" onClick={()=>{
                    const submitted = prompt("Enter submitted date (YYYY-MM-DD):", todayISO()) || "";
                    setRecs(prev => prev.map(x => x.id===r.id ? {...x, submitted} : x));
                  }}>Mark submitted</button>
                  <button className="btn" onClick={()=>setRecs(prev=>prev.filter(x=>x.id!==r.id))}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-6 mt-6">
        <h2 className="text-xl font-bold">Visit log</h2>
        <AddVisit onAdd={(v)=>setVisits(prev=>[{...v, id: uid()}, ...prev])}/>
        <div className="mt-4 space-y-3">
          {visits.length===0 && <div className="text-sm text-slate-500">No visits yet.</div>}
          {visits.map(v => (
            <div key={v.id} className="card p-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="font-semibold">{v.name}</div>
                  <div className="text-sm text-slate-600 flex flex-wrap gap-3 mt-1">
                    <span>Date: <b>{fmtDate(v.date)}</b></span>
                    {v.rating!=null && <span>Rating: <b>{v.rating}/5</b></span>}
                  </div>
                  {v.notes && <div className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{v.notes}</div>}
                </div>
                <div className="flex gap-2">
                  <button className="btn" onClick={()=>setVisits(prev=>prev.filter(x=>x.id!==v.id))}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-8 text-xs text-slate-500">Tip: Share exports with parents/counselors. Double-check dates on official sites.</p>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string|number; note?: string }){
  return (
    <div className="card p-4">
      <div className="text-sm text-slate-600">{label}</div>
      <div className="text-2xl font-black mt-1">{value}</div>
      {note && <div className="text-xs text-slate-500 mt-1 line-clamp-2">{note}</div>}
    </div>
  );
}

function AddTask({ onAdd }: { onAdd: (t: Omit<Task,"id">)=>void }){
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("Applications");
  const [status, setStatus] = useState<Status>("todo");
  const [month, setMonth] = useState<string>("Aug–Sep");
  const [due, setDue] = useState<string>("");
  const [notes, setNotes] = useState("");

  function submit(e: React.FormEvent){
    e.preventDefault();
    if (!title.trim()) return alert("Add a title");
    onAdd({ title: title.trim(), category, status, month, due: due || undefined, notes: notes.trim() || undefined, pinned: false });
    setTitle(""); setNotes("");
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <div className="grid md:grid-cols-4 gap-3">
        <input className="border rounded-2xl px-3 py-2 w-full" placeholder="Task title" value={title} onChange={e=>setTitle(e.target.value)} />
        <select className="border rounded-2xl px-3 py-2 w-full" value={category} onChange={e=>setCategory(e.target.value as Category)}>{CATS.map(c=>
          <option key={c}>{c}</option>
        )}</select>
        <select className="border rounded-2xl px-3 py-2 w-full" value={month} onChange={e=>setMonth(e.target.value)}>{MONTHS.map(m=>
          <option key={m}>{m}</option>
        )}</select>
        <input type="date" className="border rounded-2xl px-3 py-2 w-full" value={due} onChange={e=>setDue(e.target.value)} />
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <select className="border rounded-2xl px-3 py-2 w-full" value={status} onChange={e=>setStatus(e.target.value as Status)}>
          <option value="todo">To do</option>
          <option value="doing">In progress</option>
          <option value="done">Done</option>
        </select>
        <input className="border rounded-2xl px-3 py-2 w-full" placeholder="Notes (optional)" value={notes} onChange={e=>setNotes(e.target.value)} />
      </div>
      <div><button className="btn-primary" type="submit">Add task</button></div>
    </form>
  );
}

function TaskRow({ t, onUpdate, onDelete }:{ t: Task; onUpdate: (id:string,patch:Partial<Task>)=>void; onDelete:(id:string)=>void }){
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="font-semibold">{t.title}</div>
          <div className="text-sm text-slate-600 flex flex-wrap gap-3 mt-1">
            <span>{t.category}</span>
            <span>Month: <b>{t.month}</b></span>
            <span>Due: <b>{fmtDate(t.due)}</b>{t.due ? ` (${daysUntil(t.due)}d)` : ""}</span>
            {t.notes && <span className="truncate max-w-[32ch]">Notes: {t.notes}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <select className="border rounded-2xl px-2 py-1 text-sm" value={t.status} onChange={e=>onUpdate(t.id,{ status: e.target.value as Status })}>
            <option value="todo">To do</option>
            <option value="doing">In progress</option>
            <option value="done">Done</option>
          </select>
          <button className="btn" onClick={()=>{
            const n = prompt("Edit notes", t.notes || "") ?? "";
            onUpdate(t.id, { notes: n || undefined });
          }}>Notes</button>
          <button className="btn" onClick={()=>{
            const d = prompt("Edit due date (YYYY-MM-DD)", t.due || "") ?? "";
            onUpdate(t.id, { due: d || undefined });
          }}>Due</button>
          <button className="btn" onClick={()=>onDelete(t.id)}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function WeeklyPlan({ dueSoon }: { dueSoon: Task[] }){
  const body = dueSoon.map(t => `• ${fmtDate(t.due)} — ${t.title}`).join("%0D%0A");
  return (
    <div className="flex gap-2">
      <a className="btn w-full" href={`mailto:?subject=This%20Week%20Plan&body=${body}`} title="Email this week to parent/counselor">Email this week</a>
      <button className="btn w-full" onClick={()=>{
        const text = decodeURIComponent(body.replace(/%0D%0A/g,"\n"));
        if (navigator.clipboard) {
          navigator.clipboard.writeText(text);
          alert("Copied this week's plan to clipboard!");
        } else {
          alert("Clipboard not available");
        }
      }}>Copy week</button>
    </div>
  );
}

function AddRecommender({ onAdd }:{ onAdd:(r:Omit<Recommender,"id">)=>void }){
  const [name,setName] = useState(""); const [email,setEmail] = useState(""); const [role,setRole] = useState("Teacher");
  const [requested,setRequested] = useState(""); const [notes,setNotes] = useState("");
  function submit(e: React.FormEvent){ e.preventDefault(); if(!name.trim()) return alert("Name required"); onAdd({ name: name.trim(), email: email.trim()||undefined, role, requested: requested||undefined, notes: notes.trim()||undefined }); setName(""); setEmail(""); setRequested(""); setNotes(""); }
  return (
    <form onSubmit={submit} className="grid md:grid-cols-5 gap-3 mt-2">
      <input className="border rounded-2xl px-3 py-2" placeholder="Name" value={name} onChange={e=>setName(e.target.value)} />
      <input className="border rounded-2xl px-3 py-2" placeholder="Email (optional)" value={email} onChange={e=>setEmail(e.target.value)} />
      <select className="border rounded-2xl px-3 py-2" value={role} onChange={e=>setRole(e.target.value)}><option>Teacher</option><option>Counselor</option><option>Coach</option><option>Employer</option></select>
      <input type="date" className="border rounded-2xl px-3 py-2" value={requested} onChange={e=>setRequested(e.target.value)} />
      <input className="border rounded-2xl px-3 py-2" placeholder="Notes" value={notes} onChange={e=>setNotes(e.target.value)} />
      <div className="md:col-span-5"><button className="btn-primary" type="submit">Add recommender</button></div>
    </form>
  );
}

function AddVisit({ onAdd }:{ onAdd:(v:Omit<Visit,"id">)=>void }){
  const [name,setName] = useState(""); const [date,setDate] = useState(""); const [rating,setRating] = useState<number|"" >(""); const [notes,setNotes] = useState("");
  function submit(e: React.FormEvent){ e.preventDefault(); if(!name.trim()) return alert("School/Program required"); onAdd({ name: name.trim(), date: date||undefined, rating: rating===""?undefined:Number(rating), notes: notes.trim()||undefined }); setName(""); setDate(""); setRating(""); setNotes(""); }
  return (
    <form onSubmit={submit} className="grid md:grid-cols-5 gap-3 mt-2">
      <input className="border rounded-2xl px-3 py-2" placeholder="School / Program" value={name} onChange={e=>setName(e.target.value)} />
      <input type="date" className="border rounded-2xl px-3 py-2" value={date} onChange={e=>setDate(e.target.value)} />
      <input className="border rounded-2xl px-3 py-2" placeholder="Rating 1–5" value={rating} onChange={e=>setRating(e.target.value === "" ? "" : Number(e.target.value))} inputMode="numeric" />
      <input className="border rounded-2xl px-3 py-2 md:col-span-2" placeholder="Notes" value={notes} onChange={e=>setNotes(e.target.value)} />
      <div className="md:col-span-5"><button className="btn-primary" type="submit">Add visit</button></div>
    </form>
  );
}
