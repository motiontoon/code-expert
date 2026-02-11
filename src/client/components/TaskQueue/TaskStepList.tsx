import React from 'react';

interface TaskStep {
  id: string;
  stepNumber: number;
  action: string;
  description: string;
  status: string;
  duration?: number;
}

interface TaskStepListProps {
  steps: TaskStep[];
}

const actionIcons: Record<string, string> = {
  read: '📖',
  analyze: '🔍',
  plan: '📋',
  write: '✍️',
  test: '🧪',
  commit: '💾',
  push: '🚀',
};

const statusColors: Record<string, string> = {
  pending: 'border-gray-600 text-gray-500',
  in_progress: 'border-blue-500 text-blue-400',
  completed: 'border-green-500 text-green-400',
  failed: 'border-red-500 text-red-400',
  skipped: 'border-gray-600 text-gray-500',
};

export default function TaskStepList({ steps }: TaskStepListProps) {
  const sorted = [...steps].sort((a, b) => a.stepNumber - b.stepNumber);

  return (
    <div className="space-y-3">
      {sorted.map((step, idx) => (
        <div key={step.id} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm ${statusColors[step.status]}`}>
              {step.status === 'completed' ? '✓' : step.status === 'failed' ? '✗' : step.stepNumber}
            </div>
            {idx < sorted.length - 1 && (
              <div className={`w-0.5 h-6 ${step.status === 'completed' ? 'bg-green-600' : 'bg-gray-700'}`} />
            )}
          </div>
          <div className="flex-1 pb-2">
            <div className="flex items-center gap-2">
              <span>{actionIcons[step.action] || '⚙️'}</span>
              <span className="text-white font-medium text-sm">{step.description}</span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className={`text-xs capitalize ${step.status === 'in_progress' ? 'text-blue-400 animate-pulse' : 'text-gray-500'}`}>
                {step.status.replace('_', ' ')}
              </span>
              {step.duration && (
                <span className="text-xs text-gray-600">{(step.duration / 1000).toFixed(1)}s</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
