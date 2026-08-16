import React from 'react';

/**
 * Reusable avatar + name + subtitle row — used for candidates,
 * team members, connections, notifications. Matches Attio's
 * confirmed pattern (avatar chip, name, context subtitle, action).
 */
export default function AvatarRow({ initial, name, subtitle, gradientFrom = 'from-blue-500', gradientTo = 'to-violet-500', trailing }) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradientFrom} ${gradientTo} flex items-center justify-center text-xs font-medium text-white`}>
          {initial}
        </div>
        <div>
          <p className="text-[15px] font-medium text-ink-900">{name}</p>
          {subtitle && <p className="text-[13px] text-ink-500">{subtitle}</p>}
        </div>
      </div>
      {trailing}
    </div>
  );
}
