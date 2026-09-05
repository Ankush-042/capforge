import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import Landing from './pages/Landing.jsx';
import SignIn from './pages/SignIn.jsx';
import SignUp from './pages/SignUp.jsx';
import Onboarding from './pages/Onboarding.jsx';

import FounderDashboard from './pages/FounderDashboard.jsx';
import GapDashboard from './pages/GapDashboard.jsx';
import GapDetail from './pages/GapDetail.jsx';
import CandidateComparison from './pages/CandidateComparison.jsx';
import Readiness from './pages/Readiness.jsx';
import RiskPage from './pages/RiskPage.jsx';
import Team from './pages/Team.jsx';
import Milestones from './pages/Milestones.jsx';
import CompetitorAnalysis from './pages/CompetitorAnalysis.jsx';
import EquityCalculator from './pages/EquityCalculator.jsx';
import Workspace from './pages/Workspace.jsx';

import ContributorDashboard from './pages/ContributorDashboard.jsx';
import ContributorOpportunities from './pages/ContributorOpportunities.jsx';
import SkillDemand from './pages/SkillDemand.jsx';
import ContributorEquityAsk from './pages/ContributorEquityAsk.jsx';
import Connections from './pages/Connections.jsx';

import InvestorDashboard from './pages/InvestorDashboard.jsx';
import InvestorDealFlow from './pages/InvestorDealFlow.jsx';
import InvestorPortfolio from './pages/InvestorPortfolio.jsx';
import Search from './pages/Search.jsx';
import Notifications from './pages/Notifications.jsx';
import Settings from './pages/Settings.jsx';
import StartupDetail from './pages/StartupDetail.jsx';
import { ToastProvider } from './components/Toast.jsx';

import './styles/index.css';

/**
 * Routing fixed per direct bug report: root ('/') now correctly shows the
 * public Landing page. Sign In / Sign Up are real, separate, reachable
 * routes. Every authenticated app screen lives under /app/* and is
 * wrapped in ProtectedRoute — an unauthenticated visitor can no longer
 * land on the dashboard by accident.
 *
 * Sprint 20: Contributor (/app/contributor/*) and Investor
 * (/app/investor/*) routes added, each rendering their own persona-aware
 * Shell nav.
 */
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/sign-up" element={<SignUp />} />

        {/* Authenticated app — Founder */}
        <Route path="/app/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
        <Route path="/app" element={<ProtectedRoute><FounderDashboard /></ProtectedRoute>} />
        <Route path="/app/gaps" element={<ProtectedRoute><GapDashboard /></ProtectedRoute>} />
        <Route path="/app/gaps/:id" element={<ProtectedRoute><GapDetail /></ProtectedRoute>} />
        <Route path="/app/gaps/:id/compare" element={<ProtectedRoute><CandidateComparison /></ProtectedRoute>} />
        <Route path="/app/readiness" element={<ProtectedRoute><Readiness /></ProtectedRoute>} />
        <Route path="/app/risk" element={<ProtectedRoute><RiskPage /></ProtectedRoute>} />
        <Route path="/app/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />
        <Route path="/app/milestones" element={<ProtectedRoute><Milestones /></ProtectedRoute>} />
        <Route path="/app/competitors" element={<ProtectedRoute><CompetitorAnalysis /></ProtectedRoute>} />
        <Route path="/app/equity" element={<ProtectedRoute><EquityCalculator /></ProtectedRoute>} />
        <Route path="/app/workspace" element={<ProtectedRoute><Workspace /></ProtectedRoute>} />

        {/* Authenticated app — Contributor */}
        <Route path="/app/contributor" element={<ProtectedRoute><ContributorDashboard /></ProtectedRoute>} />
        <Route path="/app/contributor/opportunities" element={<ProtectedRoute><ContributorOpportunities /></ProtectedRoute>} />
        <Route path="/app/contributor/skill-demand" element={<ProtectedRoute><SkillDemand /></ProtectedRoute>} />
        <Route path="/app/contributor/equity-ask" element={<ProtectedRoute><ContributorEquityAsk /></ProtectedRoute>} />
        <Route path="/app/contributor/connections" element={<ProtectedRoute><Connections persona="CONTRIBUTOR" /></ProtectedRoute>} />

        {/* Authenticated app — Investor */}
        <Route path="/app/investor" element={<ProtectedRoute><InvestorDashboard /></ProtectedRoute>} />
        <Route path="/app/investor/deal-flow" element={<ProtectedRoute><InvestorDealFlow /></ProtectedRoute>} />
        <Route path="/app/investor/portfolio" element={<ProtectedRoute><InvestorPortfolio /></ProtectedRoute>} />
        <Route path="/app/investor/connections" element={<ProtectedRoute><Connections persona="INVESTOR" /></ProtectedRoute>} />

        {/* Shared */}
        <Route path="/app/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
        <Route path="/app/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/app/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/app/startups/:id" element={<ProtectedRoute><StartupDetail /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
    </ToastProvider>
  </React.StrictMode>
);
