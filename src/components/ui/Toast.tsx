/**
 * components/ui/Toast.tsx -- Toast notification system
 *
 * Surfaces mutation errors and successes as dismissible chips in the
 * bottom-right corner without blocking the board or opening a modal.
 *
 * Three exports:
 *   useToast()       -- hook that owns the queue of active toasts
 *   ToastContainer   -- fixed-position overlay that renders the queue
 *   (ToastChip is internal -- only rendered by ToastContainer)
 *
 * How to use in AppLayout:
 *   const { toasts, addToast, removeToast } = useToast()
 *   addToast({ type: 'error', message: 'Failed to move task' })
 *   addToast({ type: 'success', message: 'Task created' })
 *   <ToastContainer toasts={toasts} onRemove={removeToast} />
 *
 * Toast types and durations:
 *   error   -- red icon, stays 5 s (errors need more reading time)
 *   success -- volt icon, stays 3 s (quick positive confirmation)
 *   info    -- gray icon, stays 4 s (neutral informational)
 *
 * Animation:
 *   Entrance: slides up + fades in (toast-slide-in keyframe in index.css)
 *   Exit: slides down + fades out (toast-slide-out keyframe in index.css)
 *   The exit animation plays for 200 ms before the chip is removed from the DOM.
 *
 * Stacking:
 *   flex-col-reverse in ToastContainer means newest toast appears on top.
 *   The toasts[] array grows at the tail; flex-col-reverse renders tail-first.
 *
 * Accessibility:
 *   Each chip has role="alert" and aria-live="assertive" so screen readers
 *   announce new toasts immediately without waiting for focus.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { X, AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────────────────

/**
 * ToastType -- semantic variant of a toast.
 * Drives the color scheme, icon, and auto-dismiss duration.
 */
export type ToastType = 'error' | 'success' | 'info'

/**
 * ToastItem -- one entry in the toast queue.
 *   id      -- unique string, used as React key and for targeted removal
 *   type    -- drives visual variant and dismissal timing
 *   message -- user-facing text. Keep under ~80 chars.
 */
export interface ToastItem {
  id:      string
  type:    ToastType
  message: string
}

// ─── useToast hook ─────────────────────────────────────────────────────────────

interface UseToastReturn {
  /** Current queue of active toasts. Empty array = nothing visible. */
  toasts: ToastItem[]
  /**
   * addToast -- push a new toast into the queue.
   * Generates the id automatically -- callers only supply type + message.
   */
  addToast: (toast: Omit<ToastItem, 'id'>) => void
  /**
   * removeToast -- remove a toast by id.
   * Called by the auto-dismiss timer and the manual close button.
   */
  removeToast: (id: string) => void
}

export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  /**
   * addToast -- generates a unique id then appends to the queue.
   *
   * id format: timestamp + 5 random chars.
   * Collision probability is negligible for a UI notification queue.
   * No uuid library needed.
   *
   * Newest toast is appended to the END of the array.
   * ToastContainer uses flex-col-reverse so it visually appears on TOP.
   */
  const addToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setToasts(prev => [...prev, { ...toast, id }])
  }, [])

  /**
   * removeToast -- filters the target id out of the queue.
   * Called both by auto-dismiss timers and manual close button clicks.
   * Safe to call with an id that no longer exists (filter is a no-op).
   */
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, addToast, removeToast }
}

// ─── Internal constants ────────────────────────────────────────────────────────

/**
 * AUTO_DISMISS_MS -- how long each toast type stays before auto-dismissing.
 * Errors stay longest because they contain actionable information.
 */
const AUTO_DISMISS_MS: Record<ToastType, number> = {
  error:   5000,
  success: 3000,
  info:    4000,
}

/**
 * TOAST_CONFIG -- visual config keyed by toast type.
 *   chipClass  -- border color for the chip container
 *   iconClass  -- icon color
 *   Icon       -- lucide-react icon component
 */
const TOAST_CONFIG: Record<ToastType, {
  chipClass: string
  iconClass: string
  Icon:      typeof AlertCircle
}> = {
  error: {
    chipClass: 'border-red-500/40',
    iconClass: 'text-red-400',
    Icon:      AlertCircle,
  },
  success: {
    chipClass: 'border-volt-500/40',
    iconClass: 'text-volt-500',
    Icon:      CheckCircle2,
  },
  info: {
    chipClass: 'border-pitch-400/30',
    iconClass: 'text-pitch-300',
    Icon:      Info,
  },
}

// ─── ToastChip (internal) ─────────────────────────────────────────────────────

/**
 * ToastChip -- renders a single toast chip with entrance/exit animation
 * and an auto-dismiss timer.
 *
 * Why manage the timer inside the chip (not in useToast)?
 *   The timer needs to trigger a CSS class change (isExiting) before calling
 *   onRemove so the exit animation plays BEFORE the component unmounts.
 *   That is view-layer logic and belongs in the component, not the hook.
 *
 * Exit sequence:
 *   1. Timer fires (or user clicks X)
 *   2. setIsExiting(true) -- adds toast-slide-out CSS class
 *   3. 200 ms delay -- exit animation plays
 *   4. onRemove(id) -- chip removed from queue, component unmounts
 *
 * timerRef:
 *   Stored in a ref so we can clearTimeout if the user manually closes
 *   the toast before the auto-dismiss fires. Without clearing, the timer
 *   would still fire and call onRemove with a stale id -- harmless but messy.
 */
interface ToastChipProps {
  toast:    ToastItem
  onRemove: (id: string) => void
}

function ToastChip({ toast, onRemove }: ToastChipProps) {
  const { id, type, message } = toast

  /**
   * isExiting -- when true, replaces toast-slide-in with toast-slide-out.
   * The exit animation (200 ms) plays before the chip is removed from the DOM.
   */
  const [isExiting, setIsExiting] = useState(false)

  /**
   * timerRef -- holds the auto-dismiss setTimeout return value.
   * Ref (not state) because updating it must not trigger a re-render.
   * Cleaned up in the useEffect return to prevent leaks on early unmount.
   */
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /**
   * dismiss -- triggers the exit animation then removes the chip.
   *
   * useCallback with [id, onRemove] deps:
   *   id and onRemove are stable for the lifetime of this chip instance.
   *   Including them satisfies the exhaustive-deps rule without side effects.
   */
  const dismiss = useCallback(() => {
    // Clear auto-dismiss timer so it doesn't fire a second time
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    // Trigger exit animation
    setIsExiting(true)
    // Remove from queue after animation completes (200ms matches CSS duration)
    setTimeout(() => onRemove(id), 200)
  }, [id, onRemove])

  /**
   * Auto-dismiss effect -- starts the countdown when the chip mounts.
   * Cleans up the timer if the chip unmounts before the timer fires
   * (e.g. the user navigates away or manually dismisses early).
   */
  useEffect(() => {
    timerRef.current = setTimeout(dismiss, AUTO_DISMISS_MS[type])
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [dismiss, type])

  const { chipClass, iconClass, Icon } = TOAST_CONFIG[type]

  return (
    /**
     * Chip container:
     *   bg-pitch-800      -- dark card background, matches board aesthetic
     *   border + chipClass -- colored border by type (red / volt / gray)
     *   rounded-xl        -- softer pill shape vs the sharper card rectangles
     *   shadow-modal      -- floats visually above the board surface
     *   max-w-[360px]     -- prevents very long messages from being unreadable
     *   pointer-events-auto -- re-enables clicks (parent container has pointer-events-none)
     *   toast-slide-in / toast-slide-out -- CSS animations from index.css
     */
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'flex items-start gap-3 px-4 py-3',
        'bg-pitch-800 border rounded-xl shadow-modal',
        'max-w-[360px] w-full pointer-events-auto',
        chipClass,
        isExiting ? 'toast-slide-out' : 'toast-slide-in',
      )}
    >
      {/* Type icon -- visually identifies success vs error vs info at a glance */}
      <Icon
        size={16}
        className={cn('shrink-0 mt-0.5', iconClass)}
        aria-hidden="true"
      />

      {/* Message text -- font-sans, slightly smaller than card text */}
      <p className="flex-1 font-sans text-[13px] text-pitch-100 leading-snug">
        {message}
      </p>

      {/* Manual close button -- always available, doesn't wait for auto-dismiss */}
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 mt-0.5 text-pitch-500 hover:text-pitch-200 transition-colors duration-150"
      >
        <X size={14} />
      </button>
    </div>
  )
}

// ─── ToastContainer ────────────────────────────────────────────────────────────

/**
 * ToastContainer -- fixed overlay that renders the active toast queue.
 *
 * Position: bottom-right, z-[200] (above modals which are z-50).
 *
 * pointer-events-none on the container:
 *   The container is a full-screen invisible layer. Without pointer-events-none
 *   it would block clicks on the board behind it even when empty.
 *   Each ToastChip re-enables pointer-events-auto so chips are still clickable.
 *
 * flex-col-reverse stacking:
 *   toasts[] grows at the end (newest last).
 *   flex-col-reverse renders end-items first visually, so newest is on top.
 *   This matches the expected UX: most recent notification is most prominent.
 *
 * Returns null when the queue is empty to avoid a pointless DOM node.
 */
interface ToastContainerProps {
  toasts:   ToastItem[]
  onRemove: (id: string) => void
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div
      aria-label="Notifications"
      className={cn(
        'fixed bottom-6 right-6 z-[200]',
        'flex flex-col-reverse gap-2',
        'pointer-events-none',
      )}
    >
      {toasts.map(toast => (
        <ToastChip
          key={toast.id}
          toast={toast}
          onRemove={onRemove}
        />
      ))}
    </div>
  )
}
