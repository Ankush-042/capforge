import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PieChart } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import PageHeader from '../components/PageHeader.jsx';
import DonutChart from '../components/charts/DonutChart.jsx';
import { getPortfolioAnalysis } from '../services/startups.js';

const COLORS = ['#7C5CFC', '#4C86F9', '#3FB081', '#F0A84E', '#EF6E85'];

export default function InvestorPortfolio() {
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState(null);

  useEffect(() => {
    getPortfolioAnalysis().then(({ ok, data }) => {
      if (ok && data.success) setPortfolio(data.portfolio);
      setLoading(false);
    });
  }, []);

  if (loading) return <Shell persona="INVESTOR" title="Portfolio"><div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" /></div></Shell>;

  const chartData = (portfolio?.domain_distribution || []).map((d, i) => ({ name: d.domain, value: d.percentage, color: COLORS[i % COLORS.length] }));

  return (
    <Shell persona="INVESTOR" title="Portfolio">
      <PageHeader icon={PieChart} iconBg="bg-violet-50" iconColor="text-violet-600" title="Portfolio" subtitle={`${portfolio?.count || 0} real accepted connections — built from your actual activity, not sample data.`} />

      {(!portfolio || portfolio.count === 0) ? (
        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-12 text-center">
          <p className="text-[15px] text-ink-500">No accepted connections yet — your portfolio builds as you connect with real startups.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
              <p className="text-[15px] font-semibold text-ink-900 mb-4">By domain</p>
              <DonutChart data={chartData} height={200} />
            </div>
            <div className="col-span-2 bg-surface rounded-xl border border-surface-border shadow-card p-7">
              <p className="text-[15px] font-semibold text-ink-900 mb-4">Diversification signal</p>
              {portfolio.concentration_warning ? (
                <p className="text-[15px] text-amber-600 leading-relaxed mb-4">{portfolio.concentration_warning}</p>
              ) : (
                <p className="text-[15px] text-mint-600 leading-relaxed mb-4">Your portfolio is reasonably diversified across domains.</p>
              )}
              {portfolio.diversification_suggestions?.length > 0 && (
                <>
                  <p className="text-[13px] font-medium text-ink-500 mb-2">Suggested for diversification</p>
                  {portfolio.diversification_suggestions.map((s) => (
                    <Link key={s.startup_id} to={`/app/startups/${s.startup_id}`} className="flex items-center justify-between py-2 border-b border-surface-border last:border-0 hover-lift hover:bg-surface-muted/50 -mx-1 px-1 rounded-lg transition-colors">
                      <span className="text-[15px] text-ink-900">{s.name}</span>
                      <span className="text-sm text-violet-600 font-medium">{Math.round(s.score * 100)}%</span>
                    </Link>
                  ))}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </Shell>
  );
}
