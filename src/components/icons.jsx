import React from "react";

/** Inline SVG icons for the main navigation (stroke styling lives in CSS). */
const icons = {
  skills: (
    <svg className="glyph" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M3 9h18M9 9v12" />
    </svg>
  ),
  find: (
    <svg className="glyph" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
    </svg>
  ),
  advanced: (
    <svg className="glyph" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 3h4M12 3v6l6 10a1.8 1.8 0 0 1-1.6 2.8H7.6A1.8 1.8 0 0 1 6 19l6-10V3" />
    </svg>
  ),
  settings: (
    <svg className="glyph" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M18.5 5.5l-2.1 2.1M7.6 16.4l-2.1 2.1" />
    </svg>
  ),
};

export default icons;
