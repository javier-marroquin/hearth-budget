import { lazy, Suspense } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';
import { FullScreenLoader } from '@/components/layout/full-screen-loader';
import { ProtectedRoute } from '@/features/auth/components/protected-route';
import { AppShell } from '@/components/layout/app-shell';
import { AuthSessionBootstrapper } from '@/features/auth/components/auth-session-bootstrapper';

// Lazy-load pages for code splitting.
const LoginPage = lazy(() =>
  import('@/features/auth/pages/login-page').then((m) => ({ default: m.LoginPage })),
);
const CheckEmailPage = lazy(() =>
  import('@/features/auth/pages/check-email-page').then((m) => ({
    default: m.CheckEmailPage,
  })),
);
const AuthCallbackPage = lazy(() =>
  import('@/features/auth/pages/auth-callback-page').then((m) => ({
    default: m.AuthCallbackPage,
  })),
);
const AcceptInvitePage = lazy(() =>
  import('@/features/auth/pages/accept-invite-page').then((m) => ({
    default: m.AcceptInvitePage,
  })),
);
const OnboardingPage = lazy(() =>
  import('@/features/households/pages/onboarding-page').then((m) => ({
    default: m.OnboardingPage,
  })),
);
const DashboardPage = lazy(() =>
  import('@/features/dashboard/pages/dashboard-page').then((m) => ({
    default: m.DashboardPage,
  })),
);
const CalendarPage = lazy(() =>
  import('@/features/calendar/pages/calendar-page').then((m) => ({
    default: m.CalendarPage,
  })),
);
const IncomesPage = lazy(() =>
  import('@/features/incomes/pages/incomes-page').then((m) => ({
    default: m.IncomesPage,
  })),
);
const ExpensesPage = lazy(() =>
  import('@/features/expenses/pages/expenses-page').then((m) => ({
    default: m.ExpensesPage,
  })),
);
const ContributionsPage = lazy(() =>
  import('@/features/contributions/pages/contributions-page').then((m) => ({
    default: m.ContributionsPage,
  })),
);
const CategoriesPage = lazy(() =>
  import('@/features/categories/pages/categories-page').then((m) => ({
    default: m.CategoriesPage,
  })),
);
const SchedulesPage = lazy(() =>
  import('@/features/schedules/pages/schedules-page').then((m) => ({
    default: m.SchedulesPage,
  })),
);
const GoalsPage = lazy(() =>
  import('@/features/savings-goals/pages/goals-page').then((m) => ({
    default: m.GoalsPage,
  })),
);
const BudgetPage = lazy(() =>
  import('@/features/budget/pages/budget-page').then((m) => ({
    default: m.BudgetPage,
  })),
);
const MembersPage = lazy(() =>
  import('@/features/households/pages/members-page').then((m) => ({
    default: m.MembersPage,
  })),
);
const NotificationsPage = lazy(() =>
  import('@/features/notifications/pages/notifications-page').then((m) => ({
    default: m.NotificationsPage,
  })),
);
const SettingsPage = lazy(() =>
  import('@/features/settings/pages/settings-page').then((m) => ({
    default: m.SettingsPage,
  })),
);
const NotFoundPage = lazy(() =>
  import('@/components/layout/not-found-page').then((m) => ({
    default: m.NotFoundPage,
  })),
);

export function AppRouter() {
  return (
    <BrowserRouter>
      <AuthSessionBootstrapper />
      <Suspense fallback={<FullScreenLoader />}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/check-email" element={<CheckEmailPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/invite" element={<AcceptInvitePage />} />

          {/* Protected routes (require auth) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/onboarding" element={<OnboardingPage />} />

            {/* Routes that require an active household */}
            <Route element={<AppShell />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/incomes" element={<IncomesPage />} />
              <Route path="/expenses" element={<ExpensesPage />} />
              <Route path="/contributions" element={<ContributionsPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/schedules" element={<SchedulesPage />} />
              <Route path="/goals" element={<GoalsPage />} />
              <Route path="/budget" element={<BudgetPage />} />
              <Route path="/members" element={<MembersPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
