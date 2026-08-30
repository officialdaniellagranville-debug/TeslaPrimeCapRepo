'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, Check, Loader2, Phone } from 'lucide-react';

interface ContactForm {
  contactAddress: string;
  contactPhone: string;
  contactEmail: string;
  contactHours: string;
  contactIntlPhone: string;
}

const INITIAL: ContactForm = {
  contactAddress: '', contactPhone: '', contactEmail: '', contactHours: '', contactIntlPhone: ''
};

export default function ContactAdminPage() {
  const [form, setForm] = useState<ContactForm>(INITIAL);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/bank-admin/settings').then(r => r.json()).then(d => {
      if (d.success) {
        const s = d.data;
        setForm({
          contactAddress: s.contactAddress || '', contactPhone: s.contactPhone || '',
          contactEmail: s.contactEmail || '', contactHours: s.contactHours || '',
          contactIntlPhone: s.contactIntlPhone || '',
        });
      }
      setLoading(false);
    });
  }, []);

  const set = (key: keyof ContactForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

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
      <div><h1 className="text-2xl font-bold">Contact Information</h1><p className="text-muted-foreground text-sm mt-1">Edit contact details displayed on the website</p></div>
      <Card className="glass-card border-0"><CardHeader><CardTitle className="text-base flex items-center gap-2"><Phone className="w-4 h-4 text-emerald-400" /> Contact Details</CardTitle></CardHeader>
      <CardContent className="p-6 pt-0 space-y-5">
        <div className="space-y-2"><Label>Address</Label><Textarea value={form.contactAddress} onChange={set('contactAddress')} rows={2} className="bg-white/[0.04] border-white/10" /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Phone</Label><Input value={form.contactPhone} onChange={set('contactPhone')} className="bg-white/[0.04] border-white/10" /></div>
          <div className="space-y-2"><Label>Intl. Phone</Label><Input value={form.contactIntlPhone} onChange={set('contactIntlPhone')} className="bg-white/[0.04] border-white/10" /></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Email</Label><Input value={form.contactEmail} onChange={set('contactEmail')} className="bg-white/[0.04] border-white/10" /></div>
          <div className="space-y-2"><Label>Hours</Label><Input value={form.contactHours} onChange={set('contactHours')} className="bg-white/[0.04] border-white/10" /></div>
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
