import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Navigate, useSearchParams } from 'react-router-dom';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  signInSchema,
  signUpSchema,
  type SignInInput,
  type SignUpInput,
} from '@/schemas/auth.schema';
import { useAuth } from '../hooks/use-auth';
import { useAuthStore } from '../stores/auth.store';

export function LoginPage() {
  const { t } = useTranslation();
  const { signIn, isSigningIn, signUp, isSigningUp } = useAuth();
  const user = useAuthStore((s) => s.user);
  const [params] = useSearchParams();
  const inviteToken = params.get('invite') ?? undefined;
  const [tab, setTab] = useState<'sign-in' | 'sign-up'>('sign-in');

  const signInForm = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const signUpForm = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '', confirmPassword: '', fullName: '' },
  });

  if (user) return <Navigate to="/dashboard" replace />;

  const onSignIn = (values: SignInInput) => {
    signIn({ ...values, inviteToken });
  };

  const onSignUp = (values: SignUpInput) => {
    signUp({
      email: values.email,
      password: values.password,
      fullName: values.fullName,
      inviteToken,
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <div className="w-full max-w-md animate-fade-in">
        <Card className="border-border shadow-none">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-foreground text-[11px] font-bold text-background">
              PH
            </div>
            <CardTitle className="text-subtitle">
              {tab === 'sign-in' ? t('auth.login_title') : t('auth.signup_title')}
            </CardTitle>
            <CardDescription>
              {tab === 'sign-in'
                ? t('auth.login_subtitle')
                : t('auth.signup_subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={tab}
              onValueChange={(v) => setTab(v as 'sign-in' | 'sign-up')}
            >
              <TabsList className="mb-4 grid w-full grid-cols-2">
                <TabsTrigger value="sign-in">{t('auth.login')}</TabsTrigger>
                <TabsTrigger value="sign-up">{t('auth.signup')}</TabsTrigger>
              </TabsList>

              <TabsContent value="sign-in">
                <Form {...signInForm}>
                  <form
                    onSubmit={signInForm.handleSubmit(onSignIn)}
                    className="space-y-4"
                  >
                    <FormField
                      control={signInForm.control}
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
                            {signInForm.formState.errors.email?.message
                              ? t(signInForm.formState.errors.email.message)
                              : null}
                          </FormMessage>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signInForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('auth.password_label')}</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              autoComplete="current-password"
                              placeholder="••••••••"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage>
                            {signInForm.formState.errors.password?.message
                              ? t(signInForm.formState.errors.password.message)
                              : null}
                          </FormMessage>
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      disabled={isSigningIn}
                    >
                      {isSigningIn ? t('common.loading') : t('auth.login')}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="sign-up">
                <Form {...signUpForm}>
                  <form
                    onSubmit={signUpForm.handleSubmit(onSignUp)}
                    className="space-y-4"
                  >
                    <FormField
                      control={signUpForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('auth.full_name_label')}</FormLabel>
                          <FormControl>
                            <Input
                              autoComplete="name"
                              placeholder={t('auth.full_name_placeholder')}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signUpForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('auth.email_label')}</FormLabel>
                          <FormControl>
                            <Input
                              autoComplete="email"
                              inputMode="email"
                              placeholder={t('auth.email_placeholder')}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage>
                            {signUpForm.formState.errors.email?.message
                              ? t(signUpForm.formState.errors.email.message)
                              : null}
                          </FormMessage>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signUpForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('auth.password_label')}</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              autoComplete="new-password"
                              placeholder="••••••••"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage>
                            {signUpForm.formState.errors.password?.message
                              ? t(signUpForm.formState.errors.password.message)
                              : null}
                          </FormMessage>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signUpForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('auth.confirm_password_label')}</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              autoComplete="new-password"
                              placeholder="••••••••"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage>
                            {signUpForm.formState.errors.confirmPassword?.message
                              ? t(
                                  signUpForm.formState.errors.confirmPassword
                                    .message,
                                )
                              : null}
                          </FormMessage>
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      disabled={isSigningUp}
                    >
                      {isSigningUp ? t('common.loading') : t('auth.create_account')}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              {t('app.tagline')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
