/**
 * RoutinePage — Daily Routine top-level page.
 * Tabs: Today / All. Streaks shown inline on rows.
 */

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import { useReminders } from '@/lib/hooks/useReminders'
import { useTodayCompletions } from '@/lib/hooks/useTodayCompletions'
import { TodayTab } from './TodayTab'
import { AllTab } from './AllTab'
import { ReminderModal } from './ReminderModal'
import type { Reminder } from '@/lib/types/database'
import type { useToast } from '@/components/ui/Toast'

type Tab = 'today' | 'all'

interface RoutinePageProps {
  userId: string
  addToast: ReturnType<typeof useToast>['addToast']
}

export function RoutinePage({ userId, addToast }: RoutinePageProps) {
  const [tab, setTab] = useState<Tab>('today')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Reminder | null>(null)

  const { reminders, loading, error } = useReminders()
  const today = useTodayCompletions()

  const openCreate = () => { setEditing(null); setModalOpen(true) }
  const openEdit = (r: Reminder) => { setEditing(r); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditing(null) }

  return (
    <>
      <header className="h-[60px] flex items-center gap-3 px-6 bg-pitch-900 border-b border-pitch-500/30 z-10 shrink-0">
        <h1 className="font-display font-600 text-pitch-50 text-[18px] tracking-tight">
          Daily Routine
        </h1>

        <div className="ml-6 flex items-center gap-1 p-1 rounded-lg bg-pitch-800/60 border border-pitch-500/20">
          <TabButton label="Today" active={tab === 'today'} onClick={() => setTab('today')} />
          <TabButton label="All" active={tab === 'all'} onClick={() => setTab('all')} />
        </div>

        <div className="flex-1" />

        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 h-8 px-3 bg-volt-500 hover:bg-volt-400 active:bg-volt-600 text-pitch-950 font-sans font-600 text-[13px] rounded-lg transition-colors duration-150 shadow-volt"
        >
          <Plus size={14} strokeWidth={2.5} />
          New
        </button>
      </header>

      <main className="flex-1 overflow-auto px-6 py-6">
        {error && (
          <div className="max-w-2xl mx-auto p-4 rounded-lg bg-red-950/40 border border-red-500/30 text-red-300 text-sm">
            Could not load reminders. {error.message}
          </div>
        )}

        {loading && !reminders.length && (
          <div className="text-pitch-400 text-sm text-center py-12">Loading…</div>
        )}

        {!loading && tab === 'today' && (
          <TodayTab
            reminders={reminders}
            today={today}
            userId={userId}
            onEdit={openEdit}
            onError={(msg) => addToast({ type: 'error', message: msg })}
            onCreateFirst={openCreate}
          />
        )}
        {!loading && tab === 'all' && (
          <AllTab
            reminders={reminders}
            today={today}
            onEdit={openEdit}
            onError={(msg) => addToast({ type: 'error', message: msg })}
            onCreateFirst={openCreate}
          />
        )}
      </main>

      <Modal isOpen={modalOpen} onClose={closeModal} title={editing ? 'Edit reminder' : 'New reminder'}>
        <ReminderModal
          editing={editing}
          onClose={closeModal}
          onError={(msg) => addToast({ type: 'error', message: msg })}
        />
      </Modal>
    </>
  )
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1 rounded-md text-[13px] font-sans font-500 transition-colors duration-150',
        active ? 'bg-pitch-700 text-pitch-50' : 'text-pitch-300 hover:text-pitch-100',
      )}
    >
      {label}
    </button>
  )
}
