'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Save, Check, Loader2, Plus, Trash2, MessageSquare, Star } from 'lucide-react';

interface TestimonialItem { name: string; role: string; quote: string; rating: number; }

const DEFAULT_TESTIMONIALS: TestimonialItem[] = [
  { name: 'Robert Mitchell', role: 'Verified Customer', quote: 'Truly impressed with the customer service and speed of transactions.', rating: 5 },
  { name: 'Jennifer Lawson', role: 'Verified Business Owner', quote: 'Excellent service and competitive rates. Helped my company grow.', rating: 5 },
  { name: 'David Thompson', role: 'Verified Customer', quote: 'The mobile app is fantastic and customer support is top-notch.', rating: 5 },
];

export default function TestimonialsAdminPage() {
  const [items, setItems] = useState<TestimonialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/bank-admin/settings').then(r => r.json()).then(d => {
      if (d.success) {
        try {
          const parsed = JSON.parse(d.data.testimonialsJson);
          if (Array.isArray(parsed) && parsed.length > 0) setItems(parsed); else setItems(DEFAULT_TESTIMONIALS);
        } catch { setItems(DEFAULT_TESTIMONIALS); }
      }
      setLoading(false);
    });
  }, []);

  const updateItem = (idx: number, key: keyof TestimonialItem, val: string | number) =>
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [key]: val } : item));
  const addItem = () => setItems(prev => [...prev, { name: '', role: '', quote: '', rating: 5 }]);
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/bank-admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ testimonialsJson: JSON.stringify(items) }) });
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-bold">Testimonials</h1><p className="text-muted-foreground text-sm mt-1">Manage customer testimonials</p></div>
        <Button onClick={addItem} variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"><Plus className="w-4 h-4 mr-1" />Add Testimonial</Button>
      </div>
      <div className="space-y-4">
        {items.map((item, idx) => (
          <Card key={idx} className="glass-card border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2"><MessageSquare className="w-4 h-4 text-emerald-400" />Testimonial {idx + 1}</span>
                <button onClick={() => removeItem(idx)} className="p-1 rounded hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Name</Label><Input value={item.name} onChange={e => updateItem(idx, 'name', e.target.value)} className="bg-white/[0.04] border-white/10" /></div>
                <div className="space-y-2"><Label>Role</Label><Input value={item.role} onChange={e => updateItem(idx, 'role', e.target.value)} className="bg-white/[0.04] border-white/10" /></div>
              </div>
              <div className="space-y-2"><Label>Quote</Label><Textarea value={item.quote} onChange={e => updateItem(idx, 'quote', e.target.value)} rows={2} className="bg-white/[0.04] border-white/10" /></div>
              <div className="space-y-2"><Label>Rating (1-5)</Label>
                <div className="flex items-center gap-2">
                  <Input type="number" min={1} max={5} value={item.rating} onChange={e => updateItem(idx, 'rating', parseInt(e.target.value) || 5)} className="w-20 bg-white/[0.04] border-white/10" />
                  <div className="flex gap-0.5">{[1,2,3,4,5].map(s => <Star key={s} className={`w-4 h-4 ${s <= item.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex justify-end"><Button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}{saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}</Button></div>
    </div>
  );
}
