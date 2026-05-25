import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { magicLinkSchema, type MagicLinkInput } from '@/schemas/auth.schema';
import { useAuth } from '../hooks/use-auth';
import { useAuthStore } from '../stores/auth.store';
import { Navigate, useSearchParams } from 'react-router-dom';

export function LoginPage() {
  const { t } = useTranslation();
  const { sendMagicLink, isSendingMagicLink } = useAuth();
  const user = useAuthStore((s) => s.user);
  const [params] = useSearchParams();
  const inviteToken = params.get('invite') ?? undefined;

  const form = useForm<MagicLinkInput>({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: { email: '' },
  });

  if (user) return <Navigate to="/dashboard" replace />;

  const onSubmit = (values: MagicLinkInput) => {
    sendMagicLink({ email: values.email, inviteToken });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-background to-sky-50 p-4 dark:from-emerald-950/30 dark:via-background dark:to-sky-950/30">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-sky-500 text-white shadow-lg">
              <Sparkles className="h-7 w-7" />
            </div>
            <CardTitle className="text-2xl tracking-tight">
              {t('auth.magic_link_title')}
            </CardTitle>
            <CardDescription>{t('auth.magic_link_subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('auth.email_label')}</FormLabel>
                      <FormControl>
                        <Input
                          autoComplete="email"
                          inputMode="email"
                          placeholder={t('auth.email_placeholder')}
                          autoFocus
                          {...field}
                        />
                      </FormControl>
                      <FormMessage>
                        {form.formState.errors.email?.message
                          ? t(form.formState.errors.email.message as string)
                          : null}
                      </FormMessage>
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isSendingMagicLink}
                >
                  {isSendingMagicLink ? t('common.loading') : t('auth.send_magic_link')}
                </Button>
              </form>
            </Form>
            <p className="mt-6 text-center text-xs text-muted-foreground">
              {t('app.tagline')}
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
