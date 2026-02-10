import React from 'react';
import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <header className="border-b border-dark-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-forge-600 rounded-xl flex items-center justify-center text-white font-bold">
              CF
            </div>
            <span className="font-bold text-xl text-white">Codex Forge</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="btn-ghost text-sm">Login</Link>
            <Link to="/register" className="btn-primary text-sm">Get Started</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-forge-600/10 border border-forge-600/20 text-forge-400 text-sm mb-8">
          <span className="status-dot bg-forge-400 animate-pulse" />
          AI Coding Engine v1.0
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 leading-tight">
          Code 24/7<br />
          <span className="text-forge-400">Without Limits</span>
        </h1>

        <p className="text-xl text-dark-muted max-w-2xl mx-auto mb-12">
          Advanced AI-powered coding automation. Connect your GitHub, describe what you want,
          and let the engine build it — with built-in File Guard protection that reads before writing.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Link to="/register" className="btn-primary text-lg px-8 py-3">
            Start Building
          </Link>
          <Link to="/login" className="btn-secondary text-lg px-8 py-3">
            Sign In
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="card glow-border">
            <div className="w-12 h-12 bg-forge-600/20 rounded-xl flex items-center justify-center text-2xl mb-4">
              ⚡
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">24/7 Autonomous Coding</h3>
            <p className="text-dark-muted text-sm">
              Queue tasks and the AI engine processes them continuously. Features, bugs, refactors,
              tests — it handles everything while you sleep.
            </p>
          </div>

          <div className="card glow-border">
            <div className="w-12 h-12 bg-green-600/20 rounded-xl flex items-center justify-center text-2xl mb-4">
              ⬡
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Full GitHub Integration</h3>
            <p className="text-dark-muted text-sm">
              Connect your account, access all repos, create branches, commit code,
              and open PRs — all directly from the platform.
            </p>
          </div>

          <div className="card glow-border">
            <div className="w-12 h-12 bg-amber-600/20 rounded-xl flex items-center justify-center text-2xl mb-4">
              🛡
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">File Guard Protection</h3>
            <p className="text-dark-muted text-sm">
              Every file must be read before it can be modified. The guard ensures the AI
              always understands existing code before changing it. Zero blind overwrites.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-dark-border">
        <h2 className="text-3xl font-bold text-white text-center mb-16">How It Works</h2>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { step: '01', title: 'Create Account', desc: 'Sign up and connect your GitHub account via OAuth.' },
            { step: '02', title: 'Select Repository', desc: 'Choose which repos the engine can access and modify.' },
            { step: '03', title: 'Describe Task', desc: 'Write what you need: feature, fix, refactor, tests, or docs.' },
            { step: '04', title: 'Engine Delivers', desc: 'The AI reads, codes, tests, and creates a PR — File Guard enforced.' },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="w-12 h-12 bg-forge-600/20 rounded-full flex items-center justify-center text-forge-400 font-mono font-bold mx-auto mb-4">
                {item.step}
              </div>
              <h3 className="font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-dark-muted text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-dark-border py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <p className="text-sm text-dark-muted">Codex Forge v1.0.0</p>
          <p className="text-sm text-dark-muted">AI-Powered Coding Automation</p>
        </div>
      </footer>
    </div>
  );
}
