import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Levels from './pages/Levels';
import LevelDetail from './pages/LevelDetail';
import LessonDetail from './pages/LessonDetail';
import Practice from './pages/Practice';
import Drills from './pages/Drills';
import DrillDetail from './pages/DrillDetail';
import Journal from './pages/Journal';
import JournalEntry from './pages/JournalEntry';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />} />

        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="levels" element={<Levels />} />
          <Route path="levels/:id" element={<LevelDetail />} />
          <Route path="lessons/:id" element={<ErrorBoundary><LessonDetail /></ErrorBoundary>} />
          <Route path="practice" element={<Practice />} />
          <Route path="drills" element={<Drills />} />
          <Route path="drills/:id" element={<DrillDetail />} />
          <Route path="journal" element={<Journal />} />
          <Route path="journal/new" element={<JournalEntry />} />
          <Route path="journal/:id" element={<JournalEntry />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
