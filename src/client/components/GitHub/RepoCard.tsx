import React from 'react';
import { FaStar, FaLock, FaCodeBranch } from 'react-icons/fa';

interface RepoCardProps {
  fullName: string;
  description?: string;
  language?: string;
  starCount?: number;
  isPrivate?: boolean;
  defaultBranch?: string;
  onClick?: () => void;
}

const langColors: Record<string, string> = {
  TypeScript: 'bg-blue-400',
  JavaScript: 'bg-yellow-400',
  Python: 'bg-green-400',
  Rust: 'bg-orange-400',
  Go: 'bg-cyan-400',
  Java: 'bg-red-400',
  Ruby: 'bg-red-500',
  CSS: 'bg-purple-400',
  HTML: 'bg-orange-500',
};

export default function RepoCard({ fullName, description, language, starCount, isPrivate, defaultBranch, onClick }: RepoCardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-gray-800 rounded-lg border border-gray-700 p-4 hover:border-gray-500 transition-colors ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-blue-400 font-medium">{fullName}</h4>
        <div className="flex items-center gap-2">
          {isPrivate && <FaLock className="text-gray-500 text-xs" />}
          {starCount !== undefined && starCount > 0 && (
            <span className="flex items-center gap-1 text-yellow-400 text-xs">
              <FaStar /> {starCount}
            </span>
          )}
        </div>
      </div>
      {description && <p className="text-gray-400 text-sm mb-3 line-clamp-2">{description}</p>}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        {language && (
          <span className="flex items-center gap-1">
            <span className={`w-2.5 h-2.5 rounded-full ${langColors[language] || 'bg-gray-400'}`} />
            {language}
          </span>
        )}
        {defaultBranch && (
          <span className="flex items-center gap-1">
            <FaCodeBranch /> {defaultBranch}
          </span>
        )}
      </div>
    </div>
  );
}
