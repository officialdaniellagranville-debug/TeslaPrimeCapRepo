import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

// Zod-like validation helper (lightweight, no external dep needed for basic checks)
export function validateBody(body: unknown, rules: Record<string, { type?: string; required?: boolean; min?: number; max?: number; pattern?: string; message?: string }>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const obj = body as Record<string, unknown>;

  for (const [field, rule] of Object.entries(rules)) {
    const value = obj[field];
    
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(rule.message || `${field} is required`);
      continue;
    }
    
    if (value === undefined || value === null) continue;

    if (rule.type === 'email' && typeof value === 'string') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors.push(rule.message || `${field} must be a valid email`);
      }
    }

    if (rule.type === 'string' && typeof value !== 'string') {
      errors.push(rule.message || `${field} must be a string`);
    }

    if (typeof value === 'string') {
      if (rule.min && value.length < rule.min) {
        errors.push(rule.message || `${field} must be at least ${rule.min} characters`);
      }
      if (rule.max && value.length > rule.max) {
        errors.push(rule.message || `${field} must not exceed ${rule.max} characters`);
      }
      if (rule.pattern && !new RegExp(rule.pattern).test(value)) {
        errors.push(rule.message || `${field} format is invalid`);
      }
    }

    if (typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        errors.push(rule.message || `${field} must be at least ${rule.min}`);
      }
      if (rule.max !== undefined && value > rule.max) {
        errors.push(rule.message || `${field} must not exceed ${rule.max}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// Auth middleware for protected API routes
export async function authenticate(request: NextRequest): Promise<{ user: any } | NextResponse> {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const jwt = (await import('jsonwebtoken')).default;
    const secret = process.env.JWT_SECRET || 'tpc_jwt_70d1fb87f6814d46adae336433c68cc0';
    
    const decoded = jwt.verify(token, secret) as any;
    return { user: decoded };
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }
}

// Sanitize input to prevent XSS
export function sanitize(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// Common validation rules
export const commonRules = {
  email: { type: 'email', required: true, message: 'Valid email is required' },
  password: { type: 'string', required: true, min: 8, message: 'Password must be at least 8 characters' },
  name: { type: 'string', required: true, min: 2, max: 50, message: 'Name must be 2-50 characters' },
  amount: { type: 'string', required: true, message: 'Amount is required' },
};
