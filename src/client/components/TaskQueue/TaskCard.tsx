import React from 'react';
import { Link } from 'react-router-dom';

interface TaskCardProps {
  id: string;
  title: string;
  description: string;
  status: string;
  taskType: string;
  priority: string;
  createdAt: string;
  completedAt?: string;
}

const statusStyles: Record<string, string> = {
  queued: 'bg-gray-600 text-gray-200',
  reading: 'bg-blue-600 text-blue-100',
  coding: 'bg-purple-600 text-purple-100',
  testing: 'bg-yellow-600 text-yellow-100',
  reviewing: 'bg-orange-600 text-orange-100',
  completed: 'bg-green-600 text-green-100',
  failed: 'bg-red-600 text-red-100',
  cancelled: 'bg-gray-500 text-gray-200',
};

const priorityStyles: Record<string, string> = {
  critical: 'text-red-400',
  high: 'text-orange-400',
  medium: 'text-yellow-400',
  low: 'text-gray-400',
};

const typeIcons: Record<string, string> = {
  feature: '✨',
  bugfix: '🐛',
  refactor: '🔧',
  test: '🧪',
  docs: '📝',
  review: '👀',
  custom: '⚡',
};

export default function TaskCard({ id, title, description, status, taskType, priority, createdAt, completedAt }: TaskCardProps) {
  const isActive = ['reading', 'coding', 'testing', 'reviewing'].includes(status);

  return (
    <Link
      to={`/tasks/${id}`}
      className={`block bg-gray-800 rounded-lg border border-gray-700 p-4 hover:border-gray-500 transition-all ${isActive ? 'ring-1 ring-blue-500/30' : ''}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{typeIcons[taskType] || '⚡'}</span>
          <h4 className="text-white font-medium truncate max-w-xs">{title}</h4>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[status] || 'bg-gray-600'}`}>
          {status}
        </span>
      </div>
      <p className="text-gray-400 text-sm line-clamp-2 mb-3">{description}</p>
      <div className="flex items-center justify-between text-xs">
        <span className={`font-medium ${priorityStyles[priority] || 'text-gray-400'}`}>
          {priority}
        </span>
        <span className="text-gray-500">
          {completedAt ? `Completed ${new Date(completedAt).toLocaleDateString()}` : new Date(createdAt).toLocaleDateString()}
        </span>
      </div>
      {isActive && (
        <div className="mt-3 w-full bg-gray-700 rounded-full h-1">
          <div className="bg-blue-500 h-1 rounded-full animate-pulse" style={{ width: '60%' }} />
        </div>
      )}
    </Link>
  );
}
