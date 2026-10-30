import type { MarkerOptions } from './types';

// Map of standard Lucide icons as SVG path data
const ICON_SVGS: Record<string, string> = {
  'shield-check': `<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>`,
  'triangle-alert': `<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/>`,
  'octagon-alert': `<polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>`,
  'siren': `<path d="M7 18v-6a5 5 0 1 1 10 0v6"/><path d="M5 21a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2z"/><path d="M21 12h1"/><path d="M18.5 4.5 19 4"/><path d="M2 12h1"/><path d="M12 2v1"/><path d="m4.929 4.929.707.707"/><path d="M12 12v6"/>`,
  'ban': `<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>`,
  'info': `<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>`,
  'badge-check': `<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/>`,
  'megaphone': `<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>`,
  'flask-conical': `<path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/>`,
  'map-pin': `<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>`,
  'hotel': `<path d="M10 22v-6.57"/><path d="M12 11h.01"/><path d="M12 7h.01"/><path d="M14 15.43V22"/><path d="M15 16a5 5 0 0 0-6 0"/><path d="M16 11h.01"/><path d="M16 7h.01"/><path d="M8 11h.01"/><path d="M8 7h.01"/><rect x="4" y="2" width="16" height="20" rx="2"/>`,
  'activity': `<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.48 12H2"/>`,
};

/**
 * Creates an accessible SVG DOM element for a MapLibre marker.
 */
export function createMarkerElement(options: MarkerOptions): HTMLDivElement {
  const {
    icon = 'map-pin',
    color = '#0B3C5D',
    bgSoftColor = '#FFFFFF',
    isTest = false,
    size = 36,
  } = options;

  const container = document.createElement('div');
  container.className = 'routex-map-marker-container group relative cursor-pointer select-none';
  container.style.width = `${size}px`;
  container.style.height = `${size + 8}px`;

  // Marker Pin Shape
  const pin = document.createElement('div');
  pin.className =
    'routex-marker-pin relative flex items-center justify-center transition-transform duration-150 group-hover:scale-110 shadow-md';
  pin.style.width = `${size}px`;
  pin.style.height = `${size}px`;
  pin.style.borderRadius = '50%';
  pin.style.backgroundColor = bgSoftColor;
  pin.style.border = `2.5px solid ${color}`;

  // Diagonal stripe if TEST data (doc 02 section 2 & 4)
  if (isTest) {
    pin.style.backgroundImage =
      'repeating-linear-gradient(45deg, rgba(71,85,105,0.15), rgba(71,85,105,0.15) 3px, transparent 3px, transparent 6px)';
  }

  // Pointer tip
  const tip = document.createElement('div');
  tip.className = 'absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0';
  tip.style.borderLeft = '5px solid transparent';
  tip.style.borderRight = '5px solid transparent';
  tip.style.borderTop = `6px solid ${color}`;

  // Lucide SVG Icon
  const svgMarkup = ICON_SVGS[icon] || ICON_SVGS['map-pin'];
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', `${Math.round(size * 0.52)}`);
  svg.setAttribute('height', `${Math.round(size * 0.52)}`);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', color);
  svg.setAttribute('stroke-width', '2.2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.innerHTML = svgMarkup;

  pin.appendChild(svg);
  container.appendChild(pin);
  container.appendChild(tip);

  if (options.onClick) {
    container.addEventListener('click', (e) => {
      e.stopPropagation();
      options.onClick?.();
    });
  }

  return container;
}

/**
 * Format popup HTML with RouteX design tokens.
 */
export function buildPopupHtml(
  content: string | HTMLElement | { title: string; description?: string; badge?: string }
): string {
  if (typeof content === 'string') {
    return `<div class="routex-popup p-2 max-w-[240px] text-xs font-sans text-text">${content}</div>`;
  }

  if (content instanceof HTMLElement) {
    return content.outerHTML;
  }

  return `
    <div class="routex-popup p-2.5 max-w-[260px] font-sans">
      <div class="flex items-center justify-between gap-2 mb-1">
        <h4 class="font-semibold text-text text-sm leading-tight">${content.title}</h4>
        ${
          content.badge
            ? `<span class="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded-chip bg-surface-2 text-text-2 border border-border">${content.badge}</span>`
            : ''
        }
      </div>
      ${content.description ? `<p class="text-xs text-text-2 leading-relaxed mt-1">${content.description}</p>` : ''}
    </div>
  `;
}
