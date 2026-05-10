/**
 * components/layout/AppLayout.tsx — Main shell.
 * Push 6: page state expanded to include 'companions'.
 */

import { useState, useCallback, useRef } from 'react'
import { Sidebar }  from './Sidebar'
import { TopBar }   from './TopBar'
import { Board }    from '@/components/board/Board'
import { RoutinePage } from '@/components/routine/RoutinePage'
import { CompanionsPage } from '@/components/companions/CompanionsPage'
import { Modal }    from '@/components/ui/Modal'
import { SprintModal } from '@/components/board/SprintModal'
import { useSprint } from '@/hooks/useSprint'
import { useTasks }  from '@/hooks/useTasks'
import { computeBoardStats } from '@/lib/utils'
import { useToast, ToastContainer } from '@/components/ui/Toast'
import type { FilterState, NewTask, TaskUpdate, TaskStatus } from '@/types'

interface AppLayoutProps {
  userId: string
}

export type AppPage = 'board' | 'routine' | 'companions'

export function AppLayout({ userId }: AppLayoutProps) {
  const [page, setPage] = useState<AppPage>('board')

  const { sprint, loading: sprintLoading, error: sprintError, createSprint, updateSprint, endSprint } = useSprint()
  const [sprintModalOpen, setSprintModalOpen] = useState(false)
  const handleOpenSprintModal  = useCallback(() => setSprintModalOpen(true),  [])
  const handleCloseSprintModal = useCallback(() => setSprintModalOpen(false), [])

  const { tasks, loading: tasksLoading, error: tasksError, createTask, updateTask, deleteTask, moveTask } = useTasks()
  const stats = computeBoardStats(tasks)
  const { toasts, addToast, removeToast } = useToast()

  const safeCreateTask = useCallback(async (newTask: NewTask) => {
    try { return await createTask(newTask) }
    catch (err) { addToast({ type: 'error', message: 'Could not create task.' }); throw err }
  }, [createTask, addToast])
  const safeUpdateTask = useCallback(async (id: string, changes: TaskUpdate) => {
    try { await updateTask(id, changes) }
    catch (err) { addToast({ type: 'error', message: 'Could not save changes.' }); throw err }
  }, [updateTask, addToast])
  const safeDeleteTask = useCallback(async (id: string) => {
    try { await deleteTask(id) }
    catch (err) { addToast({ type: 'error', message: 'Could not delete task.' }); throw err }
  }, [deleteTask, addToast])
  const safeMoveTask = useCallback(async (id: string, newStatus: TaskStatus) => {
    try { await moveTask(id, newStatus) }
    catch { addToast({ type: 'error', message: 'Move failed — task snapped back.' }) }
  }, [moveTask, addToast])

  const [filters, setFilters] = useState<FilterState>({ search: '', priority: 'all', label: '' })
  const openCreateModalRef = useRef<(() => void) | null>(null)
  const handleOpenCreateModal = useCallback(() => { openCreateModalRef.current?.() }, [])

  return (
    <>
      <div className="flex h-screen overflow-hidden bg-pitch-950">
        <Sidebar userId={userId} page={page} onNavigate={setPage} />

        <div className="flex flex-1 flex-col min-w-0">
          {page === 'board' && (
            <>
              <TopBar
                sprint={sprint}
                sprintLoading={sprintLoading}
                sprintError={sprintError}
                stats={stats}
                tasks={tasks}
                filters={filters}
                onFiltersChange={setFilters}
                onOpenCreateModal={handleOpenCreateModal}
                onOpenSprintModal={handleOpenSprintModal}
              />
              <main className="flex-1 overflow-hidden">
                <Board
                  filters={filters}
                  tasks={tasks}
                  tasksLoading={tasksLoading}
                  tasksError={tasksError}
                  createTask={safeCreateTask}
                  updateTask={safeUpdateTask}
                  deleteTask={safeDeleteTask}
                  moveTask={safeMoveTask}
                  openCreateModalRef={openCreateModalRef}
                />
              </main>
            </>
          )}

          {page === 'routine' && (
            <RoutinePage userId={userId} addToast={addToast} />
          )}

          {page === 'companions' && (
            <CompanionsPage userId={userId} addToast={addToast} />
          )}
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <Modal isOpen={sprintModalOpen} onClose={handleCloseSprintModal} title={sprint ? 'Edit sprint' : 'Start a sprint'}>
        <SprintModal
          sprint={sprint}
          onClose={handleCloseSprintModal}
          createSprint={createSprint}
          updateSprint={updateSprint}
          endSprint={endSprint}
        />
      </Modal>
    </>
  )
}
