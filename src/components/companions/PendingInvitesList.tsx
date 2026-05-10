/**
 * PendingInvitesList — invites you've sent that haven't been accepted yet.
 */

import { useState } from 'react'
import { Copy, X, Check } from 'lucide-react'
import { cancelInvite } from '@/lib/supabase/connections'
import type { ConnectionInvite } from '@/lib/types/database'

interface PendingInvitesListProps {
  invites: ConnectionInvite[]
  onError: (msg: string) => void
  onSuccess: (msg: string) => void
}

export function PendingInvitesList({ invites, onError, onSuccess }: PendingInvitesListProps) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopy = async (invite: ConnectionInvite) => {
    if (!invite.invite_code) return
    try {
      await navigator.clipboard.writeText(invite.invite_code)
      setCopiedId(invite.id)
      setTimeout(() => setCopiedId(null), 1500)
    } catch {
      onError('Could not copy code.')
    }
  }

  const handleCancel = async (invite: ConnectionInvite) => {
    if (busyId) return
    if (!confirm('Cancel this invite?')) return
    setBusyId(invite.id)
    try {
      await cancelInvite(invite.id)
      onSuccess('Invite cancelled.')
    } catch {
      onError('Could not cancel invite.')
    } finally {
      setBusyId(null)
    }
  }

  const formatExpiry = (iso: string) => {
    const ms = new Date(iso).getTime() - Date.now()
    if (ms < 0) return 'expired'
    const hours = Math.round(ms / 3600_000)
    if (hours < 24) return `${hours}h left`
    return `${Math.round(hours / 24)}d left`
  }

  return (
    <div className="flex flex-col gap-2">
      {invites.map(invite => (
        <div
          key={invite.id}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-pitch-800/60 border border-pitch-500/20"
        >
          <div className="flex-1 min-w-0">
            <div className="font-mono text-[16px] font-600 text-pitch-100 tracking-wider">
              {invite.invite_code ?? '—'}
            </div>
            <div className="font-mono text-[11px] text-pitch-400">
              {invite.invitee_email ? `for ${invite.invitee_email} · ` : ''}{formatExpiry(invite.expires_at)}
            </div>
          </div>
          <button
            onClick={() => handleCopy(invite)}
            className="h-7 px-2 rounded-md text-pitch-300 hover:text-pitch-100 hover:bg-pitch-700 flex items-center gap-1 shrink-0"
            title="Copy code"
          >
            {copiedId === invite.id ? <Check size={13} /> : <Copy size={13} />}
            <span className="font-mono text-[11px]">
              {copiedId === invite.id ? 'copied' : 'copy'}
            </span>
          </button>
          <button
            onClick={() => handleCancel(invite)}
            disabled={busyId === invite.id}
            className="h-7 w-7 rounded-md text-pitch-400 hover:text-red-400 hover:bg-pitch-700 flex items-center justify-center shrink-0"
            title="Cancel invite"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
