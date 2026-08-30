'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Save, Check, Loader2 } from 'lucide-react';

interface HeroForm {
  heroTitle: string;
  heroSubtitle: string;
  heroCtaText: string;
  heroCtaLink: string;
  statCustomers: string;
  statAssets: string;
  statUptime: string;
  statSupport: string;
  routingNumber: string;
  branchHours: string;
}

const INITIAL: HeroForm = {
  heroTitle: '', heroSubtitle: '', heroCtaText: '', heroCtaLink: '',
  statCustomers: '', statAssets: '', statUptime: '', statSupport: '',
  routingNumber: '', branchHours: '',
};

export default function HeroAdminPage() {
  const [form, setForm] = useState<HeroForm>(INITIAL);
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
            heroTitle: s.heroTitle || '',
            heroSubtitle: s.heroSubtitle || '',
            heroCtaText: s.heroCtaText || '',
            heroCtaLink: s.heroCtaLink || '',
            statCustomers: s.statCustomers || '',
            statAssets: s.statAssets || '',
            statUptime: s.statUptime || '',
            statSupport: s.statSupport || '',
            routingNumber: s.routingNumber || '',
            branchHours: s.branchHours || '',
          });
        }
        setLoading(false);
      });
  }, []);

  const set = (key: keyof HeroForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/bank-admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold">Hero Section</h1>
        <p className="text-muted-foreground text-sm mt-1">Edit the main hero banner content and stats</p>
      </div>

      <Card className="glass-card border-0"><CardHeader><CardTitle className="text-base">Hero Content</CardTitle></CardHeader>
      <CardContent className="p-6 pt-0 space-y-5">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input value={form.heroTitle} onChange={set('heroTitle')} placeholder="Your Premier Digital Bank" className="bg-white/[0.04] border-white/10" />
        </div>
        <div className="space-y-2">
          <Label>Subtitle</Label>
          <Textarea value={form.heroSubtitle} onChange={set('heroSubtitle')} placeholder="Experience banking reimagined..." rows={3} className="bg-white/[0.04] border-white/10" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>CTA Button Text</Label>
            <Input value={form.heroCtaText} onChange={set('heroCtaText')} placeholder="Open Account" className="bg-white/[0.04] border-white/10" />
          </div>
          <div className="space-y-2">
            <Label>CTA Button Link</Label>
            <Input value={form.heroCtaLink} onChange={set('heroCtaLink')} placeholder="signup" className="bg-white/[0.04] border-white/10" />
          </div>
        </div>
      </CardContent></Card>

      <Card className="glass-card border-0"><CardHeader><CardTitle className="text-base flex items-center gap-2">Statistics <Badge variant="secondary" className="text-xs">Display Row</Badge></CardTitle></CardHeader>
      <CardContent className="p-6 pt-0 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Customers</Label>
            <Input value={form.statCustomers} onChange={set('statCustomers')} placeholder="75K+" className="bg-white/[0.04] border-white/10" />
          </div>
          <div className="space-y-2">
            <Label>Assets Under Management</Label>
            <Input value={form.statAssets} onChange={set('statAssets')} placeholder="$4.2B+" className="bg-white/[0.04] border-white/10" />
          </div>
          <div className="space-y-2">
            <Label>Uptime</Label>
            <Input value={form.statUptime} onChange={set('statUptime')} placeholder="99.99%" className="bg-white/[0.04] border-white/10" />
          </div>
          <div className="space-y-2">
            <Label>Support</Label>
            <Input value={form.statSupport} onChange={set('statSupport')} placeholder="24/7" className="bg-white/[0.04] border-white/10" />
          </div>
        </div>
      </CardContent></Card>

      <Card className="glass-card border-0"><CardHeader><CardTitle className="text-base flex items-center gap-2">Footer Info <Badge variant="secondary" className="text-xs">Bottom Bar</Badge></CardTitle></CardHeader>
      <CardContent className="p-6 pt-0 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Routing Number</Label>
            <Input value={form.routingNumber} onChange={set('routingNumber')} placeholder="251480576" className="bg-white/[0.04] border-white/10" />
          </div>
          <div className="space-y-2">
            <Label>Branch Hours</Label>
            <Input value={form.branchHours} onChange={set('branchHours')} placeholder="Mon-Fri 9AM-5PM" className="bg-white/[0.04] border-white/10" />
          </div>
        </div>
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
