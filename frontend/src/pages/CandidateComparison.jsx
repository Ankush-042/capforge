import React from 'react';
import Shell from '../components/Shell.jsx';

const candidates = [
  { name: 'Priya Data', score: 76, skills: '2/3 match', experience: '4 yrs', availability: 'Part-time', stage: 'Idea ✓' },
  { name: 'Arjun K.', score: 58, skills: '1/3 match', experience: '2 yrs', availability: 'Full-time', stage: 'Idea ✓' },
  { name: 'Meera S.', score: 41, skills: '1/3 match', experience: '6 yrs', availability: 'Advisor', stage: 'MVP ✗' },
];

export default function CandidateComparison() {
  return (
    <Shell title="FoodSense2" subtitle="Compare candidates">
      <div className="mb-6">
        <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">Compare candidates</h1>
        <p className="text-sm text-ink-500 mt-1">For: Full Stack Engineer</p>
      </div>

      <div className="bg-surface rounded-xl border border-surface-border shadow-card overflow-hidden">
        <table className="w-full text-[15px]">
          <thead>
            <tr className="border-b border-surface-border">
              <th className="text-left px-6 py-4 text-[13px] font-medium text-ink-500">Candidate</th>
              <th className="text-left px-6 py-4 text-[13px] font-medium text-ink-500">Match</th>
              <th className="text-left px-6 py-4 text-[13px] font-medium text-ink-500">Skills</th>
              <th className="text-left px-6 py-4 text-[13px] font-medium text-ink-500">Experience</th>
              <th className="text-left px-6 py-4 text-[13px] font-medium text-ink-500">Availability</th>
              <th className="text-left px-6 py-4 text-[13px] font-medium text-ink-500">Stage fit</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) => (
              <tr key={c.name} className="border-b border-surface-border last:border-0 hover:bg-surface-muted/50">
                <td className="px-6 py-4 font-medium text-ink-900">{c.name}</td>
                <td className="px-6 py-4 text-violet-600 font-medium">{c.score}%</td>
                <td className="px-6 py-4 text-ink-700">{c.skills}</td>
                <td className="px-6 py-4 text-ink-700">{c.experience}</td>
                <td className="px-6 py-4 text-ink-700">{c.availability}</td>
                <td className="px-6 py-4 text-ink-700">{c.stage}</td>
                <td className="px-6 py-4"><button className="text-xs bg-violet-50 text-violet-700 px-3 py-1.5 rounded-lg font-medium hover:bg-violet-100 transition-colors">Connect</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
