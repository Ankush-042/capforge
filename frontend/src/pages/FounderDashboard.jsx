import React from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, Tooltip } from 'recharts';
import Shell from '../components/Shell.jsx';

/**
 * Founder Dashboard — Sprint 17 reference screen, rebuilt in the corrected
 * light/gradient/chart-rich direction after two rejected attempts.
 * Static/mock data for visual approval; wired to the real API in Sprint 19.
 */

const gapData = [
  { role: 'Full Stack', coverage: 0, fill: '#E15C4D' },
  { role: 'UX/UI', coverage: 0, fill: '#E15C4D' },
  { role: 'Data Sci.', coverage: 100, fill: '#3FB081' },
];

const readinessData = [
  { name: 'Team', value: 33, color: '#7C5CFC' },
  { name: 'Problem', value: 90, color: '#4C86F9' },
  { name: 'Solution', value: 90, color: '#3FB081' },
  { name: 'Market', value: 100, color: '#F0A84E' },
];

function StatCard({ label, value, sub, icon, bg, fg }) {
  return (
    <div className="rounded-xl p-6 min-h-[132px] shadow-card flex flex-col justify-between" style={{ backgroundColor: bg }}>
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium" style={{ color: fg }}>{label}</p>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base" style={{ backgroundColor: `${fg}22`, color: fg }}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-4xl font-bold leading-none mb-2" style={{ color: fg }}>{value}</p>
        <p className="text-xs opacity-70" style={{ color: fg }}>{sub}</p>
      </div>
    </div>
  );
}

export default function FounderDashboard() {
  return (
    <Shell title="FoodSense2" subtitle="AI-powered demand forecasting" activeNav="Dashboard">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-ink-500 mb-1">Good evening, Founder</p>
          <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">FoodSense2</h1>
        </div>
        <button className="text-sm bg-ink-900 hover:bg-ink-700 text-white px-4 py-2.5 rounded-lg shadow-card transition-colors">
          + Discover talent
        </button>
      </div>

      <div className="grid grid-cols-4 gap-5 mb-7">
        <StatCard label="Readiness" value="62" sub="↑ from 50 last week" icon="◒" bg="#EED8FF" fg="#6D28D9" />
        <StatCard label="Team coverage" value="33%" sub="1 of 3 roles filled" icon="◎" bg="#D1EAFE" fg="#1677E8" />
        <StatCard label="Pending requests" value="1" sub="Awaiting response" icon="◐" bg="#FFE8DA" fg="#E84C32" />
        <StatCard label="Milestones" value="6" sub="AI-suggested" icon="◈" bg="#FFF3D1" fg="#C58A00" />
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="col-span-2 bg-surface rounded-xl border border-surface-border shadow-card p-7">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-sm font-semibold text-ink-900">Team coverage by role</p>
              <p className="text-xs text-ink-500">2 critical gaps remaining</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={gapData}>
              <XAxis dataKey="role" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6E7079' }} />
              <Tooltip cursor={{ fill: '#FAFAFB' }} contentStyle={{ borderRadius: 10, border: '1px solid #EDEDF1', fontSize: 12 }} />
              <Bar dataKey="coverage" radius={[8, 8, 0, 0]} barSize={48}>
                {gapData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-5 pt-5 border-t border-surface-border">
            <p className="text-sm font-medium text-ink-900 mb-3">Recommended for Full Stack Engineer</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-xs font-medium text-white">P</div>
                <div>
                  <p className="text-sm font-medium text-ink-900">Priya Data</p>
                  <p className="text-xs text-ink-500">Full-stack · 4 yrs · part-time</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-violet-600">76%</span>
                <button className="text-xs bg-violet-50 text-violet-700 px-3 py-1.5 rounded-lg font-medium hover:bg-violet-100 transition-colors">Connect</button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
          <p className="text-sm font-semibold text-ink-900 mb-1">Readiness breakdown</p>
          <p className="text-xs text-ink-500 mb-2">By dimension</p>
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie data={readinessData} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={3}>
                {readinessData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #EDEDF1', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {readinessData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-ink-500">
                  <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                  {d.name}
                </span>
                <span className="text-ink-900 font-medium">{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
        <p className="text-sm font-semibold text-ink-900 mb-3">Top risk</p>
        <div className="flex items-start gap-3">
          <span className="text-xs font-medium px-2 py-1 rounded-md bg-rose-50 text-rose-500 shrink-0">TEAM · HIGH</span>
          <p className="text-sm text-ink-700">2 critical roles unfilled — Full Stack Engineer, UX/UI Designer.</p>
        </div>
      </div>
    </Shell>
  );
}
