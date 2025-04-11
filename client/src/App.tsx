import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { RealtimeSyncProvider } from "@/contexts/RealtimeSyncContext";
import { FreightProvider } from "@/contexts/FreightContext";
import { TooltipProvider } from "@/components/ui/tooltip";
// Usamos o OfflineBanner de components/layout em vez do ui/offline-banner para maior robustez
import AppLayout from "./components/layout/AppLayout";
import Home from "./pages/home";
import History from "./pages/history";
import Settings from "./pages/settings";
import Reports from "./pages/reports";
import Admin from "./pages/admin";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/history" component={History} />
      <Route path="/settings" component={Settings} />
      <Route path="/reports" component={Reports} />
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeSyncProvider>
        <FreightProvider>
          <TooltipProvider>
            <AppLayout>
              <Router />
            </AppLayout>
            {/* Banner offline já está incluído no AppLayout */}
            <Toaster />
          </TooltipProvider>
        </FreightProvider>
      </RealtimeSyncProvider>
    </QueryClientProvider>
  );
}

export default App;
