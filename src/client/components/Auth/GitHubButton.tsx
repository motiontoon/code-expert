import React from 'react';
import { FaGithub } from 'react-icons/fa';

interface GitHubButtonProps {
  onClick: () => void;
  label?: string;
  disabled?: boolean;
}

export default function GitHubButton({ onClick, label = 'Continue with GitHub', disabled }: GitHubButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-center gap-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-lg border border-gray-600 transition-colors"
    >
      <FaGithub className="text-xl" />
      {label}
    </button>
  );
}
