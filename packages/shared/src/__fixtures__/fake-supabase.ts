/**
 * Minimal in-memory stand-in for the Supabase query builder, covering exactly
 * the calls Scholarship Discovery makes (select/eq/neq/in/order/range/limit/
 * maybeSingle/upsert). Test-only. `failTables` simulates a provider/table
 * outage. Every query is recorded so tests can assert scoping.
 */

type Row = Record<string, unknown>

export type FakeSupabase = {
  from: (table: string) => FakeQuery
  queries: Array<{ table: string; filters: Array<[string, string, unknown]> }>
  tables: Record<string, Row[]>
}

type FakeQuery = PromiseLike<{ data: unknown; error: { message: string } | null }> & Record<string, (...args: unknown[]) => FakeQuery>

export function createFakeSupabase(tables: Record<string, Row[]>, options: { failTables?: string[] } = {}): FakeSupabase {
  const queries: FakeSupabase['queries'] = []
  const fake: FakeSupabase = {
    tables,
    queries,
    from(table: string) {
      const filters: Array<[string, string, unknown]> = []
      const orders: Array<[string, boolean]> = []
      let range: [number, number] | null = null
      let limit: number | null = null
      let single = false
      let write: { kind: 'upsert'; rows: Row[] } | null = null
      queries.push({ table, filters })

      const run = () => {
        if (options.failTables?.includes(table)) return { data: null, error: { message: `${table} unavailable` } }
        if (write) {
          const store = (tables[table] = tables[table] || [])
          for (const row of write.rows) store.push({ ...row })
          return { data: null, error: null }
        }
        let rows = [...(tables[table] || [])]
        for (const [op, col, val] of filters) {
          if (op === 'eq') rows = rows.filter((r) => r[col] === val)
          if (op === 'neq') rows = rows.filter((r) => r[col] !== val)
          if (op === 'in') rows = rows.filter((r) => (val as unknown[]).includes(r[col]))
        }
        for (const [col, asc] of [...orders].reverse()) {
          rows.sort((a, b) => {
            const av = a[col] as string | number | null
            const bv = b[col] as string | number | null
            if (av === bv) return 0
            if (av == null) return 1
            if (bv == null) return -1
            return (av < bv ? -1 : 1) * (asc ? 1 : -1)
          })
        }
        if (range) rows = rows.slice(range[0], range[1] + 1)
        if (limit != null) rows = rows.slice(0, limit)
        if (single) return { data: rows[0] ?? null, error: null }
        return { data: rows, error: null }
      }

      const q: Record<string, unknown> = {
        select: () => q,
        eq: (col: string, val: unknown) => (filters.push(['eq', col, val]), q),
        neq: (col: string, val: unknown) => (filters.push(['neq', col, val]), q),
        in: (col: string, val: unknown) => (filters.push(['in', col, val]), q),
        order: (col: string, opts?: { ascending?: boolean }) => (orders.push([col, opts?.ascending !== false]), q),
        range: (from: number, to: number) => ((range = [from, to]), q),
        limit: (n: number) => ((limit = n), q),
        maybeSingle: () => ((single = true), q),
        upsert: (rows: Row | Row[]) => ((write = { kind: 'upsert', rows: Array.isArray(rows) ? rows : [rows] }), q),
        then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => Promise.resolve(run()).then(resolve, reject),
      }
      return q as unknown as FakeQuery
    },
  }
  return fake
}
