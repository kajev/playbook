/**
 * CompanionList - active companions with click-to-view-routine + remove action.
 * Push 7.6: click row to open companion's read-only routine.
 */

import { useState, useMemo } from 'react'
import { X, ChevronRight } from 'lucide-react'
import { removeConnection } from '@/lib/supabase/connections'
import { useProfiles } from '@/lib/hooks/useProfiles'
import type { Connection } from '@/lib/types/database'

interface CompanionListProps {
  connections: Connection[]
  selfId: string
  onSelect: (partnerId: string) => void
  onError: (msg: string) => void
  onSuccess: (msg: string) => void
}

export function CompanionList({ connections, selfId, onSelect, onError, onSuccess }: CompanionListProps) {
  const [busyId, setBusyId] = useState<string | null>(null)

  const partnerIdOf = (c: Connection) => (c.user_a === selfId ? c.user_b : c.user_a)

  const partnerIds = useMemo(
    () => Array.from(new Set(connections.map(partnerIdOf))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [connections, selfId],
  )
  const { displayName } = useProfiles(partnerIds)

  const handleRemove = async (e: React.MouseEvent, c: Connection) => {
    e.stopPropagation()
    if (busyId) return
    if (!confirm('Remove this companion? Shared reminders will stop being shared.')) return
    setBusyId(c.id)
    try {
      await removeConnection(c.id)
      onSuccess('Companion removed.')
    } catch {
      onError('Could not remove companion.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {connections.map(c => {
        const partner = partnerIdOf(c)
        const name = displayName(partner)
        const initials = name.replace(/^Companion #/, '').slice(0, 2).toUpperCase()
        return (
          <div
            key={c.id}
            onClick={() => onSelect(partner)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect(partner)
              }
            }}
            role="button"
            tabIndex={0}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-pitch-800/60 border border-pitch-500/20 hover:bg-pitch-800 hover:border-pitch-500/40 transition-colors duration-150 cursor-pointer outline-none focus-visible:border-volt-500/60"
          >
            <div className="w-8 h-8 rounded-full bg-pitch-700 flex items-center justify-center shrink-0">
              <span className="font-mono text-[11px] text-pitch-200">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-sans text-[14px] text-pitch-100 truncate">{name}</div>
              <div className="font-mono text-[11px] text-pitch-400">
                Connected {c.created_at ? new Date(c.created_at).toLocaleDateString() : ''}
              </div>
            </div>
            <ChevronRight size={14} className="text-pitch-500 shrink-0" />
            <button
              onClick={(e) => handleRemove(e, c)}
              disabled={busyId === c.id}
              className="h-7 w-7 rounded-md text-pitch-400 hover:text-red-400 hover:bg-pitch-700 flex items-center justify-center shrink-0"
              title="Remove"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
