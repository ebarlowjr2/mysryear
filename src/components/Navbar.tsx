import React from "react";
import Link from "next/link";
import Logo from "./Logo";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const links = [
  { href: "/planner", label: "Planner" },
  { href: "/open-dashboard/applications", label: "Applications" },
  { href: "/scholarships", label: "Scholarships" },
  { href: "/resources", label: "Resources" },
];

export default async function Navbar() {
  const cookieStore = await cookies();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur border-b border-slate-200">
      <div className="container-prose flex h-16 items-center justify-between">
        <Link href="/" aria-label="My SR Year Home">
          <Logo />
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          {links.map(l => (
            <Link key={l.href} href={l.href} className="text-sm font-medium hover:text-brand-700">{l.label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="btn-secondary">Dashboard</Link>
          <Link href="/open-dashboard" className="btn-primary">Open Dashboard</Link>
          {user ? (
            <form action="/api/auth/signout" method="post">
              <button type="submit" className="btn-secondary">
                Sign Out
              </button>
            </form>
          ) : (
            <Link href="/login" className="btn-secondary">
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
