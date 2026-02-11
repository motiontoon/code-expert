import React, { useState } from 'react';

interface FileViewerProps {
  filePath: string;
  content: string;
  language?: string;
}

export default function FileViewer({ filePath, content, language }: FileViewerProps) {
  const [copied, setCopied] = useState(false);
  const lines = content.split('\n');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm font-mono">{filePath}</span>
          {language && (
            <span className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-400">{language}</span>
          )}
        </div>
        <button
          onClick={handleCopy}
          className="text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-gray-700"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="overflow-x-auto">
        <pre className="p-4 text-sm font-mono">
          {lines.map((line, i) => (
            <div key={i} className="flex">
              <span className="text-gray-600 select-none w-12 text-right pr-4 flex-shrink-0">{i + 1}</span>
              <span className="text-gray-300">{line || ' '}</span>
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}
