import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider, MutationCache } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import { WalletProvider } from "@/hooks/use-wallet";
import { toast } from "@/hooks/use-toast";

import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Bounties from "@/pages/bounties";
import Residents from "@/pages/residents";
import Treasury from "@/pages/treasury";
import Chat from "@/pages/chat";
import Profile from "@/pages/profile";
import NotFound from "@/pages/not-found";

const mutationCache = new MutationCache({
  onError: (error: unknown) => {
    const status = (error as { status?: number })?.status;
    if (status === 401) {
      toast({
        title: "LOGIN REQUIRED",
        description: "You must be logged in to perform this action.",
        variant: "destructive",
      });
      const returnTo = encodeURIComponent(window.location.pathname);
      window.location.href = `/api/login?returnTo=${returnTo}`;
      return;
    }
    if (status === 403) {
      toast({
        title: "ACCESS DENIED",
        description:
          (error as { data?: { message?: string } })?.data?.message ||
          "You don't have permission to perform this action.",
        variant: "destructive",
      });
      return;
    }
    if (status === 429) {
      toast({
        title: "RATE LIMITED",
        description:
          (error as { data?: { message?: string } })?.data?.message ||
          "Too many requests. Please try again later.",
        variant: "destructive",
      });
    }
  },
});

const queryClient = new QueryClient({
  mutationCache,
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    }
  }
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route>
        <Layout>
          <Switch>
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/bounties" component={Bounties} />
            <Route path="/residents" component={Residents} />
            <Route path="/treasury" component={Treasury} />
            <Route path="/chat" component={Chat} />
            <Route path="/profile" component={Profile} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </WalletProvider>
    </QueryClientProvider>
  );
}

export default App;
