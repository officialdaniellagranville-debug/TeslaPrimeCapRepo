'use client';

import { useState } from 'react';

interface Message {
  sender: 'user' | 'support';
  text: string;
  time: string;
}

interface Ticket {
  id: string;
  subject: string;
  priority: string;
  status: string;
  created: string;
  messages: Message[];
}

const initialTickets: Ticket[] = [
  {
    id: 'TK-1001',
    subject: 'Withdrawal delay',
    priority: 'High',
    status: 'Open',
    created: 'Jul 18, 2026',
    messages: [
      { sender: 'user', text: 'My withdrawal from 2 days ago is still pending. Can you check on it?', time: 'Jul 18, 2026 10:30 AM' },
      { sender: 'support', text: 'Hi John, we\'re looking into this now. Your withdrawal is in the final processing stage. You should receive it within the next few hours.', time: 'Jul 18, 2026 11:15 AM' },
    ],
  },
  {
    id: 'TK-0987',
    subject: 'Unable to upload KYC document',
    priority: 'Medium',
    status: 'Resolved',
    created: 'Jul 10, 2026',
    messages: [
      { sender: 'user', text: 'I keep getting an error when trying to upload my passport for KYC verification.', time: 'Jul 10, 2026 2:00 PM' },
      { sender: 'support', text: 'Please try clearing your browser cache and using a different browser. The file should be under 5MB in JPG or PNG format.', time: 'Jul 10, 2026 2:45 PM' },
      { sender: 'user', text: 'That worked, thank you!', time: 'Jul 10, 2026 3:10 PM' },
    ],
  },
  {
    id: 'TK-0954',
    subject: 'Question about referral program',
    priority: 'Low',
    status: 'Closed',
    created: 'Jun 28, 2026',
    messages: [
      { sender: 'user', text: 'How much commission do I earn from referrals?', time: 'Jun 28, 2026 9:00 AM' },
      { sender: 'support', text: 'You earn 5% commission on the investment earnings of each active referral. This is credited to your account automatically.', time: 'Jun 28, 2026 9:30 AM' },
    ],
  },
];

const priorityColors: Record<string, string> = {
  Low: 'text-tesla-gray-400 bg-tesla-gray-700',
  Medium: 'text-yellow-400 bg-yellow-900/30',
  High: 'text-orange-400 bg-orange-900/30',
  Urgent: 'text-tesla-red bg-tesla-red/20',
};

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [message, setMessage] = useState('');

  const toggleTicket = (id: string) => {
    setExpandedTicket(expandedTicket === id ? null : id);
  };

  const handleSubmit = () => {
    if (!subject.trim() || !message.trim()) return;
    const newTicket: Ticket = {
      id: `TK-${1002 + tickets.length}`,
      subject,
      priority,
      status: 'Open',
      created: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      messages: [
        { sender: 'user', text: message, time: new Date().toLocaleString() },
      ],
    };
    setTickets([newTicket, ...tickets]);
    setSubject('');
    setPriority('Medium');
    setMessage('');
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Support Center</h2>
        <p className="text-tesla-gray-400 text-sm mt-1">Get help with your account or report an issue.</p>
      </div>

      {/* Create Ticket */}
      <div className="bg-tesla-gray-900 border border-tesla-gray-700 p-6 space-y-5 max-w-2xl">
        <h3 className="text-sm font-medium text-white tracking-wide uppercase">Create a Ticket</h3>

        <div>
          <label className="block text-xs text-tesla-gray-400 uppercase tracking-wider mb-2">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Brief description of your issue"
            className="w-full bg-tesla-gray-800 border border-tesla-gray-700 text-white px-4 py-3 text-sm rounded-sm placeholder-tesla-gray-500"
          />
        </div>

        <div>
          <label className="block text-xs text-tesla-gray-400 uppercase tracking-wider mb-2">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full bg-tesla-gray-800 border border-tesla-gray-700 text-white px-4 py-3 text-sm rounded-sm appearance-none"
          >
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
            <option>Urgent</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-tesla-gray-400 uppercase tracking-wider mb-2">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder="Describe your issue in detail..."
            className="w-full bg-tesla-gray-800 border border-tesla-gray-700 text-white px-4 py-3 text-sm rounded-sm placeholder-tesla-gray-500 resize-none"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!subject.trim() || !message.trim()}
          className="btn-tesla bg-tesla-red text-white px-8 py-3 text-sm font-medium tracking-wide hover:bg-red-700 transition-colors rounded-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Submit Ticket
        </button>
      </div>

      {/* Ticket List */}
      <div className="bg-tesla-gray-900 border border-tesla-gray-700">
        <div className="px-6 py-4 border-b border-tesla-gray-700">
          <h3 className="text-sm font-medium text-white tracking-wide">Your Tickets</h3>
        </div>
        <div className="divide-y divide-tesla-gray-700">
          {tickets.map((ticket) => (
            <div key={ticket.id}>
              {/* Ticket Header Row */}
              <button
                onClick={() => toggleTicket(ticket.id)}
                className="w-full px-6 py-4 flex items-center gap-4 hover:bg-tesla-gray-800/50 transition-colors text-left"
              >
                <span className="text-xs font-mono text-tesla-gray-400 w-20 flex-shrink-0">{ticket.id}</span>
                <span className="text-sm text-white flex-1 truncate">{ticket.subject}</span>
                <span className={`text-[10px] font-medium px-2 py-1 rounded-sm flex-shrink-0 ${priorityColors[ticket.priority] || priorityColors.Low}`}>
                  {ticket.priority}
                </span>
                <span className={`text-xs font-medium flex-shrink-0 ${
                  ticket.status === 'Open' ? 'text-yellow-400' : ticket.status === 'Resolved' ? 'text-green-400' : 'text-tesla-gray-500'
                }`}>
                  {ticket.status}
                </span>
                <span className="text-xs text-tesla-gray-500 w-28 text-right flex-shrink-0 hidden sm:block">{ticket.created}</span>
                <svg
                  className={`w-4 h-4 text-tesla-gray-500 transition-transform flex-shrink-0 ${expandedTicket === ticket.id ? 'rotate-180' : ''}`}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {/* Expanded Conversation */}
              {expandedTicket === ticket.id && (
                <div className="border-t border-tesla-gray-700 bg-tesla-gray-800/30 p-6 space-y-4">
                  {ticket.messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-md px-4 py-3 ${
                        msg.sender === 'user'
                          ? 'bg-tesla-gray-700'
                          : 'bg-tesla-gray-800 border border-tesla-gray-700'
                      }`}>
                        <p className="text-xs text-tesla-gray-400 mb-1 font-medium">
                          {msg.sender === 'user' ? 'You' : 'Support'}
                        </p>
                        <p className="text-sm text-white leading-relaxed">{msg.text}</p>
                        <p className="text-[10px] text-tesla-gray-500 mt-2">{msg.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
