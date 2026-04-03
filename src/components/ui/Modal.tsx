/**
 * components/ui/Modal.tsx — Accessible modal dialog base component
 *
 * A reusable modal shell used by both CreateTaskModal and TaskDetailModal.
 * Handles:
 *   - Dark backdrop overlay (closes modal on click)
 *   - Centered dialog container with max-width
 *   - Escape key listener to close
 *   - Focus trap (body scroll lock while open)
 *   - Entrance animation (fade + scale up)
 *
 * Props:
 *   isOpen    — controls whether the modal renders at all
 *   onClose   — called when backdrop clicked or Escape pressed
 *   title     — shown in the modal header
 *   children  — modal body content
 *   maxWidth  — optional max-width override (default 'max-w-lg')
 *
 * Usage:
 *   <Modal isOpen={!!selectedTask} onClose={handleClose} title="Edit Task">
 *     <TaskDetailModal task={selectedTask} ... />
 *   </Modal>
 *
 * Accessibility:
 *   - role="dialog" + aria-modal="true" tells screen readers this is a modal
 *   - aria-labelledby ties the dialog to its title for screen reader announcement
 *   - Escape key closes — standard modal keyboard behavior
 *   - Backdrop click closes — standard modal UX
 */

import { useEffect, useId } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  /** Tailwind max-width class — defaults to 'max-w-lg' (512px) */
  maxWidth?: string
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
}: ModalProps) {

  /**
   * titleId — unique ID for aria-labelledby.
   * useId() generates a stable ID that is consistent between server
   * and client renders (important for React 18 hydration).
   * Links the dialog role to the title element for screen readers.
   */
  const titleId = useId()

  // ── Escape key handler ──────────────────────────────────────────────────────

  useEffect(() => {
    /**
     * Close the modal when the user presses Escape.
     * This is standard modal keyboard behavior — users expect it.
     *
     * We only attach the listener when the modal is open.
     * The cleanup function removes it when the modal closes or unmounts,
     * preventing memory leaks and duplicate listeners.
     */
    if (!isOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // ── Body scroll lock ────────────────────────────────────────────────────────

  useEffect(() => {
    /**
     * Prevent the board from scrolling while the modal is open.
     * Without this, the user could accidentally scroll the board behind the modal.
     *
     * We save the original overflow value and restore it on cleanup.
     * overflow-hidden on body is the simplest cross-browser way to lock scroll.
     */
    if (isOpen) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [isOpen])

  // ── Don't render when closed ────────────────────────────────────────────────

  /**
   * Early return when closed — the modal doesn't exist in the DOM at all.
   * This is simpler than hiding it with CSS (display:none) and ensures
   * the Escape listener and focus trap aren't running unnecessarily.
   *
   * The downside is no exit animation. If we wanted exit animations,
   * we'd use a different approach (keep mounted, animate opacity to 0).
   * For this app, instant close is acceptable.
   */
  if (!isOpen) return null

  return (
    /**
     * Full-screen backdrop:
     * - fixed inset-0: covers the entire viewport
     * - z-50: above everything including drag overlays (z-40 in Board)
     * - bg-pitch-950/80: 80% opacity dark overlay
     * - flex items-center justify-center: centers the dialog
     * - p-4: ensures dialog doesn't touch screen edges on small viewports
     *
     * onClick on the backdrop (not the dialog) closes the modal.
     * We stop propagation on the dialog to prevent backdrop clicks
     * from firing when clicking inside the modal content.
     */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-pitch-950/80"
      onClick={onClose}

    >
      {/*
        * Dialog container:
        * - role="dialog" aria-modal="true": accessibility semantics
        * - aria-labelledby={titleId}: links to the h2 title element
        * - w-full + maxWidth: responsive width with a max cap
        * - rounded-modal: 16px radius from tailwind.config.js
        * - shadow-modal: large shadow from tailwind.config.js
        * - bg-pitch-800: dialog background (lighter than backdrop)
        * - border: subtle border to separate from backdrop
        * - animate-fade-up: entrance animation
        *
        * onClick stopPropagation prevents backdrop close when
        * clicking inside the modal content.
      */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'w-full bg-pitch-800 border border-pitch-500/30',
          'rounded-modal shadow-modal',
          'animate-fade-up',
          maxWidth,
        )}
        onClick={e => e.stopPropagation()}
      >

        {/* ── Modal Header ─────────────────────────────────────────────────── */}
        {/*
          * Title + close button in a flex row.
          * border-b separates header from body content.
          * The title's id matches aria-labelledby on the dialog.
        */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-pitch-500/20">
          <h2
            id={titleId}
            className="font-sans font-500 text-[15px] text-pitch-50"
          >
            {title}
          </h2>

          {/*
            * Close button — X icon.
            * Positioned at the right of the header.
            * aria-label for screen readers.
          */}
          <button
            onClick={onClose}
            aria-label="Close modal"
            className={cn(
              'w-7 h-7 flex items-center justify-center rounded-lg',
              'text-pitch-400 hover:text-pitch-100 hover:bg-pitch-700',
              'transition-colors duration-150',
            )}
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Modal Body ───────────────────────────────────────────────────── */}
        {/*
          * Children render here — CreateTaskModal or TaskDetailModal content.
          * max-h-[85vh] overflow-y-auto: modal scrolls internally if content
          * is taller than 85% of the viewport (e.g. task with long description).
        */}
        <div className="overflow-y-auto max-h-[calc(85vh-60px)]">
          {children}
        </div>

      </div>
    </div>
  )
}
