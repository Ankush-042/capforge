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
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<FounderDashboard />} />
        <Route path="/gaps" element={<GapDashboard />} />
        <Route path="/gaps/:id" element={<GapDetail />} />
        <Route path="/readiness" element={<Readiness />} />
        <Route path="/risk" element={<RiskPage />} />
        <Route path="/team" element={<Team />} />
        <Route path="/milestones" element={<Milestones />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
