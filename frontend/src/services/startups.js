import { apiFetch } from './api.js';

export const createStartup = (payload) =>
  apiFetch('/startups', { method: 'POST', body: JSON.stringify(payload) });

export const getMyStartups = () => apiFetch('/startups/mine');
export const getStartup = (id) => apiFetch(`/startups/${id}`);
export const analyzeStartup = (id) => apiFetch(`/startups/${id}/analyze`, { method: 'POST' });
export const confirmStartup = (id, edits) => apiFetch(`/startups/${id}/confirm`, { method: 'PATCH', body: JSON.stringify(edits) });

export const getGaps = (startupId) => apiFetch(`/startups/${startupId}/gaps`);
export const getTeamMembers = (startupId) => apiFetch(`/startups/${startupId}/team`);
export const diagnoseGaps = (startupId) => apiFetch(`/startups/${startupId}/diagnose`, { method: 'POST' });
export const rankCandidates = (gapId) => apiFetch(`/gaps/${gapId}/rank-candidates`, { method: 'POST' });
export const getRecommendationsForStartup = (startupId) => apiFetch(`/startups/${startupId}/recommendations`);

export const assessReadinessRisk = (startupId) => apiFetch(`/startups/${startupId}/assess`, { method: 'POST' });
export const getReadiness = (startupId) => apiFetch(`/startups/${startupId}/readiness`);
export const getRisks = (startupId) => apiFetch(`/startups/${startupId}/risks`);

export const generateMilestones = (startupId) => apiFetch(`/startups/${startupId}/milestones/generate`, { method: 'POST' });
export const getMilestones = (startupId) => apiFetch(`/startups/${startupId}/milestones`);
export const updateMilestone = (id, updates) => apiFetch(`/milestones/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });

export const runCompetitorAnalysis = (startupId) => apiFetch(`/startups/${startupId}/competitor-analysis`, { method: 'POST' });
export const getCompetitorAnalysis = (startupId) => apiFetch(`/startups/${startupId}/competitor-analysis`);

export const calculateEquity = (payload) => apiFetch('/equity/calculate', { method: 'POST', body: JSON.stringify(payload) });

export const getWorkspace = (startupId) => apiFetch(`/startups/${startupId}/workspace`);
export const createTask = (startupId, task) => apiFetch(`/startups/${startupId}/workspace/tasks`, { method: 'POST', body: JSON.stringify(task) });
export const postDiscussion = (startupId, content) => apiFetch(`/startups/${startupId}/workspace/discussions`, { method: 'POST', body: JSON.stringify({ content }) });

export const sendConnection = (payload) => apiFetch('/connections', { method: 'POST', body: JSON.stringify(payload) });
export const respondToConnection = (id, action) => apiFetch(`/connections/${id}/respond`, { method: 'PATCH', body: JSON.stringify({ action }) });
export const getMyConnections = () => apiFetch('/connections');

export const searchStartups = (params) => apiFetch(`/search/startups?${new URLSearchParams(params)}`);
export const semanticSearchStartups = (query) => apiFetch(`/search/startups/semantic?query=${encodeURIComponent(query)}`);
export const getReadinessHistory = (startupId) => apiFetch(`/startups/${startupId}/readiness-history`);
export const getNotificationPreferences = () => apiFetch('/notifications/preferences');
export const updateNotificationPreferences = (payload) => apiFetch('/notifications/preferences', { method: 'PATCH', body: JSON.stringify(payload) });
export const getWorkspaceFiles = (startupId) => apiFetch(`/startups/${startupId}/workspace/files`);
export const addWorkspaceFile = (startupId, payload) => apiFetch(`/startups/${startupId}/workspace/files`, { method: 'POST', body: JSON.stringify(payload) });
export const generateLegalDocument = (startupId, documentType) => apiFetch(`/startups/${startupId}/legal-documents`, { method: 'POST', body: JSON.stringify({ documentType }) });
export const getLegalDocuments = (startupId) => apiFetch(`/startups/${startupId}/legal-documents`);
export const getVentureSummary = (startupId) => apiFetch(`/startups/${startupId}/venture-summary`);
export const startConversation = (otherUserId, context) => apiFetch('/conversations', { method: 'POST', body: JSON.stringify({ otherUserId, ...context }) });
export const getMyConversations = () => apiFetch('/conversations');
export const getConversationMessages = (conversationId) => apiFetch(`/conversations/${conversationId}/messages`);
export const sendMessage = (conversationId, content) => apiFetch(`/conversations/${conversationId}/messages`, { method: 'POST', body: JSON.stringify({ content }) });
export const confirmTeamFormation = (conversationId) => apiFetch(`/conversations/${conversationId}/confirm-team`, { method: 'POST' });
export const searchContributors = (params) => apiFetch(`/search/contributors?${new URLSearchParams(params)}`);

export const getNotifications = (unreadOnly) => apiFetch(`/notifications${unreadOnly ? '?unread=true' : ''}`);
export const markNotificationRead = (id) => apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
export const markAllNotificationsRead = () => apiFetch('/notifications/read-all', { method: 'PATCH' });

export const upsertContributorProfile = (payload) => apiFetch('/profiles/contributor', { method: 'POST', body: JSON.stringify(payload) });
export const upsertInvestorProfile = (payload) => apiFetch('/profiles/investor', { method: 'POST', body: JSON.stringify(payload) });
export const updateBaseProfile = (payload) => apiFetch('/profiles/me', { method: 'PATCH', body: JSON.stringify(payload) });
export const getMyProfile = () => apiFetch('/profiles/me');
export const getUserProfile = (userId) => apiFetch(`/profiles/${userId}`);
export const getMyRecommendationsAsContributor = () => apiFetch('/recommendations/mine');
export const refreshInvestorRecommendations = () => apiFetch('/investors/recommendations/refresh', { method: 'POST' });
export const getInvestorRecommendations = () => apiFetch('/investors/recommendations');
export const getPortfolioAnalysis = () => apiFetch('/investors/portfolio');
export const getSkillDemand = () => apiFetch('/skill-demand');
export const requestVerification = (startupId) => apiFetch(`/startups/${startupId}/request-verification`, { method: 'POST' });
export const getMyReputation = () => apiFetch('/reputation/me');
export const getAdminUsers = () => apiFetch('/admin/users');
export const getAdminStartups = () => apiFetch('/admin/startups');
export const getAdminStats = () => apiFetch('/admin/stats');
export const setStartupVerification = (startupId, status) => apiFetch(`/admin/startups/${startupId}/verification`, { method: 'PATCH', body: JSON.stringify({ status }) });
