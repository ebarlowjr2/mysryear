import React from 'react'

export default function Applications() {
  return (
    <div className="container-prose py-14">
      <h1 className="text-4xl font-black tracking-tight">Applications</h1>
      <p className="mt-3 text-slate-700 max-w-3xl">
        Track each application with status, tasks, documents, and notes. (MVP table coming soon.)
      </p>
      <div className="mt-6 card p-6">
        <div className="text-slate-500 text-sm">
          Placeholder: connect to Supabase and create tables for schools/programs, due dates, docs,
          and essay prompts.
        </div>
      </div>
    </div>
  )
}
