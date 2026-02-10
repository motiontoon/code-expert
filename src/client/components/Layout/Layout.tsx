import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '◆' },
  { path: '/tasks', label: 'Tasks', icon: '⚡' },
  { path: '/projects', label: 'Projects', icon: '□' },
  { path: '/github', label: 'GitHub', icon: '⬡' },
  { path: '/file-guard', label: 'File Guard', icon: '🛡' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-dark-bg">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-16'
        } bg-dark-surface border-r border-dark-border flex flex-col transition-all duration-300`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-dark-border">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-forge-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              CF
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="font-bold text-white text-sm">Codex Forge</h1>
                <p className="text-[10px] text-dark-muted">AI Coding Engine</p>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200
                  ${isActive
                    ? 'bg-forge-600/20 text-forge-400 border border-forge-600/30'
                    : 'text-dark-muted hover:text-dark-text hover:bg-dark-bg'
                  }`}
              >
                <span className="text-lg">{item.icon}</span>
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Engine Status */}
        <div className="p-3 border-t border-dark-border">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-dark-bg ${sidebarOpen ? '' : 'justify-center'}`}>
            <span className="status-dot bg-green-400 animate-pulse" />
            {sidebarOpen && (
              <span className="text-xs text-dark-muted">Engine Running</span>
            )}
          </div>
        </div>

        {/* User */}
        <div className="p-3 border-t border-dark-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-forge-700 flex items-center justify-center text-white text-xs font-medium overflow-hidden">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                user?.username?.charAt(0).toUpperCase() || '?'
              )}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.displayName || user?.username}</p>
                <p className="text-[10px] text-dark-muted truncate">{user?.email}</p>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="flex-1 text-xs text-dark-muted hover:text-dark-text py-1.5 rounded border border-dark-border hover:bg-dark-bg transition-colors"
              >
                Collapse
              </button>
              <button
                onClick={logout}
                className="flex-1 text-xs text-red-400 hover:text-red-300 py-1.5 rounded border border-red-600/20 hover:bg-red-600/10 transition-colors"
              >
                Logout
              </button>
            </div>
          )}
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-full mt-2 text-xs text-dark-muted hover:text-dark-text py-1 rounded border border-dark-border"
            >
              →
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-7xl mx-auto animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
