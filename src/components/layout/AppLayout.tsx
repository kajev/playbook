/**
 * components/layout/AppLayout.tsx -- Main application shell
 *
 * This is the outer container for everything the user sees after auth resolves.
 * It renders three regions in a flex layout:
 *   - Left sidebar (logo, nav, session indicator)
 *   - Top header bar (sprint banner, stats strip, search/filter controls)
 *   - Main board area (columns + draggable task cards)
 *
 * Push 5 change: hooks hoisted here
 * ---------------------------------
 * Previously, Board.tsx owned useTasks() and TopBar had no live data.
 * TopBar only got filter state and could not display stats or sprint info.
 *
 * Now AppLayout owns:
 *   - useSprint()  --> sprint object, loading/error, mutation handlers
 *   - useTasks()   --> tasks array, loading/error, all CRUD + move
 *
 * This means:
 *   1. TopBar receives sprint + stats as props -- it is purely presentational.
 *   2. Board receives tasks + handlers as props -- it no longer calls useTasks().
 *   3. The "New task" button in TopBar calls onOpenCreateModal prop,
 *      a callback that AppLayout wires via openCreateModalRef.
 *      This eliminates the window.__openCreateTask hack from Push 4.
 *
 * Why hoist to AppLayout and not to a context?
 *   For this app's scale (one board per user, < 500 tasks) prop drilling is
 *   clean enough. A TaskContext would add indirection without meaningful benefit.
 *   If we add a second board view later, context becomes worth it.
 *
 * Layout:
 *   h-screen overflow-hidden -- viewport-height shell, no page scroll
 *   Sidebar: fixed 200px wide
 *   Main content: flex-1 column -- TopBar (fixed height) + Board (fills rest)
 *
 * Props:
 *   userId -- the Supabase anonymous user ID from App.tsx auth flow
 */

import { useState, useCallback, useRef } from 'react'
import { Sidebar }  from './Sidebar'
import { TopBar }   from './TopBar'
import { Board }    from '@/components/board/Board'
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

export function AppLayout({ userId }: AppLayoutProps) {

  // ── Sprint data ─────────────────────────────────────────────────────────────

  /**
   * useSprint -- fetches the single active sprint for the current user.
   *
   * sprint    : Sprint | null  (null when no active sprint exists)
   * loading   : boolean        (true during initial Supabase fetch)
   * error     : string | null
   *
   * Mutation handlers (createSprint, updateSprint, endSprint) will be wired
   * to a SprintModal in Push 8. For Push 5 we only READ sprint data.
   */
  const {
    sprint,
    loading: sprintLoading,
    error:   sprintError,
    createSprint,
    updateSprint,
    endSprint,
  } = useSprint()

  /**
   * sprintModalOpen -- controls the sprint create/edit modal.
   * Opened by clicking the sprint banner in TopBar (via onOpenSprintModal prop).
   * Closed by modal's onClose or after a successful create/update/end.
   */
  const [sprintModalOpen, setSprintModalOpen] = useState(false)

  const handleOpenSprintModal  = useCallback(() => setSprintModalOpen(true),  [])
  const handleCloseSprintModal = useCallback(() => setSprintModalOpen(false), [])

  // ── Task data ───────────────────────────────────────────────────────────────

  /**
   * useTasks -- fetches all tasks for the current user, owns all CRUD + move.
   *
   * tasks   : Task[]           (flat array, sorted by created_at ASC)
   * loading : boolean          (true during initial fetch only)
   * error   : string | null
   *
   * We pass tasks + all handlers down to Board as props.
   * Board no longer calls useTasks() directly -- driven purely by what we give it.
   *
   * TopBar can also read tasks for the stats strip and label dropdown
   * without a second Supabase fetch -- same tasks array, shared.
   */
  const {
    tasks,
    loading:  tasksLoading,
    error:    tasksError,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
  } = useTasks()

  // ── Board stats ─────────────────────────────────────────────────────────────

  /**
   * computeBoardStats -- derives stats from tasks[] in memory (no extra fetch).
   *
   * Returns: { total, done, overdue, inFlight }
   *
   * Re-computed on every render where tasks changes.
   * tasks.length is < 500 in practice so this is effectively instant.
   * useMemo is not needed at this scale.
   */
  const stats = computeBoardStats(tasks)

  // ── Toast notifications ─────────────────────────────────────────────────────

  /**
   * useToast -- lightweight queue for surface-level error/success messages.
   *
   * addToast   : push a new chip into the overlay
   * removeToast: dismiss a chip by id (called by auto-timer or manual close)
   *
   * We wrap each task mutation below so any Supabase failure immediately
   * shows a red toast chip rather than silently failing or showing a full
   * error screen. The optimistic moveTask already rolls back local state on
   * failure -- the toast is the user-visible signal that the rollback happened.
   */
  const { toasts, addToast, removeToast } = useToast()

  // ── Toast-wrapped task mutation handlers ────────────────────────────────────

  /**
   * Why wrap mutations here instead of inside Board or useTasks?
   *
   *   useTasks is a data hook -- it should not import UI components (Toast).
   *   Board is a display component -- it should not own notification logic.
   *   AppLayout is the coordination layer that owns both data and UI shell,
   *   so it is the right place to bridge between a failed mutation and a
   *   visible toast notification.
   *
   * Pattern: try the real mutation, catch any thrown error, addToast error.
   * We re-throw after toasting so callers (CreateTaskModal, TaskDetailModal)
   * can still react to failures (e.g. stay open with a save error message).
   */

  /**
   * safeCreateTask -- wraps createTask with an error toast on failure.
   * CreateTaskModal calls this; if it throws, the modal stays open and
   * shows its own inline error. The toast is an additional signal.
   */
  const safeCreateTask = useCallback(async (newTask: NewTask) => {
    try {
      return await createTask(newTask)
    } catch (err) {
      addToast({
        type:    'error',
        message: `Could not create task. Check your connection and try again.`,
      })
      throw err
    }
  }, [createTask, addToast])

  /**
   * safeUpdateTask -- wraps updateTask with an error toast on failure.
   * TaskDetailModal calls this; stays open with inline error on throw.
   */
  const safeUpdateTask = useCallback(async (id: string, changes: TaskUpdate) => {
    try {
      await updateTask(id, changes)
    } catch (err) {
      addToast({
        type:    'error',
        message: `Could not save changes. Check your connection and try again.`,
      })
      throw err
    }
  }, [updateTask, addToast])

  /**
   * safeDeleteTask -- wraps deleteTask with an error toast on failure.
   */
  const safeDeleteTask = useCallback(async (id: string) => {
    try {
      await deleteTask(id)
    } catch (err) {
      addToast({
        type:    'error',
        message: `Could not delete task. Check your connection and try again.`,
      })
      throw err
    }
  }, [deleteTask, addToast])

  /**
   * safeMoveTask -- wraps moveTask with an error toast on failure.
   * moveTask is optimistic -- it already rolls back local state on error.
   * The toast is how the user finds out the rollback happened.
   */
  const safeMoveTask = useCallback(async (id: string, newStatus: TaskStatus) => {
    try {
      await moveTask(id, newStatus)
    } catch (err) {
      addToast({
        type:    'error',
        message: `Move failed -- task snapped back. Check your connection.`,
      })
    }
  }, [moveTask, addToast])

  // ── Filter state ────────────────────────────────────────────────────────────

  /**
   * filters -- what the user has typed/selected in the TopBar controls.
   *
   * Lives here (not in TopBar) so Board can read the same value.
   * TopBar writes via onFiltersChange, Board reads to filter rendered tasks.
   *
   * Lifting state to the lowest common ancestor (AppLayout) keeps
   * TopBar and Board in sync without a context or global store.
   */
  const [filters, setFilters] = useState<FilterState>({
    search:   '',
    priority: 'all',
    label:    '',
  })

  // ── Create modal bridge ─────────────────────────────────────────────────────

  /**
   * openCreateModalRef -- a ref that Board populates with its internal
   * "open create modal" function after it mounts.
   *
   * Why a ref and not a prop callback?
   *
   *   If AppLayout tried to own the modal open state directly, it would need
   *   to pass isOpen + onClose + defaultStatus all the way into Board -- but
   *   Board is the component that contains the modal, so this would be circular.
   *
   *   Instead, Board registers its handler into this ref during its useEffect.
   *   TopBar then calls openCreateModalRef.current?.() when the button is clicked.
   *
   *   The ref holds the live function without triggering re-renders on assignment.
   *   There are no stale closure issues because ref.current is read at call time.
   *
   * This fully replaces the window.__openCreateTask approach from Push 4.
   * No global namespace pollution, fully typed, GC'd automatically with Board.
   */
  const openCreateModalRef = useRef<(() => void) | null>(null)

  /**
   * handleOpenCreateModal -- called by TopBar "New task" button via prop.
   * Delegates to whatever Board registered in the ref.
   * useCallback gives a stable reference so TopBar does not re-render
   * on every AppLayout render just because the function is recreated.
   */
  const handleOpenCreateModal = useCallback(() => {
    openCreateModalRef.current?.()
  }, [])

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
    {/*
      * Outer shell:
      *   flex          -- sidebar (left) + main content (right) side by side
      *   h-screen      -- exactly the viewport height; no page-level scrollbar
      *   overflow-hidden -- board scrolls internally; body never scrolls
      *   bg-pitch-950  -- deepest background; visible in any gap between elements
      */}
    <div className="flex h-screen overflow-hidden bg-pitch-950">

      {/* ── Left Sidebar ──────────────────────────────────────────────────────── */}
      {/*
        * Fixed 200px wide. Contains logo, nav links, truncated session ID.
        * On small screens this would be hidden behind a hamburger menu.
        * That is a future enhancement -- out of scope for this sprint.
      */}
      <Sidebar userId={userId} />

      {/* ── Main Content Column ───────────────────────────────────────────────── */}
      {/*
        * flex-1     -- fills all remaining width after the 200px sidebar
        * flex-col   -- stacks TopBar on top, Board below
        * min-w-0    -- allows this flex child to shrink below content width.
        *              Without this, a long task title would expand this column
        *              past the viewport and cause horizontal scroll.
      */}
      <div className="flex flex-1 flex-col min-w-0">

        {/* ── Top Header Bar ────────────────────────────────────────────────── */}
        {/*
          * Push 5: TopBar is now purely presentational.
          * All data arrives as props -- no hooks inside TopBar.
          *
          * sprint        : Sprint | null  -- for the sprint banner
          * sprintLoading : boolean        -- banner shows skeleton while true
          * sprintError   : string | null  -- shown if sprint fetch fails
          * stats         : BoardStats     -- total, done, overdue, inFlight
          * tasks         : Task[]         -- for deriving the label filter options
          * filters       : FilterState    -- current search/priority/label values
          * onFiltersChange                -- updates filters state in AppLayout
          * onOpenCreateModal              -- wired to the "New task" button
        */}
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

        {/* ── Board ─────────────────────────────────────────────────────────── */}
        {/*
          * flex-1        -- fills remaining height below TopBar
          * overflow-hidden -- Board manages its own internal scroll
          *
          * Push 5: Board is now data-driven from props.
          * It no longer calls useTasks() -- avoids a second Supabase fetch.
          *
          * openCreateModalRef: Board registers its internal modal opener here.
          * TopBar's "New task" button triggers it via handleOpenCreateModal above.
        */}
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

      </div>
    </div>

    {/*
      * ToastContainer -- fixed bottom-right overlay for error/success chips.
      *
      * Rendered OUTSIDE the flex layout div so it is not constrained by
      * overflow:hidden on the board container. It uses position:fixed so
      * it always appears in the viewport corner regardless of scroll.
      *
      * toasts    : the active queue from useToast()
      * onRemove  : removeToast from useToast() -- called by auto-dismiss and X button
    */}
    <ToastContainer toasts={toasts} onRemove={removeToast} />

    {/*
      * SprintModal -- create / edit / end sprint.
      * Opened by TopBar sprint banner click (onOpenSprintModal).
      * Lives at AppLayout level because it calls useSprint() mutation handlers
      * which are owned here. Modal receives all three handlers as props.
      *
      * title changes based on whether a sprint is active:
      *   null sprint  --> "Start a sprint"
      *   active sprint --> "Edit sprint"
    */}
    <Modal
      isOpen={sprintModalOpen}
      onClose={handleCloseSprintModal}
      title={sprint ? 'Edit sprint' : 'Start a sprint'}
    >
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
