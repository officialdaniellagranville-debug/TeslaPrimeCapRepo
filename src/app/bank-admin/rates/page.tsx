'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Save, Check, Loader2, Percent } from 'lucide-react';

interface RatesForm {
  savingsRate: string;
  certificateRate: string;
  creditCardRate: string;
  loanRate: string;
}

const INITIAL: RatesForm = {
  savingsRate: '', certificateRate: '', creditCardRate: '', loanRate: '',
};

const FIELDS: { key: keyof RatesForm; label: string; desc: string }[] = [
  { key: 'savingsRate', label: 'High-Yield Savings', desc: 'APY displayed for savings accounts' },
  { key: 'certificateRate', label: 'Certificate of Deposit', desc: 'APY displayed for CDs' },
  { key: 'creditCardRate', label: 'Credit Card', desc: 'APR displayed for credit cards' },
  { key: 'loanRate', label: 'Personal Loan', desc: 'APR displayed for personal loans' },
];

export default function RatesAdminPage() {
  const [form, setForm] = useState<RatesForm>(INITIAL);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/bank-admin/settings')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const s = d.data;
          setForm({
            savingsRate: s.savingsRate || '',
            certificateRate: s.certificateRate || '',
            creditCardRate: s.creditCardRate || '',
            loanRate: s.loanRate || '',
          });
        }
        setLoading(false);
      });
  }, []);

  const set = (key: keyof RatesForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/bank-admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold">Interest Rates</h1>
        <p className="text-muted-foreground text-sm mt-1">Edit the rates displayed on the client website</p>
      </div>

      <Card className="glass-card border-0"><CardHeader><CardTitle className="text-base flex items-center gap-2"><Percent className="w-4 h-4 text-emerald-400" /> Rate Cards <Badge variant="secondary" className="text-xs">4 rates</Badge></CardTitle></CardHeader>
      <CardContent className="p-6 pt-0 space-y-6">
        {FIELDS.map(f => (
          <div key={f.key} className="space-y-2">
            <Label>{f.label} <span className="text-muted-foreground font-normal">— {f.desc}</span></Label>
            <Input value={form[f.key]} onChange={set(f.key)} placeholder={f.label} className="bg-white/[0.04] border-white/10" />
          </div>
        ))}
      </CardContent></Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
