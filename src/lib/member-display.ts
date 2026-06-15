import i18n from '@/i18n';

/** Label for a household member in lists, selects, and charts. */
export function memberDisplayName(member: {
  profile?: { full_name?: string | null; email?: string | null } | null;
  invited_email?: string | null;
}): string {
  const name = member.profile?.full_name?.trim();
  if (name) return name;
  if (member.profile?.email) return member.profile.email;
  if (member.invited_email) return member.invited_email;
  return i18n.t('member_display.unnamed');
}
