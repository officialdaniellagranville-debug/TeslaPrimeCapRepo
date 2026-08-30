'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, Check, Loader2, Info } from 'lucide-react';

interface AboutForm { aboutTitle: string; aboutMission: string; aboutFounded: string; aboutMembers: string; aboutAssetsValue: string; aboutBranches: string; }

const INITIAL: AboutForm = { aboutTitle: '', aboutMission: '', aboutFounded: '', aboutMembers: '', aboutAssetsValue: '', aboutBranches: '' };

export default function AboutAdminPage() {
  const [form, setForm] = useState<AboutForm>(INITIAL);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/bank-admin/settings').then(r => r.json()).then(d => {
      if (d.success) {
        const s = d.data;
        setForm({ aboutTitle: s.aboutTitle || '', aboutMission: s.aboutMission || '', aboutFounded: s.aboutFounded || '', aboutMembers: s.aboutMembers || '', aboutAssetsValue: s.aboutAssetsValue || '', aboutBranches: s.aboutBranches || '' });
      }
      setLoading(false);
    });
  }, []);

  const set = (key: keyof AboutForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(prev => ({ ...prev, [key]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/bank-admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 page-enter">
      <div><h1 className="text-2xl font-bold">About Section</h1><p className="text-muted-foreground text-sm mt-1">Edit the about page content and company stats</p></div>
      <Card className="glass-card border-0"><CardHeader><CardTitle className="text-base flex items-center gap-2"><Info className="w-4 h-4 text-emerald-400" /> About Content</CardTitle></CardHeader>
      <CardContent className="p-6 pt-0 space-y-5">
        <div className="space-y-2"><Label>Section Title</Label><Input value={form.aboutTitle} onChange={set('aboutTitle')} placeholder="Building Strength Together" className="bg-white/[0.04] border-white/10" /></div>
        <div className="space-y-2"><Label>Mission Statement</Label><Textarea value={form.aboutMission} onChange={set('aboutMission')} placeholder="Founded in 2018..." rows={4} className="bg-white/[0.04] border-white/10" /></div>
      </CardContent></Card>
      <Card className="glass-card border-0"><CardHeader><CardTitle className="text-base">Company Stats</CardTitle></CardHeader>
      <CardContent className="p-6 pt-0 space-y-4"><div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Founded Year</Label><Input value={form.aboutFounded} onChange={set('aboutFounded')} className="bg-white/[0.04] border-white/10" /></div>
        <div className="space-y-2"><Label>Members</Label><Input value={form.aboutMembers} onChange={set('aboutMembers')} className="bg-white/[0.04] border-white/10" /></div>
        <div className="space-y-2"><Label>Assets Value</Label><Input value={form.aboutAssetsValue} onChange={set('aboutAssetsValue')} className="bg-white/[0.04] border-white/10" /></div>
        <div className="space-y-2"><Label>Branches</Label><Input value={form.aboutBranches} onChange={set('aboutBranches')} className="bg-white/[0.04] border-white/10" /></div>
      </div></CardContent></Card>
      <div className="flex justify-end"><Button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}{saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}</Button></div>
    </div>
  );
}
