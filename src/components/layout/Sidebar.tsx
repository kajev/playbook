/**
 * components/layout/Sidebar.tsx — Left nav.
 * Push 6: adds Companions entry.
 */

import { LayoutGrid, Zap, CalendarCheck, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AppPage } from './AppLayout'

interface SidebarProps {
  userId: string
  page: AppPage
  onNavigate: (page: AppPage) => void
}

export function Sidebar({ userId, page, onNavigate }: SidebarProps) {
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

      <div className="px-4 py-4 border-t border-pitch-500/30">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-pitch-600 flex items-center justify-center flex-shrink-0">
            <span className="font-mono text-[10px] text-pitch-200">G</span>
          </div>
          <div className="min-w-0">
            <div className="font-sans text-[11px] text-pitch-300 leading-tight">Guest session</div>
            <div className="font-mono text-[10px] text-pitch-400 truncate">#{userId.slice(0, 6)}</div>
          </div>
        </div>
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
