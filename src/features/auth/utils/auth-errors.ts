import type { TFunction } from 'i18next';

/** Map Supabase Auth API errors to user-facing copy. */
export function getAuthErrorMessage(error: unknown, t: TFunction): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : '';

  const lower = message.toLowerCase();

  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid email or password')
  ) {
    return t('auth.invalid_credentials');
  }

  if (lower.includes('email not confirmed')) {
    return t('auth.email_not_confirmed');
  }

  if (
    lower.includes('user already registered') ||
    lower.includes('already been registered')
  ) {
    return t('auth.user_already_exists');
  }

  if (lower.includes('password') && lower.includes('weak')) {
    return t('auth.password_too_short');
  }

  if (
    lower.includes('rate limit') ||
    lower.includes('over_email_send_rate_limit') ||
    lower.includes('email rate limit')
  ) {
    return t('auth.rate_limit_error');
  }

  if (
    lower.includes('error sending confirmation') ||
    lower.includes('error sending invite') ||
    lower.includes('confirmation email') ||
    lower.includes('535') ||
    lower.includes('authentication failed')
  ) {
    return t('auth.smtp_error');
  }

  if (lower.includes('failed to fetch') || lower.includes('network error')) {
    return t('auth.api_unreachable');
  }

  return message || t('common.error');
}
