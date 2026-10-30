/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: {
          DEFAULT: 'var(--surface)',
          2: 'var(--surface-2)',
        },
        border: 'var(--border)',
        text: {
          DEFAULT: 'var(--text)',
          2: 'var(--text-2)',
          3: 'var(--text-3)',
        },
        brand: {
          DEFAULT: 'var(--brand)',
          hover: 'var(--brand-hover)',
          soft: 'var(--brand-soft)',
        },
        accent: 'var(--accent)',
        risk: {
          low: {
            DEFAULT: 'var(--risk-low)',
            soft: 'var(--risk-low-soft)',
          },
          moderate: {
            DEFAULT: 'var(--risk-moderate)',
            soft: 'var(--risk-moderate-soft)',
          },
          high: {
            DEFAULT: 'var(--risk-high)',
            soft: 'var(--risk-high-soft)',
          },
          severe: {
            DEFAULT: 'var(--risk-severe)',
            soft: 'var(--risk-severe-soft)',
          },
          blocked: {
            DEFAULT: 'var(--risk-blocked)',
            soft: 'var(--risk-blocked-soft)',
          },
        },
        info: {
          DEFAULT: 'var(--info)',
          soft: 'var(--info-soft)',
        },
        verified: {
          DEFAULT: 'var(--verified)',
          soft: 'var(--verified-soft)',
        },
        sponsored: {
          DEFAULT: 'var(--sponsored)',
          soft: 'var(--sponsored-soft)',
        },
        test: {
          DEFAULT: 'var(--test)',
          soft: 'var(--test-soft)',
        },
        sos: {
          DEFAULT: 'var(--sos)',
          soft: 'var(--sos-soft)',
        },
      },
      borderRadius: {
        card: '14px',
        btn: '10px',
      },
    },
  },
  plugins: [],
};

