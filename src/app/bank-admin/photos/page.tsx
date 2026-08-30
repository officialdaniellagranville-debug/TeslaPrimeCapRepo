'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, Check, Loader2, Image as ImageIcon, Trash2 } from 'lucide-react';

const PHOTO_FIELDS = [
  { key: 'heroBg', label: 'Hero Background', dbKey: 'heroBgUrl', desc: 'Large background image for the hero section' },
  { key: 'aboutPhoto', label: 'About Page Photo', dbKey: 'aboutPhotoUrl', desc: 'Photo displayed on the about page' },
  { key: 'logo', label: 'Site Logo', dbKey: 'logoUrl', desc: 'VaultEdge logo used in navbar and footer' },
];

export default function PhotosAdminPage() {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    fetch('/api/bank-admin/settings').then(r => r.json()).then(d => {
      if (d.success) {
        const u: Record<string, string> = {};
        PHOTO_FIELDS.forEach(f => { u[f.dbKey] = d.data[f.dbKey] || ''; });
        setUrls(u);
      }
      setLoading(false);
    });
  }, []);

  const handleUpload = async (field: string) => {
    const input = fileRefs.current[field];
    if (!input?.files?.[0]) return;
    setUploading(field);
    const fd = new FormData();
    fd.append('file', input.files[0]);
    fd.append('field', field);
    try {
      const res = await fetch('/api/bank-admin/upload', { method: 'POST', body: fd });
      if (res.ok) {
        const d = await res.json();
        if (d.success) {
          setUrls(p => ({ ...p, [PHOTO_FIELDS.find(f => f.key === field)!.dbKey]: d.data.url }));
          setSaved(field);
          setTimeout(() => setSaved(null), 3000);
        }
      }
    } finally { setUploading(null); input.value = ''; }
  };

  const handleDelete = async (field: typeof PHOTO_FIELDS[0]) => {
    try {
      await fetch('/api/bank-admin/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field.dbKey]: '' }),
      });
      setUrls(p => ({ ...p, [field.dbKey]: '' }));
    } catch {}
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold">Photos</h1>
        <p className="text-muted-foreground text-sm mt-1">Upload and manage website images</p>
      </div>
      <div className="grid gap-6">
        {PHOTO_FIELDS.map(field => (
          <Card key={field.key} className="glass-card border-0">
            <CardHeader><CardTitle className="text-base flex items-center gap-2">{field.label}</CardTitle></CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
              <p className="text-sm text-muted-foreground">{field.desc}</p>
              {urls[field.dbKey] ? (
                <div className="relative rounded-xl overflow-hidden border border-white/10">
                  <img src={urls[field.dbKey]} alt={field.label} className="w-full h-48 object-cover" />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <button onClick={() => handleDelete(field)} className="p-1.5 rounded-lg bg-red-500/80 hover:bg-red-500 text-white transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="absolute bottom-2 left-2"><Badge className="bg-black/60 text-white text-[10px]">{urls[field.dbKey].split('/').pop()}</Badge></div>
                </div>
              ) : (
                <div className="h-48 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <ImageIcon className="w-10 h-10 opacity-30" />
                  <span className="text-xs">No image uploaded</span>
                </div>
              )}
              <input ref={el => { fileRefs.current[field.key] = el; }} type="file" accept="image/*" className="hidden" onChange={() => handleUpload(field.key)} />
              <Button onClick={() => fileRefs.current[field.key]?.click()} disabled={uploading === field.key} variant="outline" className="border-white/10 hover:bg-white/[0.06]">
                {uploading === field.key ? <Loader2 className="w-4 h-4 animate-spin" /> : saved === field.key ? <Check className="w-4 h-4 text-emerald-400" /> : <Upload className="w-4 h-4" />}
                {uploading === field.key ? 'Uploading...' : saved === field.key ? 'Uploaded!' : 'Upload Image'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
