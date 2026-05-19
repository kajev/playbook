/**
 * CompanionsPage - manage Companions (1:1 connections).
 * Push 7.6: clicking a companion opens their read-only routine view.
 */

import { useState } from 'react'
import { Plus, Users } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { useConnections } from '@/lib/hooks/useConnections'
import { useMyProfile } from '@/lib/hooks/useProfiles'
import { CompanionList } from './CompanionList'
import { PendingInvitesList } from './PendingInvitesList'
import { CompanionAddModal } from './CompanionAddModal'
import { ProfileCard } from './ProfileCard'
import { CompanionRoutinePage } from './CompanionRoutinePage'
import type { useToast } from '@/components/ui/Toast'

interface CompanionsPageProps {
  userId: string
  addToast: ReturnType<typeof useToast>['addToast']
}

export function CompanionsPage({ userId, addToast }: CompanionsPageProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedCompanion, setSelectedCompanion] = useState<string | null>(null)
  const { connections, pendingInvites, loading, error } = useConnections()
  const { profile, refetch: refetchProfile } = useMyProfile()

  const onError = (msg: string) => addToast({ type: 'error', message: msg })
  const onSuccess = (msg: string) => addToast({ type: 'success', message: msg })

  if (selectedCompanion) {
    return (
      <CompanionRoutinePage
        companionId={selectedCompanion}
        onBack={() => setSelectedCompanion(null)}
      />
    )
  }

  return (
    <>
      <header className="h-[60px] flex items-center gap-3 px-6 bg-pitch-900 border-b border-pitch-500/30 z-10 shrink-0">
        <h1 className="font-display font-600 text-pitch-50 text-[18px] tracking-tight">
          Companions
        </h1>
        <div className="flex-1" />
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 h-8 px-3 bg-volt-500 hover:bg-volt-400 active:bg-volt-600 text-pitch-950 font-sans font-600 text-[13px] rounded-lg transition-colors duration-150 shadow-volt"
        >
          <Plus size={14} strokeWidth={2.5} />
          Add
        </button>
      </header>

      <main className="flex-1 overflow-auto px-6 py-6">
        {error && (
          <div className="max-w-2xl mx-auto p-4 rounded-lg bg-red-950/40 border border-red-500/30 text-red-300 text-sm">
            Could not load companions. {error.message}
          </div>
        )}

        {loading && (
          <div className="text-pitch-400 text-sm text-center py-12">Loading...</div>
        )}

        {!loading && !error && (
          <div className="max-w-2xl mx-auto flex flex-col gap-8">
            <ProfileCard
              profile={profile}
              userId={userId}
              onSaved={refetchProfile}
              onError={onError}
              onSuccess={onSuccess}
            />

            {connections.length === 0 && pendingInvites.length === 0 && (
              <div className="text-center py-16">
                <div className="w-12 h-12 rounded-2xl bg-volt-500/10 flex items-center justify-center mx-auto mb-4">
                  <Users size={22} className="text-volt-500" />
                </div>
                <h2 className="font-display font-600 text-pitch-100 text-[18px] mb-1">No companions yet</h2>
                <p className="font-sans text-[13px] text-pitch-400 mb-5">
                  Add a companion to share reminders and send pings.
                </p>
                <button
                  onClick={() => setModalOpen(true)}
                  className="h-9 px-4 bg-volt-500 hover:bg-volt-400 text-pitch-950 font-sans font-600 text-[13px] rounded-lg shadow-volt"
                >
                  Add a companion
                </button>
              </div>
            )}

            {connections.length > 0 && (
              <section>
                <h2 className="font-display font-600 text-pitch-300 text-[12px] uppercase tracking-wider mb-2">
                  Active ({connections.length})
                </h2>
                <CompanionList
                  connections={connections}
                  selfId={userId}
                  onSelect={setSelectedCompanion}
                  onError={onError}
                  onSuccess={onSuccess}
                />
              </section>
            )}

            {pendingInvites.length > 0 && (
              <section>
                <h2 className="font-display font-600 text-pitch-300 text-[12px] uppercase tracking-wider mb-2">
                  Pending invites ({pendingInvites.length})
                </h2>
                <PendingInvitesList
                  invites={pendingInvites}
                  onError={onError}
                  onSuccess={onSuccess}
                />
              </section>
            )}
          </div>
        )}
      </main>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add a companion">
        <CompanionAddModal
          onClose={() => setModalOpen(false)}
          onError={onError}
          onSuccess={onSuccess}
        />
      </Modal>
    </>
  )
}
