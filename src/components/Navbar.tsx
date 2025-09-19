"use client";
import React from "react";
import Link from "next/link";
import Logo from "./Logo";
import { usePathname } from "next/navigation";
import { cn } from "../lib/utils";

const links = [
  { href: "/planner", label: "Planner" },
  { href: "/open-dashboard/applications", label: "Applications" },
  { href: "/scholarships", label: "Scholarships" },
  { href: "/resources", label: "Resources" },
];

export default function Navbar() {
  const pathname = usePathname();
  
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
          <Link href="/dashboard" className="btn-primary">Open Dashboard</Link>
        </div>
      </div>
    </header>
  );
}
