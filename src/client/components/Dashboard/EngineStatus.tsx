import React from 'react';

interface EngineStatusProps {
  isRunning: boolean;
  activeTasks: number;
  maxConcurrent: number;
  aiConfigured: boolean;
}

export default function EngineStatus({ isRunning, activeTasks, maxConcurrent, aiConfigured }: EngineStatusProps) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Engine Status</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Status</span>
          <span className={`flex items-center gap-2 font-medium ${isRunning ? 'text-green-400' : 'text-red-400'}`}>
            <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            {isRunning ? 'Running' : 'Stopped'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Active Tasks</span>
          <span className="text-white font-medium">{activeTasks} / {maxConcurrent}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">AI Provider</span>
          <span className={`font-medium ${aiConfigured ? 'text-green-400' : 'text-yellow-400'}`}>
            {aiConfigured ? 'Anthropic Claude' : 'Not Configured'}
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${(activeTasks / maxConcurrent) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
