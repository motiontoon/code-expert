import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import TasksPage from './pages/TasksPage';
import TaskDetail from './pages/TaskDetail';
import ProjectsPage from './pages/ProjectsPage';
import GitHubPage from './pages/GitHubPage';
import FileGuardPage from './pages/FileGuardPage';
import NewTaskPage from './pages/NewTaskPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-dark-bg">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-forge-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-dark-muted">Loading Codex Forge...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout><Dashboard /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks"
        element={
          <ProtectedRoute>
            <Layout><TasksPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks/new"
        element={
          <ProtectedRoute>
            <Layout><NewTaskPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks/:id"
        element={
          <ProtectedRoute>
            <Layout><TaskDetail /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects"
        element={
          <ProtectedRoute>
            <Layout><ProjectsPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/github"
        element={
          <ProtectedRoute>
            <Layout><GitHubPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/file-guard"
        element={
          <ProtectedRoute>
            <Layout><FileGuardPage /></Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
