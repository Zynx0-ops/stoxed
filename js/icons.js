/* Inline SVG icon set (stroke-based, 24px grid) */
(function (global) {
  'use strict';
  const s = (body, extra) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra || ''}>${body}</svg>`;

  global.STOX_ICONS = {
    flame: `<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="fg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#FF5A1F"/><stop offset="1" stop-color="#FFB21E"/></linearGradient></defs><path fill="url(#fg)" d="M12.6 1.8c.5 3-1.3 4.7-2.9 6.4C8.1 9.9 6.5 11.7 6.5 14.6a5.5 5.5 0 0 0 11 0c0-2.7-1.4-4.8-2.6-6.3-.3 1.5-1 2.5-2.1 3 .5-3.4-.1-6.6-.2-9.5z"/><path fill="#FFE39A" d="M12 21a2.9 2.9 0 0 1-2.9-2.9c0-1.7 1.2-2.7 2.2-3.8.2 1 .7 1.6 1.4 1.8.1-1 .5-1.8 1.2-2.4.6 1 1 2.4 1 3.6A2.9 2.9 0 0 1 12 21z"/></svg>`,
    bolt: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.2 2.4 4.9 13.1c-.4.5 0 1.2.6 1.2H11l-1.3 7c-.1.8.9 1.2 1.4.6l8.2-10.7c.4-.5 0-1.2-.6-1.2H13l1.6-7c.2-.8-.9-1.3-1.4-.6z"/></svg>`,
    heart: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 21.2c-.3 0-.6-.1-.8-.3C5.6 16.2 2.5 13.2 2.5 9.1 2.5 6.2 4.7 4 7.5 4c1.8 0 3.4.9 4.5 2.3C13.1 4.9 14.7 4 16.5 4c2.8 0 5 2.2 5 5.1 0 4.1-3.1 7.1-8.7 11.8-.2.2-.5.3-.8.3z"/></svg>`,
    lock: s('<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
    check: s('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 'stroke-width="3"'),
    x: s('<path d="M6 6l12 12M18 6L6 18"/>', 'stroke-width="2.6"'),
    sound: s('<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>'),
    mute: s('<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M16 9l5 6M21 9l-5 6"/>'),
    spark: s('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>'),
    bulb: s('<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.9V16h5v-.2c0-.8.4-1.5 1-1.9A6 6 0 0 0 12 3z"/>'),
    retry: s('<path d="M4 12a8 8 0 1 0 2.3-5.6L4 8.7"/><path d="M4 4v4.7h4.7"/>'),
    tap: s('<path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11"/><path d="M12 10.5V9a1.5 1.5 0 0 1 3 0v2"/><path d="M15 10.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-.6a6 6 0 0 1-4.9-2.6L4 14.5a1.6 1.6 0 0 1 2.6-1.9L9 15"/>'),
    trophy: s('<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>'),
    clock: s('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    target: s('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>'),
    star: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>`,
    // lesson glyphs
    building: s('<path d="M3 21h18M4 10h16M12 3l8 4.5H4z"/><path d="M6 10v8M10 10v8M14 10v8M18 10v8"/>'),
    candle: s('<path d="M7 3v3M7 16v5M17 6v3M17 15v4"/><rect x="4.5" y="6" width="5" height="10" rx="1.2"/><rect x="14.5" y="9" width="5" height="6" rx="1.2"/>'),
    levels: s('<path d="M3 7h18M3 17h18" stroke-dasharray="3 3"/><path d="M4 15l4-6 4 6 4-6 4 6"/>'),
    pattern: s('<path d="M3 18l4-8 3 4 3-9 3 9 3-4 2 4"/>'),
    wave: s('<path d="M3 16c2.5 0 3-8 6-8s3.5 8 6 8 3-5 6-5"/><path d="M3 20h18" opacity=".5"/>'),
    order: s('<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M9 8h6M9 12h6M9 16h3"/>'),
    shield: s('<path d="M12 3l7.5 3v5.5c0 4.6-3.1 8.4-7.5 9.5-4.4-1.1-7.5-4.9-7.5-9.5V6z"/><path d="M9 12l2 2 4-4"/>'),
  };
})(window);
