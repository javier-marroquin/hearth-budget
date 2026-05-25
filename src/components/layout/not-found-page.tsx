import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <h1 className="text-7xl font-bold tracking-tight">404</h1>
      <p className="max-w-md text-muted-foreground">
        La página que buscas no existe o fue movida.
      </p>
      <Button asChild>
        <Link to="/dashboard">Volver al inicio</Link>
      </Button>
    </div>
  );
}
