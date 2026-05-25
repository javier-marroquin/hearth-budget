import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function AcceptInvitePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Aceptar invitación</CardTitle>
          <CardDescription>
            Esta vista se completa en F7 (Netlify Functions + tokens firmados).
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}
