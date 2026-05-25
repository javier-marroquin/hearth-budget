import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function OnboardingPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>{t('onboarding.title')}</CardTitle>
          <CardDescription>{t('onboarding.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            El formulario de creación de hogar se implementa en F2.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
