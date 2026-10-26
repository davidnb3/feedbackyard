const token = (name) => `rgb(var(--${name}) / <alpha-value>)`

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      screens: {
        // Laptop-height viewports (browser chrome included): tighten vertical rhythm to stay on one screen.
        short: { raw: '(max-height: 1000px)' },
      },
      colors: {
        bg: token('bg'),
        panel: token('panel'),
        line: token('line'),
        muted: token('muted'),
        ink: token('ink'),
        accent: token('accent'),
        data: token('data'),
        warn: token('warn'),
      },
      fontFamily: {
        display: ['Syncopate', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        label: ['11px', { lineHeight: '14px', letterSpacing: '0.14em' }],
        readout: ['13px', { lineHeight: '16px', letterSpacing: '0.04em' }],
        title: ['12px', { lineHeight: '16px', letterSpacing: '0.22em' }],
      },
      letterSpacing: {
        hud: '0.14em',
        wide2: '0.22em',
      },
      keyframes: {
        spin_slow: { to: { transform: 'rotate(360deg)' } },
        pulse_soft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
      },
      animation: {
        'spin-slow': 'spin_slow 24s linear infinite',
        'pulse-soft': 'pulse_soft 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
