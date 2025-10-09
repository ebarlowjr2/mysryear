"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import Logo from "./Logo";
import { usePathname } from "next/navigation";
import { cn } from "../lib/utils";
import { createClient } from "../lib/supabase";
import type { User } from "@supabase/supabase-js";

const links = [
  { href: "/planner", label: "Planner" },
  { href: "/open-dashboard/applications", label: "Applications" },
  { href: "/scholarships", label: "Scholarships" },
  { href: "/resources", label: "Resources" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const supabase = createClient();
    
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);
  
  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      
      await fetch('/api/auth/signout', {
        method: 'POST',
      });
      
      await supabase.auth.signOut();
      
      window.location.href = '/login';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur border-b border-slate-200">
      <div className="container-prose flex h-16 items-center justify-between">
        <Link href="/" aria-label="My SR Year Home">
          <Logo />
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          {links.map(l => (
            <Link key={l.href} href={l.href} className={cn("text-sm font-medium hover:text-brand-700", pathname === l.href && "text-brand-700")}>{l.label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="btn-secondary">Dashboard</Link>
          <Link href="/open-dashboard" className="btn-primary">Open Dashboard</Link>
          {!loading && (
            user ? (
              <button 
                onClick={handleSignOut}
                className="btn-secondary"
              >
                Sign Out
              </button>
            ) : (
              <Link href="/login" className="btn-secondary">
                Sign In
              </Link>
            )
          )}
        </div>
      </div>
    </header>
  );
}
