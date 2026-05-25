import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Home, Loader2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { onboardingSchema, type OnboardingInput } from '@/schemas/onboarding.schema';
import { useCreateHousehold, useMyHouseholds } from '../hooks/use-households';
import { Navigate } from 'react-router-dom';
import { env } from '@/lib/env';
import { HOUSEHOLD_TIMEZONES } from '@/lib/timezones';
import { useAuthStore } from '@/features/auth/stores/auth.store';

const CURRENCIES = ['USD', 'COP', 'EUR', 'MXN', 'ARS', 'CLP', 'PEN', 'BRL', 'GBP'];

function defaultFullName(user: { full_name?: string | null; email?: string | null } | null) {
  if (user?.full_name?.trim()) return user.full_name.trim();
  if (user?.email) return user.email.split('@')[0] ?? '';
  return '';
}

export function OnboardingPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { data: myHouseholds, isLoading } = useMyHouseholds();
  const create = useCreateHousehold();

  const form = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      fullName: defaultFullName(user),
      name: '',
      currency: env.DEFAULT_CURRENCY,
      timezone: env.DEFAULT_TIMEZONE,
    },
  });

  // Already has a household → skip onboarding.
  if (!isLoading && myHouseholds && myHouseholds.length > 0) {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = (values: OnboardingInput) => {
    create.mutate(values);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-background to-sky-50 p-4 dark:from-emerald-950/30 dark:to-sky-950/30">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <Card>
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-sky-500 text-white shadow-lg">
              <Home className="h-7 w-7" />
            </div>
            <CardTitle className="text-2xl">{t('onboarding.title')}</CardTitle>
            <CardDescription>{t('onboarding.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('onboarding.your_name')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('onboarding.your_name_placeholder')}
                          autoComplete="name"
                          autoFocus
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('onboarding.household_name')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('onboarding.household_name_placeholder')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('onboarding.currency')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CURRENCIES.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="timezone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('onboarding.timezone')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {HOUSEHOLD_TIMEZONES.map((tz) => (
                              <SelectItem key={tz.value} value={tz.value}>
                                {tz.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={create.isPending}
                >
                  {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t('onboarding.create_household')}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
