import React from 'react';

/** Shown while a lazily loaded route chunk downloads. Keeps the surrounding shell mounted. */
export const RouteFallback: React.FC<{ label?: string }> = ({ label = 'Loading page…' }) => (
  <div role="status" aria-live="polite" className="route-fallback">
    <span className="route-fallback__spinner" aria-hidden="true" />
    <span>{label}</span>
  </div>
);
