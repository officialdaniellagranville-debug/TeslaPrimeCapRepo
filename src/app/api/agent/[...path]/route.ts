import { NextRequest, NextResponse } from 'next/server';

const AGENT_PORT = 3100;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathStr = '/' + path.join('/');
  const url = `http://localhost:${AGENT_PORT}${pathStr}${request.nextUrl.search}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Agent service starting up. Try again in a few seconds.' }, { status: 503 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathStr = '/' + path.join('/');
  const url = `http://localhost:${AGENT_PORT}${pathStr}${request.nextUrl.search}`;
  const body = await request.json();

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Agent service starting up.' }, { status: 503 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathStr = '/' + path.join('/');
  const url = `http://localhost:${AGENT_PORT}${pathStr}${request.nextUrl.search}`;

  try {
    const res = await fetch(url, { method: 'DELETE' });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Agent service starting up.' }, { status: 503 });
  }
}
