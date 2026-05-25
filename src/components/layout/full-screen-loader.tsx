import { Loader2 } from 'lucide-react';

export function FullScreenLoader({ label }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        {label ? <p className="text-sm">{label}</p> : null}
      </div>
    </div>
  );
}
