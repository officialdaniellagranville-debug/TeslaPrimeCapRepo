import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { requireRole } from '@/lib/api-helpers';

// Serve uploaded photos — requires admin auth
async function getHandler(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
  _user: any
) {
  try {
    const { filename } = await params;

    // Prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return new NextResponse('Invalid filename', { status: 400 });
    }

    // Try /tmp/uploads first (legacy filesystem approach)
    try {
      const filepath = join('/tmp/uploads', filename);
      const buffer = await readFile(filepath);

      const ext = filename.split('.').pop()?.toLowerCase();
      const contentTypes: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
        gif: 'image/gif',
      };
      const contentType = contentTypes[ext || ''] || 'application/octet-stream';

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400',
        },
      });
    } catch {
      // File not in /tmp/uploads — return 404
    }

    return new NextResponse('Image not found', { status: 404 });
  } catch {
    return new NextResponse('Image not found', { status: 404 });
  }
}

export const GET = requireRole('SUPER_ADMIN', 'ADMIN')(getHandler as any);
