import React from "react";

export default function CommissionManagementPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-screen text-center p-10 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="bg-white rounded-2xl shadow-xl p-12 max-w-2xl">
        <div className="mb-6">
          <svg
            className="w-20 h-20 mx-auto text-blue-600 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        </div>

        <h1 className="text-4xl font-bold mb-4 text-gray-800">
          Commission Management
        </h1>

        <p className="text-lg text-gray-600 mb-6 leading-relaxed">
          This module will allow admins to track and manage commission payouts,
          configure level commissions, binary matching, ROI distributions, rank rewards,
          and booster bonuses.
        </p>

        <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6">
          <p className="text-blue-800 font-medium">
            Currently under development — coming soon in version 1.1
          </p>
        </div>

        <div className="flex items-center justify-center gap-2">
          <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-blue-100 text-blue-700">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            Status: Coming Soon 🚧
          </span>
        </div>

        <div className="mt-8 text-sm text-gray-500">
          <p>Backend API implementation required:</p>
          <code className="bg-gray-100 px-2 py-1 rounded text-xs">
            server/routes/admin-commission.ts
          </code>
        </div>
      </div>
    </div>
  );
}
