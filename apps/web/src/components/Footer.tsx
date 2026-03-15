import React from 'react'

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-slate-200">
      <div className="container-prose py-10 text-sm text-slate-600 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} My SR Year. All rights reserved.</p>
        <div className="flex gap-4">
          <a href="/privacy" className="hover:text-brand-700">
            Privacy
          </a>
          <a href="/terms" className="hover:text-brand-700">
            Terms
          </a>
          <a href="/contact" className="hover:text-brand-700">
            Contact
          </a>
        </div>
      </div>
    </footer>
  )
}
