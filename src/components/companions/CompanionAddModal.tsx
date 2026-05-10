/**
 * CompanionAddModal — generate an invite code OR enter one.
 */

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { sendInvite, acceptInvite } from '@/lib/supabase/connections'

interface CompanionAddModalProps {
  onClose: () => void
  onError: (msg: string) => void
  onSuccess: (msg: string) => void
}

type Mode = 'choose' | 'generate' | 'enter'

export function CompanionAddModal({ onClose, onError, onSuccess }: CompanionAddModalProps) {
  const [mode, setMode] = useState<Mode>('choose')
  const [generatedCode, setGeneratedCode] = useState('')
  const [enterValue, setEnterValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    if (busy) return
    setBusy(true)
    try {
      const invite = await sendInvite({ ttlHours: 168 })
      setGeneratedCode(invite.invite_code ?? '')
      setMode('generate')
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not create invite.')
    } finally {
      setBusy(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      onError('Could not copy.')
    }
  }

  const handleEnter = async () => {
    if (busy) return
    const code = enterValue.trim().toUpperCase()
    if (code.length !== 6) { onError('Code should be 6 characters.'); return }
    setBusy(true)
    try {
      await acceptInvite(code)
      onSuccess('Connected!')
      onClose()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Invalid or expired code.')
    } finally {
      setBusy(false)
    }
  }

  if (mode === 'choose') {
    return (
      <div className="flex flex-col gap-3 min-w-[400px]">
        <button
          onClick={handleGenerate}
          disabled={busy}
          className={cn(
            'flex flex-col items-start p-4 rounded-lg border text-left transition-colors duration-150',
            'bg-pitch-800/60 border-pitch-500/30 hover:bg-pitch-800 hover:border-volt-500/40',
          )}
        >
          <div className="font-sans font-600 text-[14px] text-pitch-100 mb-1">
            Send an invite
          </div>
          <div className="font-sans text-[12px] text-pitch-400">
            Generate a 6-character code to share. Expires in 7 days.
          </div>
        </button>

        <button
          onClick={() => setMode('enter')}
          className={cn(
            'flex flex-col items-start p-4 rounded-lg border text-left transition-colors duration-150',
            'bg-pitch-800/60 border-pitch-500/30 hover:bg-pitch-800 hover:border-volt-500/40',
          )}
        >
          <div className="font-sans font-600 text-[14px] text-pitch-100 mb-1">
            Enter a code
          </div>
          <div className="font-sans text-[12px] text-pitch-400">
            Got a code from someone? Type it in to connect.
          </div>
        </button>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="h-8 px-3 rounded-lg font-sans text-[13px] text-pitch-300 hover:text-pitch-100 hover:bg-pitch-800"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  if (mode === 'generate') {
    return (
      <div className="flex flex-col gap-4 min-w-[400px]">
        <div className="text-center py-4">
          <div className="font-sans text-[13px] text-pitch-300 mb-2">Share this code:</div>
          <div className="font-mono text-[36px] font-600 text-volt-500 tracking-[0.3em] mb-3">
            {generatedCode}
          </div>
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-pitch-800 hover:bg-pitch-700 text-pitch-100 font-sans text-[13px]"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copied' : 'Copy code'}
          </button>
        </div>
        <div className="text-pitch-400 text-[11px] font-sans text-center">
          Code expires in 7 days. The other person enters it under "Enter a code".
        </div>
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="h-8 px-3 rounded-lg font-sans text-[13px] text-pitch-300 hover:text-pitch-100 hover:bg-pitch-800"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 min-w-[400px]">
      <div>
        <label className="block font-sans text-[12px] text-pitch-300 mb-1">
          Enter the 6-character code
        </label>
        <input
          autoFocus
          value={enterValue}
          onChange={e => setEnterValue(e.target.value.toUpperCase())}
          maxLength={6}
          placeholder="ABC123"
          className="w-full h-12 px-3 bg-pitch-800 border border-pitch-500/40 rounded-lg font-mono text-[24px] text-pitch-100 placeholder:text-pitch-500 tracking-[0.3em] text-center focus:outline-none focus:border-volt-500/60"
        />
      </div>

      <div className="flex justify-between pt-2">
        <button
          onClick={() => setMode('choose')}
          disabled={busy}
          className="h-8 px-3 rounded-lg font-sans text-[13px] text-pitch-300 hover:text-pitch-100 hover:bg-pitch-800"
        >
          Back
        </button>
        <button
          onClick={handleEnter}
          disabled={busy || enterValue.trim().length !== 6}
          className={cn(
            'h-8 px-4 rounded-lg font-sans font-600 text-[13px] transition-colors duration-150',
            busy || enterValue.trim().length !== 6
              ? 'bg-pitch-700 text-pitch-400 cursor-not-allowed'
              : 'bg-volt-500 hover:bg-volt-400 text-pitch-950 shadow-volt',
          )}
        >
          {busy ? 'Connecting…' : 'Connect'}
        </button>
      </div>
    </div>
  )
}
