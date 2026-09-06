import React, { useState, useEffect } from 'react';
import { Users, Crown, CircleAlert } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import AvatarRow from '../components/charts/AvatarRow.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { Users2 } from 'lucide-react';
import { getMyStartups, getTeamMembers, getGaps } from '../services/startups.js';

const GRADIENTS = ['from-amber-500 to-rose-500', 'from-blue-500 to-violet-500', 'from-mint-500 to-blue-500', 'from-violet-500 to-rose-500'];

export default function Team() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [openGaps, setOpenGaps] = useState([]);
  const [startup, setStartup] = useState(null);

  useEffect(() => {
    async function load() {
      const { ok, data } = await getMyStartups();
      if (!ok || !data.success || data.startups.length === 0) { setLoading(false); return; }
      const s = data.startups[0];
      setStartup(s);
      const [teamRes, gapsRes] = await Promise.all([getTeamMembers(s.id), getGaps(s.id)]);
      if (teamRes.ok && teamRes.data.success) setMembers(teamRes.data.members);
      if (gapsRes.ok && gapsRes.data.success) setOpenGaps(gapsRes.data.gaps.filter((g) => g.status !== 'FILLED'));
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <Shell title="Team"><div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" /></div></Shell>;

  const coverage = members.length + openGaps.length > 0 ? Math.round((members.length / (members.length + openGaps.length)) * 100) : 0;

  return (
    <Shell title={startup?.name || 'Team'} subtitle="Team">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center"><Users size={18} /></div>
          <div>
            <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">Team</h1>
            <p className="text-sm text-ink-500">{members.length} member{members.length !== 1 ? 's' : ''} · {coverage}% role coverage</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
          <p className="text-[15px] font-semibold text-ink-900 mb-4">Current team</p>
          {members.length === 0 ? (
            <EmptyState icon={Users2} message="No team members yet." />
          ) : (
            <div className="space-y-4">
              {members.map((m, i) => (
                <AvatarRow key={m.id} initial={(m.display_name || '?')[0]} name={m.display_name} subtitle={m.role}
                  gradientFrom={GRADIENTS[i % GRADIENTS.length].split(' ')[0]} gradientTo={GRADIENTS[i % GRADIENTS.length].split(' ')[1]}
                  trailing={m.is_founder ? <Crown size={15} className="text-amber-500" /> : <span className="text-xs px-2 py-1 rounded-md bg-mint-50 text-mint-500 font-medium">Active</span>} />
              ))}
            </div>
          )}
        </div>
        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
          <p className="text-[15px] font-semibold text-ink-900 mb-4">Open roles</p>
          {openGaps.length === 0 ? (
            <div className="flex items-center gap-2 text-mint-500 py-6 justify-center"><CircleAlert size={16} /><p className="text-[13px]">All roles covered.</p></div>
          ) : (
            <div className="space-y-3">
              {openGaps.map((g) => (
                <div key={g.id} className="flex items-center justify-between py-2 border-b border-surface-border last:border-0">
                  <p className="text-[15px] text-ink-900">{g.role}</p>
                  <span className="text-xs px-2 py-1 rounded-md bg-rose-50 text-rose-500 font-medium">{g.priority_level}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
