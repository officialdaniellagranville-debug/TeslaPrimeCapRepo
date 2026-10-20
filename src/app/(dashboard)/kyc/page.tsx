'use client';

import { useState, useEffect, useCallback, Component, type ReactNode, type ErrorInfo } from 'react';
import TeslaLogo from '@/components/TeslaLogo';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/lib/api';

// ── Local Error Boundary for KYC page ──
class KycErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  state = { hasError: false, error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[KYC Error Boundary]', error?.message, error?.stack, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="space-y-5">
          <div>
            <h2 className="text-white font-bold text-lg">KYC Verification</h2>
            <p className="text-gray-500 text-sm mt-0.5">Complete all three verification levels to unlock withdrawals</p>
          </div>
          <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-6 text-center">
            <p className="text-red-400 text-sm font-medium mb-2">Failed to load KYC page</p>
            <p className="text-gray-500 text-xs mb-4">An error occurred while loading. Please try again.</p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              className="bg-[#CC0000] hover:bg-[#a30000] text-white font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ──────────────────────────────────────────────
// KYC Level definitions
// ──────────────────────────────────────────────

type DocType = 'id_front' | 'id_back' | 'selfie' | 'proof_of_address';

interface LevelConfig {
  level: 1 | 2 | 3;
  title: string;
  subtitle: string;
  description: string;
  documents: { type: DocType; label: string; hint: string }[];
  benefits: string[];
}

const LEVELS: LevelConfig[] = [
  {
    level: 1,
    title: 'Level 1 — Identity Verification',
    subtitle: 'Government-issued photo ID',
    description: 'Upload the front and back of your government-issued photo ID (driver license, passport, or national ID card).',
    documents: [
      { type: 'id_front', label: 'ID — Front Side', hint: 'Driver license, passport, or national ID (front)' },
      { type: 'id_back',  label: 'ID — Back Side',  hint: 'Back of your ID document' },
    ],
    benefits: ['Deposit up to $5,000', 'Trade on demo & live markets', 'Access to Basic investment plan'],
  },
  {
    level: 2,
    title: 'Level 2 — Facial Verification',
    subtitle: 'Selfie for identity match',
    description: 'Take a clear selfie so we can match your face to the ID you submitted in Level 1. Ensure good lighting and no face coverings.',
    documents: [
      { type: 'selfie', label: 'Selfie', hint: 'Clear, well-lit photo of your face' },
    ],
    benefits: ['Deposit up to $50,000', 'Unlock Silver & Gold investment plans', 'Priority customer support'],
  },
  {
    level: 3,
    title: 'Level 3 — Address Verification',
    subtitle: 'Proof of residential address',
    description: 'Upload a recent utility bill, bank statement, or government-issued letter showing your name and address (issued within the last 90 days).',
    documents: [
      { type: 'proof_of_address', label: 'Proof of Address', hint: 'Utility bill, bank statement, or tax document (last 90 days)' },
    ],
    benefits: ['Withdrawals unlocked', 'Deposit up to $250,000', 'Unlock Platinum plan', 'Instant withdrawal processing'],
  },
];

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function levelFromString(s: string | undefined | null): number {
  if (!s) return 0;
  const m = /LEVEL_(\d)/.exec(s);
  return m ? parseInt(m[1], 10) : 0;
}

function formatDate(iso?: string | Date | null): string {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function statusBadge(status?: string) {
  if (!status) return null;
  const map: Record<string, string> = {
    pending:  'bg-yellow-900/30 text-yellow-400 border-yellow-800/50',
    approved: 'bg-green-900/30  text-green-400  border-green-800/50',
    rejected: 'bg-red-900/30    text-red-400    border-red-800/50',
    expired:  'bg-gray-800/40   text-gray-400   border-gray-700/50',
  };
  const cls = map[status] || 'bg-gray-800/40 text-gray-400 border-gray-700/50';
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cls} capitalize`}>
      {status}
    </span>
  );
}

const DOC_LABEL: Record<DocType, string> = {
  id_front: 'ID — Front',
  id_back: 'ID — Back',
  selfie: 'Selfie',
  proof_of_address: 'Proof of Address',
};

// ──────────────────────────────────────────────
// File picker sub-component
// ──────────────────────────────────────────────

interface FilePickerProps {
  label: string;
  hint: string;
  file: File | null;
  onFile: (f: File | null) => void;
  previewUrl?: string | null;
}

function FilePicker({ label, hint, file, onFile, previewUrl }: FilePickerProps) {
  return (
    <div>
      <label className="block text-gray-300 text-sm font-medium mb-2">{label}</label>
      <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-tesla-border rounded-xl hover:border-[#CC0000]/50 transition-colors cursor-pointer bg-[#1a1a1a] overflow-hidden">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt={label} className="h-full w-full object-contain" />
        ) : file ? (
          <span className="text-green-400 text-sm font-medium px-3 text-center">{file.name}</span>
        ) : (
          <>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span className="text-gray-500 text-sm mt-2 px-3 text-center">{hint}</span>
          </>
        )}
        <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0] || null)} />
      </label>
      {file && (
        <button
          type="button"
          onClick={() => onFile(null)}
          className="text-xs text-gray-500 hover:text-red-400 mt-1"
        >
          Remove file
        </button>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Level card sub-component
// ──────────────────────────────────────────────

interface LevelCardProps {
  config: LevelConfig;
  status: 'locked' | 'available' | 'pending' | 'approved' | 'rejected';
  isExpanded: boolean;
  onExpand: () => void;
  onSubmit: (docs: { type: DocType; file: File }[]) => Promise<void>;
  submitting: boolean;
  lastRejectionNote?: string | null;
}

function LevelCard({ config, status, isExpanded, onExpand, onSubmit, submitting, lastRejectionNote }: LevelCardProps) {
  const [files, setFiles] = useState<Record<DocType, File | null>>({
    id_front: null, id_back: null, selfie: null, proof_of_address: null,
  });

  const setFile = (type: DocType, f: File | null) => setFiles(prev => ({ ...prev, [type]: f }));
  const allFilesReady = config.documents.every(d => files[d.type]);

  const statusIcon = () => {
    if (status === 'approved') {
      return (
        <div className="w-9 h-9 rounded-full bg-green-900/30 border border-green-700/50 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        </div>
      );
    }
    if (status === 'pending') {
      return (
        <div className="w-9 h-9 rounded-full bg-yellow-900/30 border border-yellow-700/50 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
        </div>
      );
    }
    if (status === 'rejected') {
      return (
        <div className="w-9 h-9 rounded-full bg-red-900/30 border border-red-700/50 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </div>
      );
    }
    if (status === 'available') {
      return (
        <div className="w-9 h-9 rounded-full bg-[#CC0000]/15 border border-[#CC0000]/40 flex items-center justify-center">
          <span className="text-[#ff5050] font-bold text-sm">{config.level}</span>
        </div>
      );
    }
    // locked
    return (
      <div className="w-9 h-9 rounded-full bg-gray-800/60 border border-gray-700/60 flex items-center justify-center">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
      </div>
    );
  };

  const statusText = () => {
    if (status === 'approved') return <span className="text-green-400 text-xs font-medium">Approved</span>;
    if (status === 'pending')  return <span className="text-yellow-400 text-xs font-medium">Pending review</span>;
    if (status === 'rejected') return <span className="text-red-400 text-xs font-medium">Rejected — resubmit</span>;
    if (status === 'available') return <span className="text-[#ff5050] text-xs font-medium">Ready to verify</span>;
    return <span className="text-gray-500 text-xs font-medium">Locked</span>;
  };

  return (
    <div className={`bg-tesla-card border rounded-xl overflow-hidden transition-colors ${
      status === 'available' ? 'border-[#CC0000]/40' :
      status === 'approved'  ? 'border-green-800/40' :
      status === 'rejected'  ? 'border-red-800/40' :
      'border-tesla-border'
    }`}>
      <button
        type="button"
        onClick={onExpand}
        disabled={status === 'locked'}
        className="w-full flex items-start gap-4 p-4 text-left disabled:cursor-not-allowed"
      >
        {statusIcon()}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-white font-semibold text-sm">{config.title}</h3>
            {statusText()}
          </div>
          <p className="text-gray-500 text-xs mt-0.5">{config.subtitle}</p>
        </div>
        {status === 'available' && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        )}
      </button>

      {isExpanded && status === 'available' && (
        <div className="px-4 pb-4 space-y-4 border-t border-tesla-border/50 pt-4">
          <p className="text-gray-400 text-sm">{config.description}</p>

          <div className="grid sm:grid-cols-2 gap-4">
            {config.documents.map(d => (
              <FilePicker
                key={d.type}
                label={d.label}
                hint={d.hint}
                file={files[d.type]}
                onFile={(f) => setFile(d.type, f)}
                previewUrl={files[d.type] ? URL.createObjectURL(files[d.type]!) : null}
              />
            ))}
          </div>

          {lastRejectionNote && (
            <div className="bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">
              <p className="text-red-300 text-xs font-medium">Previous submission rejected:</p>
              <p className="text-red-200/70 text-xs mt-0.5">{lastRejectionNote}</p>
            </div>
          )}

          <div className="bg-[#1a1a1a] rounded-lg p-3">
            <p className="text-gray-500 text-xs font-medium mb-1.5">Unlocks:</p>
            <ul className="space-y-1">
              {config.benefits.map(b => (
                <li key={b} className="flex items-start gap-2 text-xs text-gray-300">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {b}
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            disabled={!allFilesReady || submitting}
            onClick={() => onSubmit(config.documents.map(d => ({ type: d.type, file: files[d.type]! })))}
            className="w-full bg-[#CC0000] hover:bg-[#a30000] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors text-sm"
          >
            {submitting ? 'Submitting…' : `Submit Level ${config.level} Verification`}
          </button>
        </div>
      )}

      {isExpanded && status === 'pending' && (
        <div className="px-4 pb-4 border-t border-tesla-border/50 pt-4">
          <div className="bg-yellow-900/10 border border-yellow-800/30 rounded-lg px-3 py-2 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            <p className="text-yellow-300 text-xs">Your documents are under review. This usually takes 1–2 business days.</p>
          </div>
        </div>
      )}

      {isExpanded && status === 'approved' && (
        <div className="px-4 pb-4 border-t border-tesla-border/50 pt-4">
          <div className="bg-green-900/10 border border-green-800/30 rounded-lg px-3 py-2 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            <p className="text-green-300 text-xs">Level {config.level} verified. You can now proceed to the next level.</p>
          </div>
        </div>
      )}

      {isExpanded && status === 'rejected' && (
        <div className="px-4 pb-4 border-t border-tesla-border/50 pt-4 space-y-3">
          {lastRejectionNote && (
            <div className="bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">
              <p className="text-red-300 text-xs font-medium">Rejection reason:</p>
              <p className="text-red-200/70 text-xs mt-0.5">{lastRejectionNote}</p>
            </div>
          )}
          <p className="text-gray-400 text-xs">Please correct the issue and resubmit your documents below.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {config.documents.map(d => (
              <FilePicker
                key={d.type}
                label={d.label}
                hint={d.hint}
                file={files[d.type]}
                onFile={(f) => setFile(d.type, f)}
                previewUrl={files[d.type] ? URL.createObjectURL(files[d.type]!) : null}
              />
            ))}
          </div>
          <button
            type="button"
            disabled={!allFilesReady || submitting}
            onClick={() => onSubmit(config.documents.map(d => ({ type: d.type, file: files[d.type]! })))}
            className="w-full bg-[#CC0000] hover:bg-[#a30000] disabled:opacity-40 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
          >
            {submitting ? 'Resubmitting…' : `Resubmit Level ${config.level}`}
          </button>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Main KYC page
// ──────────────────────────────────────────────

function KycPageInner() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [expandedLevel, setExpandedLevel] = useState<number | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [verificationByLevel, setVerificationByLevel] = useState<Record<number, any>>({});

  // KYC verification code modal state
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [codeModalData, setCodeModalData] = useState<{ docs: { type: DocType; file: File }[]; targetLevel: 1 | 2 | 3 } | null>(null);
  const [kycCode, setKycCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [codeSending, setCodeSending] = useState(false);

  const currentLevel = levelFromString(user?.kycLevel);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.kyc.status();
      // Safely extract data — handle missing/undefined fields
      const docs = Array.isArray(data?.documents) ? data.documents : [];
      setHistory(docs);

      // Build a map of verification status per level
      const v = data?.verification;
      const byLevel: Record<number, any> = {};
      if (v && v.level) {
        const lvl = levelFromString(v.level);
        if (lvl >= 1 && lvl <= 3) {
          byLevel[lvl] = v;
        }
      }
      setVerificationByLevel(byLevel);

      // Auto-expand the next available level
      const nextLevel = currentLevel + 1;
      if (nextLevel >= 1 && nextLevel <= 3) {
        setExpandedLevel(nextLevel);
      } else if (currentLevel === 0) {
        setExpandedLevel(1);
      } else {
        setExpandedLevel(null);
      }
    } catch (e: any) {
      console.error('[KYC] refresh error:', e);
      setError(e.message || 'Failed to load KYC status');
    } finally {
      setLoading(false);
    }
  }, [currentLevel]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const performSubmit = async (docs: { type: DocType; file: File }[], targetLevel: 1 | 2 | 3, code?: string) => {
    // Upload each file individually to get a fileUrl
    const uploaded: { type: DocType; fileUrl: string }[] = [];
    for (const d of docs) {
      const fd = new FormData();
      fd.append('file', d.file);
      const up = await api.kyc.upload(fd);
      if (!up?.success || !up?.data?.fileUrl) {
        throw new Error(up?.error?.message || `Failed to upload ${DOC_LABEL[d.type]}`);
      }
      uploaded.push({ type: d.type, fileUrl: up.data.fileUrl });
    }

    // Submit verification (include code for Level 1)
    const payload: any = { level: targetLevel, documents: uploaded };
    if (targetLevel === 1 && code) payload.verificationCode = code;
    await api.kyc.submit(payload);
    setSuccess(`Level ${targetLevel} documents submitted successfully. We will review and notify you within 1–2 business days.`);
    refresh();
  };

  const handleSubmit = async (docs: { type: DocType; file: File }[]) => {
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      // Determine target level from doc types
      const docTypes = docs.map(d => d.type);
      let targetLevel: 1 | 2 | 3 = 1;
      if (docTypes.includes('proof_of_address')) targetLevel = 3;
      else if (docTypes.includes('selfie')) targetLevel = 2;
      else targetLevel = 1;

      // Level 1 requires the KYC verification code modal first
      if (targetLevel === 1) {
        setCodeModalData({ docs, targetLevel });
        setCodeModalOpen(true);
        setKycCode('');
        setCodeError('');
        setSubmitting(false);
        return;
      }

      await performSubmit(docs, targetLevel);
    } catch (e: any) {
      setError(e.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCodeSubmit = async () => {
    if (!codeModalData || !kycCode.trim()) return;
    const docs = codeModalData.docs;
    const targetLevel = codeModalData.targetLevel;
    const code = kycCode.trim();
    // Close modal immediately before async work
    setCodeModalOpen(false);
    setCodeModalData(null);
    setKycCode('');
    setCodeError('');
    setCodeSending(true);
    setSubmitting(true);
    try {
      await performSubmit(docs, targetLevel, code);
    } catch (e: any) {
      setError(e.message || 'Submission failed. Please check your verification code and try again.');
    } finally {
      setCodeSending(false);
      setSubmitting(false);
    }
  };

  const handleCodeModalClose = () => {
    if (codeSending) return;
    setCodeModalOpen(false);
    setCodeModalData(null);
    setKycCode('');
    setCodeError('');
    setSubmitting(false);
  };

  // Determine status for each level
  const getStatus = (lvl: 1 | 2 | 3): 'locked' | 'available' | 'pending' | 'approved' | 'rejected' => {
    const v = verificationByLevel[lvl];
    if (v?.status === 'approved') return 'approved';
    if (v?.status === 'pending')  return 'pending';
    if (v?.status === 'rejected') return 'rejected';
    if (currentLevel + 1 === lvl) return 'available';
    if (lvl <= currentLevel) return 'approved'; // implicit — already promoted
    return 'locked';
  };

  // NOTE: We intentionally do NOT update the global auth store's kycLevel from here.
  // The dashboard layout already calls fetchUser() on every route change, so any
  // kycLevel changes approved by admin will be picked up automatically.
  // Previously, calling setUser() via queueMicrotask here caused React error #185
  // ("Cannot update a component while rendering a different component") because
  // the Zustand store update forced the layout to re-render mid-cycle.

  // Derive profile info for the user card
  const firstName = user?.profile?.firstName || '';
  const lastName = user?.profile?.lastName || '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || user?.email?.split('@')[0] || 'User';
  const initials = [firstName?.charAt(0), lastName?.charAt(0)].filter(Boolean).join('').toUpperCase() || 'U';
  const avatarUrl = user?.profile?.avatarUrl || null;
  const email = user?.email || '';
  const kycLevelStr = user?.kycLevel || 'LEVEL_0';
  const activeMode = user?.activeMode || 'demo';

  function kycBadgeColor(level: string) {
    const l = (level || '').toLowerCase();
    if (l === 'level_3') return 'bg-green-600/15 text-green-400 border-green-700/40';
    if (l === 'level_2') return 'bg-amber-600/15 text-amber-400 border-amber-700/40';
    if (l === 'level_1') return 'bg-blue-600/15 text-blue-400 border-blue-700/40';
    return 'bg-gray-600/15 text-gray-400 border-gray-700/40';
  }

  function kycBadgeLabel(level: string) {
    const l = (level || '').toLowerCase();
    if (l === 'level_3') return 'Verified Lv.3';
    if (l === 'level_2') return 'Verified Lv.2';
    if (l === 'level_1') return 'Verified Lv.1';
    return 'Unverified';
  }

  return (
    <div className="space-y-5">
      {/* User Profile Card with KYC Level */}
      <div className="bg-tesla-card border border-tesla-border rounded-xl p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-[#CC0000] flex items-center justify-center text-white text-sm font-bold shrink-0 overflow-hidden">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-white font-bold text-base">{fullName}</h2>
            <span className="bg-[#CC0000]/15 text-[#CC0000] text-[10px] font-bold px-2 py-0.5 rounded-full capitalize">
              {activeMode === 'live' ? 'Live' : 'Demo'}
            </span>
            <span className={`${kycBadgeColor(kycLevelStr)} text-[10px] font-bold px-2 py-0.5 rounded-full border`}>
              {kycBadgeLabel(kycLevelStr)}
            </span>
          </div>
          <p className="text-gray-500 text-xs mt-0.5 truncate">{email}</p>
        </div>
      </div>

      {/* Progress Stepper */}
      <div className="bg-tesla-card border border-tesla-border rounded-xl p-4">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((lvl, i) => {
            const isDone = currentLevel >= lvl;
            const isCurrent = currentLevel + 1 === lvl;
            const isLocked = currentLevel + 1 < lvl;
            return (
              <div key={lvl} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1.5 min-w-[64px]">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                    isDone ? 'bg-green-900/30 border-green-600 text-green-400' :
                    isCurrent ? 'bg-[#CC0000]/15 border-[#CC0000] text-[#ff5050]' :
                    'bg-gray-800/40 border-gray-700 text-gray-500'
                  }`}>
                    {isDone ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    ) : isLocked ? (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                    ) : lvl}
                  </div>
                  <span className={`text-[10px] font-medium ${isDone ? 'text-green-400' : isCurrent ? 'text-[#ff5050]' : 'text-gray-500'}`}>
                    Level {lvl}
                  </span>
                </div>
                {i < 2 && (
                  <div className={`flex-1 h-0.5 mx-2 ${isDone ? 'bg-green-600/50' : 'bg-gray-700/50'}`} />
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-3 pt-3 border-t border-tesla-border/50 text-center">
          {currentLevel === 0 && <p className="text-gray-400 text-xs">Start with Level 1 to begin verification.</p>}
          {currentLevel === 1 && <p className="text-gray-400 text-xs">Level 1 verified. Complete Level 2 to unlock higher limits.</p>}
          {currentLevel === 2 && <p className="text-gray-400 text-xs">Level 2 verified. Complete Level 3 to unlock withdrawals.</p>}
          {currentLevel === 3 && <p className="text-green-400 text-xs font-medium">All levels verified — withdrawals unlocked.</p>}
        </div>
      </div>

      {error && <div className="bg-red-900/30 border border-red-800/50 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>}
      {success && <div className="bg-green-900/30 border border-green-800/50 text-green-400 text-sm rounded-lg px-4 py-3">{success}</div>}

      {/* Level Cards */}
      {loading ? (
        <div className="bg-tesla-card border border-tesla-border rounded-xl p-8 text-center">
          <p className="text-gray-500 text-sm">Loading KYC status…</p>
        </div>
      ) : (
        <div className="space-y-3">
          {LEVELS.map(cfg => (
            <LevelCard
              key={cfg.level}
              config={cfg}
              status={getStatus(cfg.level)}
              isExpanded={expandedLevel === cfg.level}
              onExpand={() => setExpandedLevel(expandedLevel === cfg.level ? null : cfg.level)}
              onSubmit={handleSubmit}
              submitting={submitting}
              lastRejectionNote={verificationByLevel[cfg.level]?.notes || null}
            />
          ))}
        </div>
      )}

      {/* Submission History (real data only — empty state if none) */}
      <div>
        <h3 className="text-white font-semibold text-sm mb-3">Submission History</h3>
        <div className="bg-tesla-card border border-tesla-border rounded-xl overflow-hidden">
          {history.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
              </svg>
              <p className="text-gray-500 text-sm">No KYC submissions yet</p>
              <p className="text-gray-600 text-xs mt-1">Your submitted documents will appear here once you start the verification process.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-tesla-border">
                  <th className="text-left text-gray-500 font-medium px-4 py-3">Document Type</th>
                  <th className="text-left text-gray-500 font-medium px-4 py-3">Submitted</th>
                  <th className="text-right text-gray-500 font-medium px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item: any) => (
                  <tr key={item.id} className="border-b border-tesla-border/50 last:border-0">
                    <td className="text-white px-4 py-3">{DOC_LABEL[item.type as DocType] || item.type}</td>
                    <td className="text-gray-400 px-4 py-3">{formatDate(item.createdAt)}</td>
                    <td className="px-4 py-3 text-right">{statusBadge(item.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* KYC Verification Code Modal */}
      {codeModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={handleCodeModalClose}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          {/* Modal */}
          <div
            className="relative bg-[#0d0d0d] border border-tesla-border rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-2xl animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={handleCodeModalClose}
              disabled={codeSending}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-500 hover:text-white rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>

            {/* Tesla Logo */}
            <div className="flex justify-center mb-5">
              <TeslaLogo variant="icon" className="h-14 w-14" />
            </div>

            {/* Title */}
            <h3 className="text-white font-bold text-lg text-center mb-2">KYC Verification Code Required</h3>
            <p className="text-gray-400 text-sm text-center mb-6 leading-relaxed">
              Before submitting your Level 1 documents, you must obtain a KYC Verification Code from the admin team.
            </p>

            {/* How to get code */}
            <div className="bg-[#1a1a1a] border border-tesla-border rounded-xl p-4 mb-5">
              <p className="text-[#CC0000] text-xs font-bold uppercase tracking-wider mb-2">How to Get Your Code</p>
              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-[#CC0000]/15 border border-[#CC0000]/30 flex items-center justify-center shrink-0 mt-0.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#CC0000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                  </div>
                  <div>
                    <p className="text-white text-xs font-medium">Live Chat</p>
                    <p className="text-gray-500 text-[11px]">Click the chat widget on your dashboard to speak with an admin directly</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-[#CC0000]/15 border border-[#CC0000]/30 flex items-center justify-center shrink-0 mt-0.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#CC0000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                  </div>
                  <div>
                    <p className="text-white text-xs font-medium">Email</p>
                    <p className="text-gray-500 text-[11px]">Contact our official support email for assistance</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Code input */}
            <div className="mb-4">
              <label className="block text-gray-300 text-sm font-medium mb-1.5">Enter Your Verification Code</label>
              <input
                type="text"
                value={kycCode}
                onChange={(e) => { setKycCode(e.target.value); setCodeError(''); }}
                placeholder="Enter code provided by admin"
                className="w-full bg-[#1a1a1a] border border-tesla-border rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#CC0000] transition-colors text-center tracking-widest font-mono"
                disabled={codeSending}
              />
            </div>

            {codeError && <div className="bg-red-900/30 border border-red-800/50 text-red-400 text-xs rounded-lg px-3 py-2.5 mb-4">{codeError}</div>}

            <button
              onClick={handleCodeSubmit}
              disabled={!kycCode.trim() || codeSending}
              className="w-full bg-[#CC0000] hover:bg-[#a30000] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors text-sm"
            >
              {codeSending ? 'Submitting with code...' : 'Submit with Verification Code'}
            </button>

            <button
              onClick={handleCodeModalClose}
              disabled={codeSending}
              className="w-full mt-2 text-gray-500 hover:text-gray-300 text-xs py-2 transition-colors"
            >
              Cancel and go back
            </button>
          </div>
        </div>
      )}
</div>
  );
}

export default function KycPage() {
  return (
    <KycErrorBoundary>
      <KycPageInner />
    </KycErrorBoundary>
  );
}
