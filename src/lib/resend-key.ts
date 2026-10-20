// Resend API key - loaded from environment, with hardcoded fallback
// The fallback ensures email works even if env vars aren't configured on the deployment platform
// Set RESEND_API_KEY in your deployment platform env vars to override this
export const RESEND_KEY = process.env.RESEND_API_KEY || 'PLACEHOLDER_RESEND_KEY';
