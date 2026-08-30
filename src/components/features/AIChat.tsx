'use client';

import { useState, useRef, useEffect, type FormEvent } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';

interface Message {
  id: number;
  role: 'user' | 'ai';
  content: string;
}

function getAIResponse(message: string): string {
  const lower = message.toLowerCase();

  if (/rate|interest|apy/.test(lower)) {
    return 'Our current rates are very competitive! Savings accounts earn 4.50% APY, Certificates of Deposit offer up to 5.25% APY, and loan rates start from 6.75% APR. Rates are subject to change, so I recommend locking in a CD rate today.';
  }
  if (/loan|mortgage/.test(lower)) {
    return 'We offer a variety of loan options including personal loans, auto loans, and mortgages with rates starting from 6.75% APR. You can apply online in minutes or visit any branch for personalized assistance. Our loan specialists are ready to find the best option for you.';
  }
  if (/transfer|send/.test(lower)) {
    return 'You can easily transfer funds between your VaultEdge accounts or to external accounts through our dashboard. Transfers between your own accounts are instant, while external transfers typically complete within 1-3 business days. You can also set up recurring transfers for automatic savings.';
  }
  if (/security|safe|fdic/.test(lower)) {
    return 'Your security is our top priority. All accounts are FDIC insured up to $250,000 per depositor. We use 256-bit SSL encryption, two-factor authentication (2FA), and real-time fraud monitoring to keep your money safe. You can enable 2FA in your account settings.';
  }
  if (/hour|contact|phone/.test(lower)) {
    return 'Our customer service team is available Monday through Friday, 8 AM to 8 PM EST, and Saturday 9 AM to 5 PM EST. You can reach us at (800) 555-0199, email support@vaultedge.com, or visit any of our branch locations. We\'re always happy to help!';
  }
  if (/account|open|sign/.test(lower)) {
    return 'Opening a VaultEdge account is quick and easy! You can start the process online in just 5 minutes with your government-issued ID and a minimum deposit of $25. Choose from checking, savings, money market, or certificate accounts. Our welcome bonus of $50 applies to new accounts opened this month.';
  }
  if (/bill|pay/.test(lower)) {
    return 'Our Bill Pay service lets you pay anyone online — utilities, credit cards, rent, and more. Set up one-time or recurring payments, and we\'ll ensure they arrive on time. You can also use our mobile app to scan and pay bills on the go. No stamps needed!';
  }
  if (/mobile|app|deposit/.test(lower)) {
    return 'The VaultEdge Mobile App is available for iOS and Android. You can check balances, deposit checks by snapping a photo, pay bills, transfer funds, and even lock your debit card instantly. Download it free from the App Store or Google Play — search "VaultEdge Bank".';
  }
  if (/invest|wealth/.test(lower)) {
    return 'VaultEdge Wealth Management offers personalized investment plans including mutual funds, ETFs, and retirement accounts (IRA, 401k rollovers). Our financial advisors can create a tailored portfolio based on your goals and risk tolerance. Schedule a free consultation to get started.';
  }
  if (/card|credit/.test(lower)) {
    return 'We offer several credit card options with rewards including cash back, travel points, and low introductory APRs. Our VaultEdge Platinum card offers 2% cash back on all purchases with no annual fee. Apply online and get a decision in 60 seconds.';
  }
  if (/fee|cost|charge/.test(lower)) {
    return 'Great news — VaultEdge offers fee-free banking! There are no monthly maintenance fees on checking and savings accounts, no minimum balance fees, and free access to over 55,000 ATMs nationwide. We believe in transparent banking with no hidden charges.';
  }
  if (/hello|hi|hey/.test(lower)) {
    return 'Hello! Welcome to VaultEdge Bank. I\'m here to help you with anything you need — from account questions and loan information to security tips and more. What would you like to know about today?';
  }

  return "I'd be happy to help with that! For detailed assistance, please contact our support team at (800) 555-0199 or visit your nearest branch. Is there anything else I can assist you with?";
}

export default function AIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: 'ai',
      content:
        "Hi! I'm your VaultEdge AI assistant. I can help you with account questions, loan calculations, rate information, and more. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const handleSend = (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;

    const userMsg: Message = { id: Date.now(), role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const aiResponse = getAIResponse(trimmed);
      const aiMsg: Message = { id: Date.now() + 1, role: 'ai', content: aiResponse };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 800);
  };

  const handleToggle = () => {
    setIsOpen((prev) => {
      if (!prev && !hasOpened) setHasOpened(true);
      return !prev;
    });
  };

  return (
    <div className="fixed z-50 bottom-[5rem] right-4 md:bottom-6 md:right-6">
      {/* Chat Panel */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-[340px] sm:w-[380px] h-[500px] rounded-2xl glass-card border border-white/20 bg-background/90 backdrop-blur-xl flex flex-col shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-sm text-foreground">VaultEdge AI Assistant</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
              aria-label="Close chat"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-emerald-500 text-white rounded-br-md'
                      : 'glass-card bg-white/10 text-foreground rounded-bl-md'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="glass-card bg-white/10 px-4 py-3 rounded-2xl rounded-bl-md flex gap-1.5 items-center">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSend}
            className="p-3 border-t border-white/10 flex items-center gap-2"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-white/10 rounded-full px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-emerald-500/50 transition-shadow"
              disabled={isTyping}
            />
            <button
              type="submit"
              disabled={isTyping || !input.trim()}
              className="w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              aria-label="Send message"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={handleToggle}
        className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95 relative"
        aria-label="Open AI chat"
      >
        <MessageCircle className="w-6 h-6" />
        {!hasOpened && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
            1
          </span>
        )}
      </button>
    </div>
  );
}
