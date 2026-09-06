import React from 'react';

/**
 * Phase 8 — standardized icon-led page header, used across every real
 * app screen. Extracted as one shared component instead of hand-
 * duplicating the icon-box pattern in each file, so visual consistency
 * is structural, not a matter of remembering to copy it correctly.
 */
export default function PageHeader({ icon: Icon, iconBg, iconColor, title, subtitle, action }) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center shrink-0`}>
          <Icon size={18} />
        </div>
        <div>
          <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-ink-500 mt-1">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
