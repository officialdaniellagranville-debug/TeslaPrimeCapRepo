'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, Check, Loader2, Plus, Trash2, HelpCircle } from 'lucide-react';

interface FaqItem { q: string; a: string; }

const DEFAULT_FAQ: FaqItem[] = [
  { q: 'What is VaultEdge Bank?', a: 'VaultEdge is a modern digital bank offering secure, fast, and accessible banking services for individuals and businesses.' },
  { q: 'How do I open an account?', a: 'You can open an account online in minutes. Click "Open Account" on our homepage and follow the simple registration process.' },
  { q: 'What are the interest rates?', a: 'We offer competitive rates on all our products. Visit our Rates page for the most current APY and APR information.' },
  { q: 'Is my money safe?', a: 'Yes, your deposits are FDIC insured up to $250,000. We use 256-bit SSL encryption and multi-factor authentication.' },
  { q: 'What services do you offer?', a: 'We offer deposit accounts, credit cards, loans, business banking, wealth management, and grants programs.' },
  { q: 'How do I contact support?', a: 'Our support team is available 24/7. Call us, email us, or use the live chat on our website.' },
  { q: 'Are there any fees?', a: 'We believe in transparent banking. Many of our accounts have no monthly fees. See individual product pages for details.' },
  { q: 'Can I access my account from my phone?', a: 'Yes, our mobile app is available for both iOS and Android, giving you full access to your accounts anytime.' },
];

export default function FaqAdminPage() {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/bank-admin/settings').then(r => r.json()).then(d => {
      if (d.success) {
        try {
          const parsed = JSON.parse(d.data.faqJson);
          if (Array.isArray(parsed) && parsed.length > 0) setItems(parsed); else setItems(DEFAULT_FAQ);
        } catch { setItems(DEFAULT_FAQ); }
      }
      setLoading(false);
    });
  }, []);

  const updateItem = (idx: number, key: keyof FaqItem, val: string) =>
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [key]: val } : item));
  const addItem = () => setItems(prev => [...prev, { q: '', a: '' }]);
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/bank-admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ faqJson: JSON.stringify(items) }) });
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-bold">FAQ</h1><p className="text-muted-foreground text-sm mt-1">Manage frequently asked questions</p></div>
        <Button onClick={addItem} variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"><Plus className="w-4 h-4 mr-1" />Add Question</Button>
      </div>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {items.map((item, idx) => (
          <Card key={idx} className="glass-card border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2"><HelpCircle className="w-4 h-4 text-emerald-400" />Q{idx + 1}</span>
                <button onClick={() => removeItem(idx)} className="p-1 rounded hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
              <div className="space-y-2"><Label>Question</Label><Input value={item.q} onChange={e => updateItem(idx, 'q', e.target.value)} placeholder="What is...?" className="bg-white/[0.04] border-white/10" /></div>
              <div className="space-y-2"><Label>Answer</Label><Textarea value={item.a} onChange={e => updateItem(idx, 'a', e.target.value)} rows={3} placeholder="Our answer..." className="bg-white/[0.04] border-white/10" /></div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex justify-end"><Button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}{saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}</Button></div>
    </div>
  );
}
