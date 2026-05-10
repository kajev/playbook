/**
 * components/layout/Sidebar.tsx — Left nav.
 * Push 7.5: adds Sign out button at the bottom (under user indicator)
 * and an "Update available" pill that appears when the SW reports one.
 */

import { useEffect, useState } from 'react'
import { LayoutGrid, Zap, CalendarCheck, Users, LogOut, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOutCompletely } from '@/lib/supabase/auth'
import type { AppPage } from './AppLayout'

interface SidebarProps {
  userId: string
  page: AppPage
  onNavigate: (page: AppPage) => void
}

export function Sidebar({ userId, page, onNavigate }: SidebarProps) {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    const handler = () => setUpdateAvailable(true)
    window.addEventListener('playbook:update-available', handler)
    return () => window.removeEventListener('playbook:update-available', handler)
  }, [])

  const handleApplyUpdate = async () => {
    if (!('serviceWorker' in navigator)) { window.location.reload(); return }
    const reg = await navigator.serviceWorker.getRegistration()
    if (reg?.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' })
      // controllerchange listener in main.tsx will reload the page.
    } else {
      window.location.reload()
    }
  }

  const handleSignOut = async () => {
    if (signingOut) return
    if (!confirm('Sign out? Your local data will be cleared and a new guest session will start.')) return
    setSigningOut(true)
    try {
      await signOutCompletely()
    } catch {
      setSigningOut(false)
    }
  }

  return (
    <aside className="w-[200px] shrink-0 flex flex-col bg-pitch-900 border-r border-pitch-500/30">
      <div className="h-[60px] flex items-center gap-2.5 px-5 border-b border-pitch-500/30">
        <div className="w-7 h-7 rounded-lg bg-volt-500/10 flex items-center justify-center">
          <Zap size={14} className="text-volt-500 fill-volt-500" />
        </div>
        <span className="font-display font-600 text-pitch-50 text-[15px] tracking-tight">
          Playbook
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        <NavItem icon={<LayoutGrid size={15} />} label="Board" active={page === 'board'} onClick={() => onNavigate('board')} />
        <NavItem icon={<CalendarCheck size={15} />} label="Daily Routine" active={page === 'routine'} onClick={() => onNavigate('routine')} />
        <NavItem icon={<Users size={15} />} label="Companions" active={page === 'companions'} onClick={() => onNavigate('companions')} />
      </nav>

      {updateAvailable && (
        <button
          onClick={handleApplyUpdate}
          className="mx-3 mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-volt-500/15 border border-volt-500/40 text-volt-300 hover:bg-volt-500/25 transition-colors duration-150"
          title="A new version is available. Click to update."
        >
          <Download size={14} />
          <span className="font-sans font-500 text-[12px]">Update available</span>
        </button>
      )}

      <div className="px-4 py-4 border-t border-pitch-500/30 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-pitch-600 flex items-center justify-center flex-shrink-0">
            <span className="font-mono text-[10px] text-pitch-200">G</span>
          </div>
          <div className="min-w-0">
            <div className="font-sans text-[11px] text-pitch-300 leading-tight">Guest session</div>
            <div className="font-mono text-[10px] text-pitch-400 truncate">#{userId.slice(0, 6)}</div>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className={cn(
            'flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors duration-150',
            'text-pitch-400 hover:text-red-400 hover:bg-pitch-800',
          )}
          title="Sign out and clear local data"
        >
          <LogOut size={13} />
          <span className="font-sans text-[12px]">{signingOut ? 'Signing out…' : 'Sign out'}</span>
        </button>
      </div>
    </aside>
  )
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors duration-150',
        active
          ? 'bg-volt-500/10 border-l-2 border-volt-500 text-volt-500'
          : 'border-l-2 border-transparent text-pitch-300 hover:bg-pitch-800 hover:text-pitch-100',
      )}
    >
      <span className={active ? 'text-volt-500' : 'text-pitch-400'}>{icon}</span>
      <span className="font-sans font-500 text-[13px]">{label}</span>
    </button>
  )
}
