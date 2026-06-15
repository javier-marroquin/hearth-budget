import { type ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60, // 1 min
            gcTime: 1000 * 60 * 5, // 5 min
            retry: (failureCount, error) => {
              // Don't retry on 4xx errors
              const msg = error instanceof Error ? error.message : '';
              if (msg.includes('401') || msg.includes('403') || msg.includes('404')) {
                return false;
              }
              return failureCount < 2;
            },
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange={false}
        storageKey="hearth-budget:theme"
      >
        <TooltipProvider delayDuration={200}>
          {children}
          <Toaster richColors closeButton position="top-right" />
        </TooltipProvider>
      </ThemeProvider>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
