'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Check, Printer, Search, X } from 'lucide-react'
import {
  COLLEGE_GUIDES,
  GUIDE_AUDIENCE_LABELS,
  GUIDE_CATEGORIES,
  GUIDE_STAGE_LABELS,
  GUIDE_STAGE_ORDER,
  GUIDE_TIMING_LABELS,
  filterGuides,
  getGuideCategory,
  startHereForStage,
  type CollegeGuide,
  type GuideAudience,
  type GuideCategorySlug,
  type GuideStage,
  type GuideTiming,
} from '@mysryear/shared'
import { useReviewedGuides } from './useReviewedGuides'

type ExplorerState = {
  query: string
  audience: GuideAudience | ''
  stage: GuideStage | ''
  category: GuideCategorySlug | ''
  timing: GuideTiming | ''
}

const EMPTY: ExplorerState = { query: '', audience: '', stage: '', category: '', timing: '' }

const AUDIENCES: GuideAudience[] = ['student', 'family']
const TIMINGS: GuideTiming[] = ['ongoing', 'early', 'junior', 'senior', 'after-decision']

function parseState(search: string): ExplorerState {
  const params = new URLSearchParams(search)
  const audience = params.get('audience')
  const stage = params.get('stage')
  const category = params.get('category')
  const timing = params.get('timing')
  return {
    query: params.get('q') ?? '',
    audience: audience === 'student' || audience === 'family' ? audience : '',
    stage: (GUIDE_STAGE_ORDER as string[]).includes(stage ?? '') ? (stage as GuideStage) : '',
    category: GUIDE_CATEGORIES.some((c) => c.slug === category) ? (category as GuideCategorySlug) : '',
    timing: (TIMINGS as string[]).includes(timing ?? '') ? (timing as GuideTiming) : '',
  }
}

function toQueryString(state: ExplorerState): string {
  const params = new URLSearchParams()
  if (state.query) params.set('q', state.query)
  if (state.audience) params.set('audience', state.audience)
  if (state.stage) params.set('stage', state.stage)
  if (state.category) params.set('category', state.category)
  if (state.timing) params.set('timing', state.timing)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

function GuideCard({ guide, reviewed }: { guide: CollegeGuide; reviewed: boolean }) {
  const category = getGuideCategory(guide.category)
  return (
    <li>
      <Link
        href={`/resources/${guide.slug}`}
        className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-soft transition hover:border-brand-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-wide text-brand-700">
            {category?.title}
          </span>
          <span className="flex items-center gap-1 text-xs font-semibold text-slate-400">
            {reviewed && <Check className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />}
            <span aria-hidden="true">#{guide.number}</span>
          </span>
        </div>
        <h3 className="mt-2 text-lg font-bold leading-snug text-slate-950 group-hover:text-brand-700">
          {guide.title}
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{guide.shortSummary}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {guide.gradesOrStages.map((stage) => (
            <span
              key={stage}
              className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600"
            >
              {GUIDE_STAGE_LABELS[stage]}
            </span>
          ))}
        </div>
        {reviewed && <span className="sr-only">Reviewed and saved on this device</span>}
      </Link>
    </li>
  )
}

export default function GuideExplorer() {
  const [state, setState] = useState<ExplorerState>(EMPTY)
  const { hydrated, isReviewed, reviewedCount, clearAll } = useReviewedGuides()

  // Hydrate filters from the shareable URL on mount.
  useEffect(() => {
    setState(parseState(window.location.search))
  }, [])

  // Keep the URL in sync so searches and filters are shareable.
  useEffect(() => {
    const qs = toQueryString(state)
    const next = `${window.location.pathname}${qs}`
    window.history.replaceState(null, '', next)
  }, [state])

  const update = (patch: Partial<ExplorerState>) => setState((prev) => ({ ...prev, ...patch }))

  const hasFilters = Boolean(
    state.query || state.audience || state.stage || state.category || state.timing,
  )

  const results = useMemo(
    () =>
      filterGuides({
        query: state.query || undefined,
        audience: state.audience || undefined,
        stage: state.stage || undefined,
        category: state.category || undefined,
        timing: state.timing || undefined,
      }),
    [state],
  )

  const startHere = state.stage ? startHereForStage(state.stage) : []

  return (
    <section aria-labelledby="explorer-heading" className="mt-10">
      <h2 id="explorer-heading" className="sr-only">
        Search and browse college readiness guides
      </h2>

      {/* Search */}
      <div className="no-print rounded-3xl border border-slate-200 bg-slate-50/70 p-5 sm:p-6">
        <label htmlFor="guide-search" className="block text-sm font-bold text-slate-800">
          What do you need help with?
        </label>
        <div className="relative mt-2">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            id="guide-search"
            type="search"
            value={state.query}
            onChange={(event) => update({ query: event.target.value })}
            placeholder="Try “FAFSA,” “net price,” “essays,” or “apprenticeships”"
            className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-12 pr-4 text-base text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>

        {/* Audience */}
        <div className="mt-5" role="group" aria-label="Choose a perspective">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">I am a</span>
          <div className="mt-2 flex flex-wrap gap-2">
            <FilterChip active={state.audience === ''} onClick={() => update({ audience: '' })}>
              Everyone
            </FilterChip>
            {AUDIENCES.map((audience) => (
              <FilterChip
                key={audience}
                active={state.audience === audience}
                onClick={() => update({ audience })}
              >
                {GUIDE_AUDIENCE_LABELS[audience]}
              </FilterChip>
            ))}
          </div>
        </div>

        {/* Stage */}
        <div className="mt-4" role="group" aria-label="Choose a grade or stage">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Grade or stage
          </span>
          <div className="mt-2 flex flex-wrap gap-2">
            <FilterChip active={state.stage === ''} onClick={() => update({ stage: '' })}>
              Any
            </FilterChip>
            {GUIDE_STAGE_ORDER.map((stage) => (
              <FilterChip
                key={stage}
                active={state.stage === stage}
                onClick={() => update({ stage })}
              >
                {GUIDE_STAGE_LABELS[stage]}
              </FilterChip>
            ))}
          </div>
        </div>

        {/* Category + timing selects */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Guide collection
            </span>
            <select
              value={state.category}
              onChange={(event) => update({ category: event.target.value as GuideCategorySlug | '' })}
              className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            >
              <option value="">All collections</option>
              {GUIDE_CATEGORIES.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.number}. {category.title}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Timing</span>
            <select
              value={state.timing}
              onChange={(event) => update({ timing: event.target.value as GuideTiming | '' })}
              className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            >
              <option value="">Any timing</option>
              {TIMINGS.map((timing) => (
                <option key={timing} value={timing}>
                  {GUIDE_TIMING_LABELS[timing]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {hasFilters && (
            <button
              type="button"
              onClick={() => setState(EMPTY)}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-700"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Clear filters
            </button>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-700"
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            Print this checklist
          </button>
          {hydrated && reviewedCount > 0 && (
            <span className="inline-flex items-center gap-2 text-sm text-slate-600">
              <Check className="h-4 w-4 text-brand-600" aria-hidden="true" />
              {reviewedCount} saved on this device
              <button
                type="button"
                onClick={clearAll}
                className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
              >
                Clear progress
              </button>
            </span>
          )}
        </div>
      </div>

      {/* Start Here path */}
      {startHere.length > 0 && (
        <div className="mt-8 rounded-3xl border border-brand-100 bg-brand-50/60 p-5 sm:p-6">
          <h3 className="text-base font-black tracking-tight text-brand-900">
            Start here · {GUIDE_STAGE_LABELS[state.stage as GuideStage]}
          </h3>
          <ol className="mt-3 grid gap-2 sm:grid-cols-2">
            {startHere.map((guide) => (
              <li key={guide.slug}>
                <Link
                  href={`/resources/${guide.slug}`}
                  className="flex items-start gap-3 rounded-xl px-3 py-2 transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-black text-white">
                    {guide.number}
                  </span>
                  <span className="text-sm font-semibold text-slate-800">{guide.title}</span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Result count (screen-reader live region) */}
      <p className="sr-only" role="status" aria-live="polite">
        {results.length} {results.length === 1 ? 'guide' : 'guides'} match your search and filters.
      </p>

      {/* Results or expandable category index */}
      {hasFilters ? (
        <div className="mt-8">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
              {results.length} {results.length === 1 ? 'guide' : 'guides'}
            </h3>
          </div>
          {results.length > 0 ? (
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((guide) => (
                <GuideCard key={guide.slug} guide={guide} reviewed={hydrated && isReviewed(guide.slug)} />
              ))}
            </ul>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <p className="text-base font-semibold text-slate-800">No guides match those filters yet.</p>
              <p className="mt-1 text-sm text-slate-600">
                Try fewer filters or a different search term.
              </p>
              <button
                type="button"
                onClick={() => setState(EMPTY)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                Reset and browse all 100 guides
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Browse all 100 guides by collection
          </h3>
          {GUIDE_CATEGORIES.map((category) => {
            const items = COLLEGE_GUIDES.filter((guide) => guide.category === category.slug)
            return (
              <details key={category.slug} className="group rounded-2xl border border-slate-200 bg-white">
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4">
                  <span>
                    <span className="text-xs font-bold uppercase tracking-wide text-brand-700">
                      Collection {category.number}
                    </span>
                    <span className="block text-base font-bold text-slate-950">{category.title}</span>
                  </span>
                  <span className="text-sm font-semibold text-slate-400 transition group-open:rotate-180">
                    ⌄
                  </span>
                </summary>
                <ol className="border-t border-slate-100 px-2 pb-3 pt-1">
                  {items.map((guide) => (
                    <li key={guide.slug}>
                      <Link
                        href={`/resources/${guide.slug}`}
                        className="flex items-start gap-3 rounded-xl px-3 py-2 text-sm transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                      >
                        <span className="w-7 shrink-0 font-black text-slate-400">{guide.number}</span>
                        <span className="font-semibold text-slate-800">{guide.title}</span>
                        {hydrated && isReviewed(guide.slug) && (
                          <Check className="ml-auto mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                        )}
                      </Link>
                    </li>
                  ))}
                </ol>
              </details>
            )
          })}
        </div>
      )}
    </section>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? 'rounded-full border border-brand-600 bg-brand-600 px-3.5 py-1.5 text-sm font-semibold text-white transition'
          : 'rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-700'
      }
    >
      {children}
    </button>
  )
}
