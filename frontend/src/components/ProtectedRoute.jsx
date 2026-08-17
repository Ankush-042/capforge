import { Navigate } from 'react-router-dom';

/**
 * Fixes the routing bug flagged directly: unauthenticated visitors were
 * landing straight on the dashboard with no auth guard at all. Every
 * app-internal route now goes through this first.
 */
export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem('capforge_token');
  if (!token) return <Navigate to="/sign-in" replace />;
  return children;
}
