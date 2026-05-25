/** User-facing message for Supabase / network failures. */
export function formatSupabaseError(err: unknown): string {
  if (err instanceof TypeError && err.message === 'Failed to fetch') {
    return (
      'No se pudo conectar con Supabase. Revisa tu internet, que el proyecto esté activo ' +
      'y que hayas ejecutado `supabase db push` (migración 0008).'
    );
  }

  if (err && typeof err === 'object' && 'message' in err) {
    const msg = String((err as { message: unknown }).message);
    if (msg.includes('recurring_templates') && msg.includes('does not exist')) {
      return 'Falta la tabla recurring_templates. Ejecuta `supabase db push` en el proyecto.';
    }
    return msg;
  }

  return 'Ocurrió un error inesperado';
}
