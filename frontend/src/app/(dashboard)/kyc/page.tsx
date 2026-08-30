'use client';

import { useState } from 'react';

interface Level {
  num: number;
  name: string;
  steps: { label: string; done: boolean }[];
  status: 'completed' | 'current' | 'locked';
}

const levels: Level[] = [
  {
    num: 1,
    name: 'Basic Verification',
    status: 'completed',
    steps: [
      { label: 'Email Verification', done: true },
      { label: 'Phone Verification', done: true },
    ],
  },
  {
    num: 2,
    name: 'Intermediate Verification',
    status: 'current',
    steps: [
      { label: 'Government ID Upload', done: false },
      { label: 'ID Number Verification', done: false },
    ],
  },
  {
    num: 3,
    name: 'Advanced Verification',
    status: 'locked',
    steps: [
      { label: 'Proof of Address Upload', done: false },
      { label: 'Selfie Verification', done: false },
    ],
  },
];

const submissions = [
  { date: 'Jul 15, 2026', document: 'Government ID (Passport)', status: 'Pending' },
];

export default function KYCPage() {
  const [docType, setDocType] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [frontUploaded, setFrontUploaded] = useState(false);
  const [backUploaded, setBackUploaded] = useState(false);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">KYC Verification</h2>
        <p className="text-tesla-gray-400 text-sm mt-1">Complete verification to unlock higher withdrawal limits.</p>
      </div>

      {/* Level Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {levels.map((level) => (
          <div
            key={level.num}
            className={`bg-tesla-gray-900 border p-6 ${
              level.status === 'current'
                ? 'border-tesla-red'
                : level.status === 'completed'
                  ? 'border-green-600/40'
                  : 'border-tesla-gray-700 opacity-60'
            }`}
          >
            <div className="flex items-center gap-2 mb-4">
              <div
                className={`w-7 h-7 flex items-center justify-center text-xs font-bold rounded-sm ${
                  level.status === 'completed'
                    ? 'bg-green-600/20 text-green-400'
                    : level.status === 'current'
                      ? 'bg-tesla-red/20 text-tesla-red'
                      : 'bg-tesla-gray-700 text-tesla-gray-500'
                }`}
              >
                {level.num}
              </div>
              <div>
                <h3 className="text-sm font-medium text-white">{level.name}</h3>
              </div>
            </div>

            <ul className="space-y-2">
              {level.steps.map((step) => (
                <li key={step.label} className="flex items-center gap-2 text-xs">
                  {step.done ? (
                    <svg className="w-4 h-4 text-green-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-tesla-gray-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                  )}
                  <span className={step.done ? 'text-green-400' : 'text-tesla-gray-400'}>
                    {step.label}
                  </span>
                </li>
              ))}
            </ul>

            {level.status === 'completed' && (
              <div className="mt-4 text-xs text-green-400 font-medium">✓ Verified</div>
            )}
            {level.status === 'locked' && (
              <div className="mt-4 text-xs text-tesla-gray-500">Complete Level 2 to unlock</div>
            )}
          </div>
        ))}
      </div>

      {/* Upload Form */}
      <div className="bg-tesla-gray-900 border border-tesla-gray-700 p-6 max-w-2xl space-y-5">
        <h3 className="text-sm font-medium text-white tracking-wide">Level 2 — Upload Documents</h3>

        <div>
          <label className="block text-xs text-tesla-gray-400 uppercase tracking-wider mb-2">
            Document Type
          </label>
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="w-full bg-tesla-gray-800 border border-tesla-gray-700 text-white px-4 py-3 text-sm rounded-sm appearance-none"
          >
            <option value="">Select document type</option>
            <option value="passport">Passport</option>
            <option value="drivers-license">Driver&apos;s License</option>
            <option value="national-id">National ID Card</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-tesla-gray-400 uppercase tracking-wider mb-2">
            Document Number
          </label>
          <input
            type="text"
            value={docNumber}
            onChange={(e) => setDocNumber(e.target.value)}
            placeholder="Enter your document number"
            className="w-full bg-tesla-gray-800 border border-tesla-gray-700 text-white px-4 py-3 text-sm rounded-sm placeholder-tesla-gray-500"
          />
        </div>

        {/* Front Image Upload */}
        <div>
          <label className="block text-xs text-tesla-gray-400 uppercase tracking-wider mb-2">
            Front of Document
          </label>
          <div
            onClick={() => setFrontUploaded(true)}
            className="border-2 border-dashed border-tesla-gray-700 p-6 text-center hover:border-tesla-gray-500 transition-colors cursor-pointer"
          >
            {frontUploaded ? (
              <div className="flex items-center justify-center gap-2 text-green-400 text-sm">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Front uploaded</span>
              </div>
            ) : (
              <>
                <svg className="w-6 h-6 mx-auto text-tesla-gray-500 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <p className="text-xs text-tesla-gray-400">Click to upload front image</p>
              </>
            )}
          </div>
        </div>

        {/* Back Image Upload */}
        {docType !== 'passport' && (
          <div>
            <label className="block text-xs text-tesla-gray-400 uppercase tracking-wider mb-2">
              Back of Document
            </label>
            <div
              onClick={() => setBackUploaded(true)}
              className="border-2 border-dashed border-tesla-gray-700 p-6 text-center hover:border-tesla-gray-500 transition-colors cursor-pointer"
            >
              {backUploaded ? (
                <div className="flex items-center justify-center gap-2 text-green-400 text-sm">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Back uploaded</span>
                </div>
              ) : (
                <>
                  <svg className="w-6 h-6 mx-auto text-tesla-gray-500 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <p className="text-xs text-tesla-gray-400">Click to upload back image</p>
                </>
              )}
            </div>
          </div>
        )}

        <button
          disabled={!docType || !docNumber || !frontUploaded}
          className="btn-tesla bg-tesla-red text-white px-8 py-3 text-sm font-medium tracking-wide hover:bg-red-700 transition-colors rounded-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Submit for Verification
        </button>
      </div>

      {/* Submissions Table */}
      <div className="bg-tesla-gray-900 border border-tesla-gray-700">
        <div className="px-6 py-4 border-b border-tesla-gray-700">
          <h3 className="text-sm font-medium text-white tracking-wide">Submission History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-tesla-gray-500 uppercase tracking-wider border-b border-tesla-gray-700">
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Document</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((row, i) => (
                <tr key={i} className="border-b border-tesla-gray-700/50 last:border-b-0">
                  <td className="px-6 py-4 text-sm text-tesla-gray-300">{row.date}</td>
                  <td className="px-6 py-4 text-sm text-white">{row.document}</td>
                  <td className="px-6 py-4 text-xs font-medium text-yellow-400">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
