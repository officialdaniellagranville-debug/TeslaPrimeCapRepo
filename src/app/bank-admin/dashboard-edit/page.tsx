'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Save, Check, Loader2, Wallet, PiggyBank, CreditCard, BarChart3 } from 'lucide-react';

const FIELDS = [
  { key: 'dashChecking', label: 'Checking Balance', icon: Wallet, placeholder: '12,450.80' },
  { key: 'dashSavings', label: 'Savings Balance', icon: PiggyBank, placeholder: '28,340.25' },
  { key: 'dashCreditCard', label: 'Credit Card Balance', icon: CreditCard, placeholder: '1,230.45' },
  { key: 'dashInvestments', label: 'Investments Balance', icon: BarChart3, placeholder: '45,120.00' },
];

export default function DashboardEditPage() {
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/bank-admin/settings').then(r => r.json()).then(d => {
      if (d.success) {
        const s = d.data;
        const f: Record<string, string> = {};
        FIELDS.forEach(({ key, placeholder }) => { f[key] = s[key] || placeholder; });
        setForm(f);
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/bank-admin/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold">Dashboard Data</h1>
        <p className="text-muted-foreground text-sm mt-1">Edit the demo dashboard balances displayed to users</p>
      </div>
      <Card className="glass-card border-0"><CardHeader><CardTitle className="text-base flex items-center gap-2">Account Balances <Badge variant="secondary" className="text-xs">Client Dashboard</Badge></CardTitle></CardHeader>
        <CardContent className="p-6 pt-0 space-y-5">
          {FIELDS.map(({ key, label, icon: Icon, placeholder }) => (
            <div key={key} className="space-y-2">
              <Label className="flex items-center gap-2"><Icon className="w-4 h-4 text-primary" />{label}</Label>
              <Input
                value={form[key] || ''}
                onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                placeholder={placeholder}
                className="bg-white/[0.04] border-white/10"
              />
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
