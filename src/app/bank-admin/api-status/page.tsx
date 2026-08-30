'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, Loader2, Globe } from 'lucide-react';

interface EndpointStatus {
  name: string;
  url: string;
  status: 'loading' | 'ok' | 'error';
  latency?: number;
}

const ENDPOINTS: EndpointStatus[] = [
  { name: 'Public Settings (GET)', url: '/api/site-settings', status: 'loading' },
  { name: 'Admin Settings (GET)', url: '/api/bank-admin/settings', status: 'loading' },
  { name: 'Health Check', url: '/api/health', status: 'loading' },
];

export default function ApiStatusPage() {
  const [endpoints, setEndpoints] = useState(ENDPOINTS);

  useEffect(() => {
    Promise.all(
      endpoints.map(async (ep) => {
        try {
          const start = performance.now();
          const res = await fetch(ep.url);
          const latency = Math.round(performance.now() - start);
          return { ...ep, status: (res.ok ? 'ok' : 'error') as EndpointStatus['status'], latency };
        } catch {
          return { ...ep, status: 'error' as const };
        }
      })
    ).then(setEndpoints);
  }, []);

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold">API Status</h1>
        <p className="text-muted-foreground text-sm mt-1">Monitor the health of your API endpoints</p>
      </div>
      <Card className="glass-card border-0">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /> Endpoints</CardTitle></CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="space-y-3">
            {endpoints.map(ep => (
              <div key={ep.url} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center gap-3">
                  {ep.status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> :
                    ep.status === 'ok' ? <Check className="w-4 h-4 text-emerald-400" /> : <X className="w-4 h-4 text-red-400" />}
                  <div>
                    <p className="text-sm font-medium">{ep.name}</p>
                    <p className="text-xs text-muted-foreground">{ep.url}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {ep.latency != null && <span className="text-xs text-muted-foreground">{ep.latency}ms</span>}
                  <Badge variant={ep.status === 'ok' ? 'secondary' : 'destructive'} className={ep.status === 'ok' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25 text-[10px]' : 'text-[10px]'}>
                    {ep.status === 'loading' ? 'CHECKING' : ep.status === 'ok' ? 'HEALTHY' : 'ERROR'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
