'use client';

import { useState } from 'react';

const faqLinks = [
  { q: 'How do I make a deposit?', a: 'Navigate to the Deposit section in your dashboard, select your preferred cryptocurrency wallet, enter the amount, and submit your transaction hash.' },
  { q: 'How long do withdrawals take?', a: 'Verified accounts typically receive withdrawals within minutes. New accounts may require up to 24 hours for security verification.' },
  { q: 'What are the investment plan minimums?', a: 'Basic: $200, Silver: $5,000, Gold: $10,000, Platinum: $50,000.' },
  { q: 'How do I complete KYC?', a: 'Go to the KYC Verification page, select your document type, and upload clear photos of the front and back of your ID.' },
];

export default function SupportPage() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleSubmit = async () => {
    if (!subject || !message) return;
    setLoading(true);
    setSuccess('');
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, message }),
      });
      if (res.ok) { setSuccess('Support ticket submitted successfully! We will get back to you within 24 hours.'); setSubject(''); setMessage(''); }
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-white font-bold text-lg">Support</h2>
        <p className="text-gray-500 text-sm mt-0.5">We&apos;re here to help. Submit a ticket or browse our FAQ.</p>
      </div>

      <div className="bg-tesla-card border border-tesla-border rounded-xl p-5 space-y-4">
        <div>
          <label className="block text-gray-300 text-sm font-medium mb-1.5">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Brief description of your issue"
            className="w-full bg-[#1a1a1a] border border-tesla-border rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#CC0000] transition-colors"
          />
        </div>
        <div>
          <label className="block text-gray-300 text-sm font-medium mb-1.5">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your issue in detail..."
            rows={5}
            className="w-full bg-[#1a1a1a] border border-tesla-border rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#CC0000] transition-colors resize-none"
          />
        </div>
        {success && <div className="bg-green-900/30 border border-green-800/50 text-green-400 text-sm rounded-lg px-4 py-3">{success}</div>}
        <button
          onClick={handleSubmit}
          disabled={loading || !subject || !message}
          className="w-full bg-[#CC0000] hover:bg-[#a30000] disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
        >
          {loading ? 'Submitting...' : 'Submit Ticket'}
        </button>
      </div>

      {/* FAQ Quick Links */}
      <div>
        <h3 className="text-white font-semibold text-sm mb-3">Frequently Asked Questions</h3>
        <div className="space-y-2">
          {faqLinks.map((faq, i) => (
            <details key={i} className="bg-tesla-card border border-tesla-border rounded-xl overflow-hidden group">
              <summary className="flex items-center justify-between px-4 py-3.5 cursor-pointer text-white text-sm font-medium hover:bg-[#2a2a2a] transition-colors">
                {faq.q}
                <svg className="w-4 h-4 text-gray-500 group-open:rotate-180 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
              </summary>
              <div className="px-4 pb-4 text-gray-400 text-sm leading-relaxed">{faq.a}</div>
            </details>
          ))}
        </div>
      </div>
</div>
  );
}
