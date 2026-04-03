/**
 * components/board/Board.tsx — Main Kanban board with drag-and-drop
 *
 * Central orchestrator for the board. Responsibilities:
 *   1. Fetch all task data via useTasks()
 *   2. Derive filtered/grouped state via useBoardState()
 *   3. Wrap the board in dnd-kit's DndContext for drag-and-drop
 *   4. Render four DroppableColumn components
 *   5. Show a DragOverlay (floating card preview while dragging)
 *   6. Mount CreateTaskModal and TaskDetailModal when needed
 *
 * ─── dnd-kit architecture ──────────────────────────────────────────────────────
 *
 * Three layers work together:
 *
 * DndContext (Board)
 *   └── DroppableColumn (one per status — useDroppable)
 *         └── DraggableCard (one per task — useDraggable)
 *               └── TaskCard (pure visual component)
 *
 * DragOverlay (portal — floats above everything)
 *   └── TaskCard (isDragging=true for elevated shadow + tilt)
 *
 * ─── Drag flow ─────────────────────────────────────────────────────────────────
 *
 *   User grabs card (pointer moves 8px)
 *     → onDragStart: setActiveTaskId(id), DragOverlay appears
 *     → original card goes opacity-0 (ghost placeholder in column)
 *
 *   User drags over column
 *     → DroppableColumn.isOver = true, column highlights
 *
 *   User drops card
 *     → onDragEnd: read over.id (= column status), call moveTask(id, newStatus)
 *     → moveTask is optimistic: UI updates instantly, Supabase syncs in background
 *     → setActiveTaskId(null), DragOverlay disappears
 *
 *   User cancels (Escape or drop outside)
 *     → onDragEnd with over=null, no moveTask, setActiveTaskId(null)
 *
 * ─── Sensors ───────────────────────────────────────────────────────────────────
 *
 *   PointerSensor with 8px activation distance:
 *     Prevents clicks on cards from accidentally starting a drag.
 *     Without this, the card's onClick (detail modal) would never fire.
 *
 *   KeyboardSensor with sortableKeyboardCoordinates:
 *     Tab to focus a card, Space to pick up, Arrow keys to move between columns,
 *     Space/Enter to drop, Escape to cancel.
 */

/**
 * Push 5 imports note:
 *   useTasks removed -- Board no longer owns data fetching.
 *   AppLayout calls useTasks() and passes all task data + handlers as props.
 *   MutableRefObject imported so AppLayout can register the create modal opener.
 *   TaskUpdate and NewTask imported for the prop type signatures.
 */
import { useState, useCallback, useEffect, type MutableRefObject } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { cn } from '@/lib/utils'
import { useBoardState, getTaskById } from '@/hooks/useBoardState'
import { BoardColumn } from './BoardColumn'
import { BoardSkeleton } from './BoardSkeleton'
import { TaskCard } from './TaskCard'
import { Modal } from '@/components/ui/Modal'
import { CreateTaskModal } from './CreateTaskModal'
import { TaskDetailModal } from './TaskDetailModal'
import { COLUMNS } from '@/types'
import type { FilterState, Task, TaskStatus, TaskUpdate, NewTask } from '@/types'

// ─── DraggableCard ─────────────────────────────────────────────────────────────

/**
 * DraggableCard — wraps TaskCard with dnd-kit's useDraggable hook.
 *
 * Defined OUTSIDE Board so it doesn't get recreated on every Board render.
 * Recreating components inside render causes remount → lost drag state.
 *
 * useDraggable provides:
 *   setNodeRef  — attaches dnd-kit's tracking to the DOM node
 *   listeners   — onPointerDown / onKeyDown to initiate drag
 *   attributes  — ARIA role/label for accessibility
 *   transform   — {x, y} offset to move the card with the pointer
 *   isDragging  — true when THIS card is the active drag item
 *
 * While dragging:
 *   - This component goes opacity-0 (ghost placeholder stays in the column)
 *   - DragOverlay renders the floating card preview instead
 *   - transform follows the pointer (set as inline CSS)
 */
interface DraggableCardProps {
  task: Task
  onClick: () => void
  /** True when this is the card the user is currently dragging */
  isActivelyDragging: boolean
}

function DraggableCard({ task, onClick, isActivelyDragging }: DraggableCardProps) {
  const {
    setNodeRef,
    listeners,
    attributes,
    transform,
    isDragging,
  } = useDraggable({ id: task.id })

  /**
   * Inline transform style — moves the card element with the pointer.
   * dnd-kit computes x/y offsets; we translate the card in 3D space.
   * translate3d enables GPU compositing for smooth 60fps dragging.
   */
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}    // onPointerDown, onKeyDown — start the drag
      {...attributes}   // role="button", aria-roledescription="Draggable"
      className={cn(
        'transition-opacity duration-150',
        // Ghost: original card becomes invisible while DragOverlay shows
        // the floating preview. The invisible card holds space in the column
        // so the column doesn't collapse during drag.
        isDragging && 'opacity-0',
      )}
    >
      <TaskCard
        task={task}
        onClick={onClick}
        // isActivelyDragging is used for the drag overlay's styling only —
        // the in-place ghost card always gets isDragging=false so it stays dim
        isDragging={isActivelyDragging}
      />
    </div>
  )
}

// ─── DroppableColumn ───────────────────────────────────────────────────────────

/**
 * DroppableColumn — wraps BoardColumn with dnd-kit's useDroppable hook.
 *
 * Defined OUTSIDE Board for the same reason as DraggableCard.
 *
 * useDroppable registers a DOM element as a valid drop target.
 * id MUST be the column's TaskStatus string so onDragEnd can read
 * over.id and know which column received the drop.
 *
 * The droppable div wraps the entire BoardColumn so the user can
 * drop anywhere in the column (not just on existing cards).
 *
 * renderTask is a render prop injected by Board — it wraps each task
 * in DraggableCard. BoardColumn doesn't know about dnd-kit at all;
 * the render prop is what injects drag behaviour.
 */
interface DroppableColumnProps {
  status: TaskStatus
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onAddTask: (status: TaskStatus) => void
  renderTask: (task: Task) => React.ReactNode
}

function DroppableColumn({
  status,
  tasks,
  onTaskClick,
  onAddTask,
  renderTask,
}: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    /**
     * h-full: drop zone fills the column's full height.
     * Without this, dropping at the bottom of a tall column would miss the target.
     */
    <div ref={setNodeRef} className="h-full">
      <BoardColumn
        status={status}
        tasks={tasks}
        onTaskClick={onTaskClick}
        onAddTask={onAddTask}
        renderTask={renderTask}
        isOver={isOver}
      />
    </div>
  )
}

// ─── Board ─────────────────────────────────────────────────────────────────────

/**
 * BoardProps -- Push 5 expanded interface.
 *
 * Board no longer calls useTasks() or useSprint() internally.
 * AppLayout owns all data fetching and passes everything down as props.
 *
 * Why this change?
 *   - TopBar also needs tasks[] for stats + label filter.
 *   - If Board owned useTasks(), there would be two separate Supabase fetches.
 *   - Hoisting to AppLayout means one fetch, shared between TopBar and Board.
 *   - Board stays focused on UI: drag-drop, modals, column rendering.
 *
 * openCreateModalRef:
 *   Board registers its internal handleOpenCreateModal into this ref so
 *   AppLayout's TopBar "New task" button can trigger it without prop-drilling
 *   through multiple intermediate components. The ref is populated in a
 *   useEffect after Board mounts. AppLayout reads ref.current on button click.
 */
interface BoardProps {
  /** Current filter state from TopBar -- passed to useBoardState for client-side filtering */
  filters: FilterState
  /** All tasks for the current user -- fetched by AppLayout via useTasks() */
  tasks: Task[]
  /** True during the initial task fetch -- shows BoardSkeleton */
  tasksLoading: boolean
  /** Error string if task fetch failed, null otherwise */
  tasksError: string | null
  /** Create a new task -- from useTasks(), called by CreateTaskModal */
  createTask: (newTask: NewTask) => Promise<Task>
  /** Update task fields -- from useTasks(), called by TaskDetailModal */
  updateTask: (id: string, changes: TaskUpdate) => Promise<void>
  /** Delete a task permanently -- from useTasks(), called by TaskDetailModal */
  deleteTask: (id: string) => Promise<void>
  /**
   * Optimistically move task to new column for drag-and-drop.
   * Updates local state immediately, rolls back on Supabase failure.
   */
  moveTask: (id: string, newStatus: TaskStatus) => Promise<void>
  /**
   * Ref that Board populates with its "open create modal" handler.
   * AppLayout's TopBar "New task" button calls ref.current?.() to open it.
   * Replaces the Push 4 window.__openCreateTask hack.
   */
  openCreateModalRef: MutableRefObject<(() => void) | null>
}

export function Board({
  filters,
  tasks,
  tasksLoading,
  tasksError,
  createTask,
  updateTask,
  deleteTask,
  moveTask,
  openCreateModalRef,
}: BoardProps) {

  // ── Board state (grouped + filtered) ────────────────────────────────────────

  /**
   * boardState -- tasks grouped by column, filtered by search/priority/label.
   * { todo: Task[], in_progress: Task[], in_review: Task[], done: Task[] }
   *
   * useBoardState memoizes -- only recomputes when tasks or filters change.
   * Board does NOT call useTasks() anymore -- tasks arrive via props from AppLayout.
   */
  const boardState = useBoardState(tasks, filters)

  // ── Drag state ──────────────────────────────────────────────────────────────

  /**
   * activeTaskId — the UUID of the card being dragged. null = no drag.
   *
   * Used for two things:
   *   a) DragOverlay: look up the full task to render the floating preview
   *   b) DraggableCard: pass isActivelyDragging={task.id === activeTaskId}
   *      so only the dragged card gets the elevated shadow in the overlay
   */
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)

  /** The full Task for the card being dragged — null when nothing is dragged */
  const activeTask = activeTaskId ? getTaskById(tasks, activeTaskId) ?? null : null

  // ── Modal state ─────────────────────────────────────────────────────────────

  /** The task open in the detail/edit modal. null = modal closed. */
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  /** Whether the "New task" create form modal is open */
  const [createModalOpen, setCreateModalOpen] = useState(false)

  /**
   * createDefaultStatus — which column to pre-select in the create form.
   * 'todo' by default. Overridden when the user clicks a column's "+ Add task".
   */
  const [createDefaultStatus, setCreateDefaultStatus] = useState<TaskStatus>('todo')

  // ── dnd-kit sensors ─────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, {
      /**
       * activationConstraint.distance:
       * User must move the pointer at least 8px before a drag starts.
       * This prevents click events on cards from being eaten by the drag sensor.
       * Without this, tapping a card would start a drag instead of opening the modal.
       */
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      /**
       * sortableKeyboardCoordinates — from @dnd-kit/sortable.
       * Provides arrow-key navigation between droppable containers.
       */
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  // ── Drag handlers ───────────────────────────────────────────────────────────

  /**
   * handleDragStart — fires the moment a drag is initiated.
   * Stores the task ID so DragOverlay can render the floating preview.
   */
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveTaskId(event.active.id as string)
  }, [])

  /**
   * handleDragEnd — fires when the user releases the drag (drop or cancel).
   *
   * Decision tree:
   *   over is null    → dropped outside any column → no-op
   *   over.id === task.status → dropped back on same column → no-op
   *   otherwise       → call moveTask (optimistic update)
   *
   * We always clear activeTaskId first so the DragOverlay disappears
   * immediately on release, regardless of outcome.
   */
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event

    // Clear the active drag immediately — overlay disappears right on drop
    setActiveTaskId(null)

    // No valid drop target (dropped outside all columns)
    if (!over) return

    const taskId    = active.id as string
    const newStatus = over.id   as TaskStatus

    // Look up the task to compare its current status
    const task = getTaskById(tasks, taskId)
    if (!task) return

    // Dropped on the same column it started in — nothing to do
    if (task.status === newStatus) return

    // Move to the new column — optimistic update (useTasks rolls back on failure)
    await moveTask(taskId, newStatus)
  }, [tasks, moveTask])

  // ── Modal handlers ──────────────────────────────────────────────────────────

  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTask(task)
  }, [])

  const handleDetailClose = useCallback(() => {
    setSelectedTask(null)
  }, [])

  /**
   * handleAddTask — called by a column's "+ Add task" button.
   * Opens the create modal with that column's status pre-selected.
   */
  const handleAddTask = useCallback((status: TaskStatus) => {
    setCreateDefaultStatus(status)
    setCreateModalOpen(true)
  }, [])

  const handleCreateClose = useCallback(() => {
    setCreateModalOpen(false)
  }, [])

  // ── Expose create modal opener via ref ─────────────────────────────────────

  /**
   * handleOpenCreateModal -- opens the create modal with the default 'todo' status.
   *
   * Push 5 change: previously exposed on window.__openCreateTask (global hack).
   * Now registered into openCreateModalRef (passed from AppLayout).
   *
   * AppLayout holds the ref. TopBar calls AppLayout's handleOpenCreateModal,
   * which calls openCreateModalRef.current?.(). This function is that target.
   *
   * useCallback with empty deps: this function only needs setCreateModalOpen
   * and setCreateDefaultStatus, which are stable setState dispatchers -- they
   * never change between renders, so empty deps is correct and avoids
   * re-registering the ref unnecessarily.
   */
  const handleOpenCreateModal = useCallback(() => {
    setCreateDefaultStatus('todo')
    setCreateModalOpen(true)
  }, [])

  /**
   * Register handleOpenCreateModal into openCreateModalRef after mount.
   *
   * useEffect is the correct place for this side effect (ref mutation)
   * because it runs after the component mounts and the function is stable.
   *
   * Cleanup: set ref.current to null when Board unmounts so AppLayout
   * doesn't hold a reference to a dead component's function.
   */
  useEffect(() => {
    openCreateModalRef.current = handleOpenCreateModal
    return () => {
      openCreateModalRef.current = null
    }
  }, [openCreateModalRef, handleOpenCreateModal])

  // ── renderTask — render prop factory ────────────────────────────────────────

  /**
   * makeRenderTask — returns a renderTask function for a specific column.
   *
   * We need renderTask to close over activeTaskId (to compute isActivelyDragging),
   * but renderTask is passed as a prop to DroppableColumn → BoardColumn.
   *
   * Using useCallback here would require listing activeTaskId as a dep, causing
   * a new function reference on every drag-position update (60fps during drag) —
   * which would remount every TaskCard. Instead, we create the function inline
   * in the render — it's a fresh closure on each render, which is fine because
   * boardState also changes each render (drag position change → new filtered state).
   *
   * Note: This is acceptable because we're not passing renderTask to a memo'd child.
   */
  function makeRenderTask() {
    return function renderTask(task: Task): React.ReactNode {
      return (
        <DraggableCard
          key={task.id}
          task={task}
          onClick={() => handleTaskClick(task)}
          isActivelyDragging={task.id === activeTaskId}
        />
      )
    }
  }

  // ── Loading + error states ──────────────────────────────────────────────────

  if (tasksLoading) return <BoardSkeleton />

  if (tasksError) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-red-400">
              <path
                d="M10 6v4M10 14h.01M2.93 17.07a10 10 0 1 1 14.14-14.14A10 10 0 0 1 2.93 17.07z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <p className="font-sans font-500 text-pitch-100 text-[14px] mb-1">Failed to load tasks</p>
          <p className="font-mono text-[11px] text-pitch-400 mb-4 break-all">{tasksError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-pitch-800 hover:bg-pitch-700 border border-pitch-500/40 rounded-lg font-sans text-[13px] text-pitch-100 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/*
        * DndContext — root provider for drag-and-drop.
        * ALL droppable and draggable elements must be descendants of this.
        * sensors: how drag is initiated (pointer + keyboard)
        * onDragStart/End: our handlers above
      */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >

        {/* Board scroll container */}
        <div className="h-full overflow-hidden">
          <div className="board-scroll flex items-start gap-4 h-full px-6 py-5">

            {/*
              * Render all four columns in order (from COLUMNS constant).
              * Each DroppableColumn registers itself as a drop target with
              * its status as the ID so onDragEnd can identify where the card landed.
              *
              * makeRenderTask() returns a renderTask function that closes over
              * activeTaskId — each task gets isActivelyDragging={task.id === activeTaskId}.
            */}
            {COLUMNS.map(col => (
              <DroppableColumn
                key={col.id}
                status={col.id}
                tasks={boardState[col.id]}
                onTaskClick={handleTaskClick}
                onAddTask={handleAddTask}
                renderTask={makeRenderTask()}
              />
            ))}

          </div>
        </div>

        {/*
          * DragOverlay — a portal that renders the floating card preview.
          *
          * The overlay renders outside the board's DOM tree, so it's never
          * clipped by overflow:hidden on any parent. The card floats freely
          * across the entire viewport during drag.
          *
          * isDragging=true on the TaskCard applies elevated shadow + 1° tilt.
          * No onClick — the overlay is purely visual (interactions go to the ghost).
          *
          * When activeTask is null (no drag in progress), nothing renders.
        */}
        <DragOverlay>
          {activeTask ? (
            <TaskCard
              task={activeTask}
              isDragging={true}
            />
          ) : null}
        </DragOverlay>

      </DndContext>

      {/* ── Create Task Modal ─────────────────────────────────────────────────── */}
      {/*
        * Opened by:
        *   a) Column "+ Add task" button → handleAddTask(status) → pre-selects column
        *   b) TopBar "New task" button → handleOpenCreateModal() → defaults to 'todo'
        *
        * Lives OUTSIDE DndContext intentionally — modals should not be
        * drag targets and don't need drag context.
      */}
      <Modal
        isOpen={createModalOpen}
        onClose={handleCreateClose}
        title="New task"
      >
        <CreateTaskModal
          onClose={handleCreateClose}
          createTask={createTask}
          defaultStatus={createDefaultStatus}
        />
      </Modal>

      {/* ── Task Detail Modal ─────────────────────────────────────────────────── */}
      {/*
        * Opened by clicking any TaskCard.
        * selectedTask is null when closed — Modal's isOpen={!!selectedTask}
        * handles the conditional rendering.
        *
        * The {selectedTask && ...} guard inside is for TypeScript — Modal only
        * renders children when isOpen=true, which requires selectedTask to be
        * non-null, but TS can't infer that through the Modal component boundary.
      */}
      <Modal
        isOpen={!!selectedTask}
        onClose={handleDetailClose}
        title="Task details"
        maxWidth="max-w-xl"
      >
        {selectedTask && (
          <TaskDetailModal
            task={selectedTask}
            onClose={handleDetailClose}
            updateTask={updateTask}
            deleteTask={deleteTask}
          />
        )}
      </Modal>


    </>
  )
}
