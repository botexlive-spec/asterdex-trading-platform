import React from "react";

export default function BinaryTreePlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-screen text-center p-10 bg-gradient-to-br from-green-50 to-blue-50">
      <div className="bg-white rounded-2xl shadow-xl p-12 max-w-2xl">
        <div className="mb-6">
          <svg
            className="w-20 h-20 mx-auto text-green-600 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
            />
          </svg>
        </div>

        <h1 className="text-4xl font-bold mb-4 text-gray-800">
          Binary Tree Visualization
        </h1>

        <p className="text-lg text-gray-600 mb-6 leading-relaxed">
          This page will display your team hierarchy and downline structure with
          interactive tree visualization, volume calculations, match bonus tracking,
          and manual placement tools.
        </p>

        <div className="bg-green-50 border-l-4 border-green-600 p-4 mb-6">
          <p className="text-green-800 font-medium">
            Currently under development — available in version 1.1
          </p>
        </div>

        <div className="flex items-center justify-center gap-2">
          <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-green-100 text-green-700">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
            Status: Coming Soon 🌱
          </span>
        </div>

        <div className="mt-8 text-sm text-gray-500">
          <p className="mb-2">⚠️ Critical MLM Feature - Priority Implementation</p>
          <p>Backend API implementation required:</p>
          <code className="bg-gray-100 px-2 py-1 rounded text-xs">
            server/routes/admin-binary.ts
          </code>
        </div>
      </div>
    </div>
  );
}
