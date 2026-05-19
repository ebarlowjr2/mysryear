import { ShieldCheck, UserRound } from 'lucide-react'

type LinkedRelationship = {
  user_id: string
  role: string
  created_at: string
}

type PendingInvite = {
  id: string
  invited_email: string | null
  relationship_role: string
  status: string
  created_at: string
}

function shortId(id: string) {
  if (!id) return '—'
  return `${id.slice(0, 8)}…${id.slice(-4)}`
}

function formatRole(role: string) {
  if (!role) return '—'
  return role.charAt(0).toUpperCase() + role.slice(1)
}

export default function LinkedSupporters({
  currentUserId,
  linked,
  pendingInvites,
}: {
  currentUserId: string
  linked: LinkedRelationship[]
  pendingInvites: PendingInvite[]
}) {
  return (
    <div className="card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="badge">Relationships</div>
          <h3 className="mt-2 text-lg font-black">Linked Supporters</h3>
          <p className="mt-1 text-sm text-slate-700">
            These people can access this student profile based on their role. Counselors are read/support access only.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {linked.length === 0 ? (
          <div className="text-sm text-slate-600">No linked supporters yet.</div>
        ) : (
          linked.map((r) => (
            <div
              key={`${r.user_id}:${r.role}`}
              className="flex items-center justify-between gap-3 border border-slate-200 rounded-lg p-3 bg-white"
            >
              <div className="min-w-0 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center">
                  <UserRound className="h-5 w-5 text-slate-600" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">
                    {formatRole(r.role)}
                    {r.user_id === currentUserId ? <span className="text-slate-500"> (You)</span> : null}
                  </div>
                  <div className="text-xs text-slate-600">User: {shortId(r.user_id)}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full">
                <ShieldCheck className="h-4 w-4" />
                Linked
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-6">
        <div className="text-sm font-black">Pending invites</div>
        <div className="mt-3 space-y-2">
          {pendingInvites.length === 0 ? (
            <div className="text-sm text-slate-600">No pending invites for this student profile.</div>
          ) : (
            pendingInvites.map((i) => (
              <div
                key={i.id}
                className="flex items-center justify-between gap-3 border border-slate-200 rounded-lg p-3 bg-white"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{i.invited_email || '—'}</div>
                  <div className="text-xs text-slate-600">
                    {formatRole(i.relationship_role)} • {i.status}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

