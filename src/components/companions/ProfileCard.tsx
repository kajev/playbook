/**
 * ProfileCard — your own profile (display name). Inline edit.
 */

import { useState, useEffect } from 'react'
import { Check, Pencil, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { updateMyProfile } from '@/lib/supabase/profiles'
import type { Profile } from '@/lib/types/database'

interface ProfileCardProps {
  profile: Profile | null
  userId: string
  onSaved: () => void
  onError: (msg: string) => void
  onSuccess: (msg: string) => void
}

export function ProfileCard({ profile, userId, onSaved, onError, onSuccess }: ProfileCardProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setValue(profile?.display_name ?? '')
  }, [profile])

  const initials = (profile?.display_name ?? '').trim().slice(0, 2).toUpperCase()
    || userId.slice(0, 2).toUpperCase()

  const handleSave = async () => {
    if (saving) return
    const next = value.trim()
    if (next === (profile?.display_name ?? '')) { setEditing(false); return }
    setSaving(true)
    try {
      await updateMyProfile({ display_name: next || null })
      onSuccess(next ? 'Name saved.' : 'Name cleared.')
      onSaved()
      setEditing(false)
    } catch {
      onError('Could not save name.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <h2 className="font-display font-600 text-pitch-300 text-[12px] uppercase tracking-wider mb-2">
        Your profile
      </h2>
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-pitch-800/60 border border-pitch-500/20">
        <div className="w-9 h-9 rounded-full bg-pitch-700 flex items-center justify-center shrink-0">
          <span className="font-mono text-[12px] text-pitch-200">{initials}</span>
        </div>

        {editing ? (
          <>
            <input
              autoFocus
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSave()
                if (e.key === 'Escape') { setEditing(false); setValue(profile?.display_name ?? '') }
              }}
              maxLength={64}
              placeholder="Your display name"
              className="flex-1 h-8 px-3 bg-pitch-800 border border-pitch-500/40 rounded-lg font-sans text-[14px] text-pitch-100 placeholder:text-pitch-400 focus:outline-none focus:border-volt-500/60"
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className={cn(
                'h-7 w-7 rounded-md flex items-center justify-center shrink-0 transition-colors duration-150',
                'bg-volt-500 text-pitch-950 hover:bg-volt-400',
              )}
              title="Save"
            >
              <Check size={14} strokeWidth={3} />
            </button>
            <button
              onClick={() => { setEditing(false); setValue(profile?.display_name ?? '') }}
              disabled={saving}
              className="h-7 w-7 rounded-md text-pitch-400 hover:text-pitch-100 hover:bg-pitch-700 flex items-center justify-center shrink-0"
              title="Cancel"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <>
            <div className="flex-1 min-w-0">
              <div className="font-sans text-[14px] text-pitch-100 truncate">
                {profile?.display_name?.trim() || 'No display name yet'}
              </div>
              <div className="font-mono text-[11px] text-pitch-400 truncate">
                #{userId.slice(0, 6)}
              </div>
            </div>
            <button
              onClick={() => setEditing(true)}
              className="h-7 px-2 rounded-md text-pitch-300 hover:text-pitch-100 hover:bg-pitch-700 flex items-center gap-1 shrink-0 font-sans text-[12px]"
              title="Edit name"
            >
              <Pencil size={12} />
              edit
            </button>
          </>
        )}
      </div>
    </section>
  )
}
