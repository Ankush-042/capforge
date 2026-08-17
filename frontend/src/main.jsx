import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import FounderDashboard from './pages/FounderDashboard.jsx';
import GapDashboard from './pages/GapDashboard.jsx';
import GapDetail from './pages/GapDetail.jsx';
import Readiness from './pages/Readiness.jsx';
import RiskPage from './pages/RiskPage.jsx';
import Team from './pages/Team.jsx';
import Milestones from './pages/Milestones.jsx';
import CompetitorAnalysis from './pages/CompetitorAnalysis.jsx';
import EquityCalculator from './pages/EquityCalculator.jsx';
import Workspace from './pages/Workspace.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Onboarding from './pages/Onboarding.jsx';
import CandidateComparison from './pages/CandidateComparison.jsx';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/landing" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/" element={<FounderDashboard />} />
        <Route path="/gaps" element={<GapDashboard />} />
        <Route path="/gaps/:id" element={<GapDetail />} />
        <Route path="/gaps/:id/compare" element={<CandidateComparison />} />
        <Route path="/readiness" element={<Readiness />} />
        <Route path="/risk" element={<RiskPage />} />
        <Route path="/team" element={<Team />} />
        <Route path="/milestones" element={<Milestones />} />
        <Route path="/competitors" element={<CompetitorAnalysis />} />
        <Route path="/equity" element={<EquityCalculator />} />
        <Route path="/workspace" element={<Workspace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
