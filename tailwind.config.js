/** @type {import('tailwindcss').Config} */
export default {
  // Tailwind scans these files to determine which utility classes to include in the build.
  // Only classes found here will be in the final CSS bundle — this keeps it tiny.
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],

  // We default to dark mode — the entire app is dark-themed (sports aesthetic).
  // 'class' strategy means dark mode is toggled by adding class="dark" to <html>.
  // We'll add it manually in index.html so it's always dark.
  darkMode: 'class',

  theme: {
    extend: {
      // ─── Color Palette ────────────────────────────────────────────────────────
      // Sports-forward dark palette. Think stadium lights, scoreboard displays.
      // Base: very dark blue-grays (not pure black — gives depth)
      // Accent: electric lime — high contrast, energetic, not cliché
      colors: {
        // App background layers (darkest to lightest)
        pitch: {
          950: '#0a0c0f',   // Deepest bg — main app background
          900: '#0f1318',   // Sidebar, top rail
          800: '#161b23',   // Column backgrounds
          700: '#1e2530',   // Card backgrounds
          600: '#262e3d',   // Card hover state
          500: '#2e3849',   // Borders, dividers
          400: '#3d4a5c',   // Subtle borders
          300: '#6b7a91',   // Muted text (metadata)
          200: '#9aa3b0',   // Secondary text
          100: '#c8cdd5',   // Primary text
          50:  '#e8eaed',   // Headings, high emphasis
        },
        // Electric lime accent — the signature color
        volt: {
          500: '#c8ff00',   // Primary accent (buttons, highlights)
          400: '#d4ff33',   // Hover state
          300: '#e0ff66',   // Soft accent
          200: '#ecff99',   // Very soft accent
          600: '#a8d900',   // Active/pressed state
        },
        // Semantic colors for priority and status
        // These map directly to task priority levels
        priority: {
          high:   '#ff4545',  // High priority — red
          normal: '#f59e0b',  // Normal priority — amber
          low:    '#22c55e',  // Low priority — green
        },
        // Due date status colors
        due: {
          overdue: '#ff4545',  // Past due — red
          soon:    '#f59e0b',  // Due within 48 hours — amber
          ok:      '#22c55e',  // Plenty of time — green
        },
      },

      // ─── Typography ───────────────────────────────────────────────────────────
      // DM Mono for labels/metadata (scoreboard feel), DM Sans for body
      // Both are Google Fonts — free and distinctive
      fontFamily: {
        sans:  ['DM Sans', 'system-ui', 'sans-serif'],
        mono:  ['DM Mono', 'monospace'],
        // Display font for big stats numbers (sprint %, task count)
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
      },

      // ─── Spacing & Layout ─────────────────────────────────────────────────────
      // Board columns have a fixed width — they don't stretch with the viewport.
      // This matches how Linear/Jira do it.
      width: {
        'column': '280px',
      },
      minWidth: {
        'column': '280px',
      },

      // ─── Animation ────────────────────────────────────────────────────────────
      keyframes: {
        // Fade + slide up — used for cards appearing and modal entrance
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // Pulse for loading skeletons
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        // Subtle scale for drag-and-drop pick-up feedback
        'lift': {
          '0%':   { transform: 'scale(1)' },
          '100%': { transform: 'scale(1.02) rotate(1deg)' },
        },
      },
      animation: {
        'fade-up':  'fade-up 0.2s ease-out',
        'shimmer':  'shimmer 1.5s infinite linear',
        'lift':     'lift 0.1s ease-out forwards',
      },

      // ─── Border Radius ────────────────────────────────────────────────────────
      borderRadius: {
        'card': '10px',  // Task cards
        'col':  '12px',  // Column containers
        'modal': '16px', // Modal dialog
      },

      // ─── Box Shadow ───────────────────────────────────────────────────────────
      // Dark-theme shadows use dark colors, not the default grays
      boxShadow: {
        'card':      '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
        'card-hover':'0 4px 12px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.4)',
        'drag':      '0 16px 40px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.5)',
        'modal':     '0 24px 64px rgba(0,0,0,0.7)',
        'volt':      '0 0 20px rgba(200,255,0,0.15)',  // Glow for volt accent elements
      },
    },
  },

  plugins: [],
}
