'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Save, Check, Loader2, Plus, Trash2, Briefcase } from 'lucide-react';

interface ServiceItem { icon: string; title: string; description: string; features: string[]; }

const DEFAULT_SERVICES: ServiceItem[] = [
  { icon: 'Shield', title: 'Deposit Accounts', description: 'Secure your money with high-yield savings and checking accounts.', features: ['High-Yield Savings', 'Free Checking', 'Money Market', 'Auto Savings Rules'] },
  { icon: 'CreditCard', title: 'Credit Cards', description: 'Competitive rates with cashback rewards and travel points.', features: ['Cashback Rewards', 'Travel Points', '0% Intro APR', 'No Annual Fee'] },
  { icon: 'Landmark', title: 'Loans & Financing', description: 'Personal, auto, and home loans with competitive rates.', features: ['Personal Loans', 'Auto Financing', 'Mortgage Loans', 'Home Equity'] },
  { icon: 'Building2', title: 'Business Banking', description: 'Comprehensive solutions for business growth.', features: ['Business Checking', 'Merchant Services', 'Payroll Solutions', 'Credit Lines'] },
  { icon: 'TrendingUp', title: 'Wealth & Retirement', description: 'Expert investment and retirement planning services.', features: ['Investment Advisory', 'IRA Accounts', '401(k) Rollovers', 'Portfolio Mgmt'] },
  { icon: 'Gift', title: 'Grants & Aid', description: 'Financial grants for education, business, and community.', features: ['Education Grants', 'Business Development', 'Community Programs', 'Scholarships'] },
];

export default function ServicesAdminPage() {
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/bank-admin/settings').then(r => r.json()).then(d => {
      if (d.success) {
        try {
          const parsed = JSON.parse(d.data.servicesJson);
          if (Array.isArray(parsed) && parsed.length > 0) setItems(parsed); else setItems(DEFAULT_SERVICES);
        } catch { setItems(DEFAULT_SERVICES); }
      }
      setLoading(false);
    });
  }, []);

  const updateItem = (idx: number, key: keyof ServiceItem, val: string) =>
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [key]: val } : item));
  const updateFeatures = (idx: number, val: string) =>
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, features: val.split(',').map(s => s.trim()).filter(Boolean) } : item));
  const addItem = () => setItems(prev => [...prev, { icon: 'Star', title: '', description: '', features: [] }]);
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/bank-admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ servicesJson: JSON.stringify(items) }) });
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-bold">Services</h1><p className="text-muted-foreground text-sm mt-1">Manage the services displayed on the website</p></div>
        <Button onClick={addItem} variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"><Plus className="w-4 h-4 mr-1" />Add Service</Button>
      </div>
      <div className="space-y-4">
        {items.map((item, idx) => (
          <Card key={idx} className="glass-card border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2"><Briefcase className="w-4 h-4 text-emerald-400" />Service {idx + 1}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">{item.icon}</Badge>
                  <button onClick={() => removeItem(idx)} className="p-1 rounded hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Icon Name</Label><Input value={item.icon} onChange={e => updateItem(idx, 'icon', e.target.value)} placeholder="Shield" className="bg-white/[0.04] border-white/10" /></div>
                <div className="space-y-2"><Label>Title</Label><Input value={item.title} onChange={e => updateItem(idx, 'title', e.target.value)} placeholder="Service Name" className="bg-white/[0.04] border-white/10" /></div>
              </div>
              <div className="space-y-2"><Label>Description</Label><Textarea value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} rows={2} className="bg-white/[0.04] border-white/10" /></div>
              <div className="space-y-2"><Label>Features (comma-separated)</Label><Input value={item.features.join(', ')} onChange={e => updateFeatures(idx, e.target.value)} placeholder="Feature 1, Feature 2" className="bg-white/[0.04] border-white/10" /></div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex justify-end"><Button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}{saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}</Button></div>
    </div>
  );
}
