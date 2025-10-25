import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import LoginPage from "@/pages/login";
import AdminDashboard from "@/pages/admin-dashboard";
import EmployeeDashboard from "@/pages/employee-dashboard";
import ClientDashboard from "@/pages/client-dashboard";
import ClientProfile from "@/pages/client-profile";
import Clients from "@/pages/clients";
import ClientDetail from "@/pages/client-detail";
import NotFound from "@/pages/not-found";

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <Switch>
      <Route path="/">
        {user.role === "ADMIN" && <AdminDashboard />}
        {user.role === "EMPLOYEE" && <EmployeeDashboard />}
        {user.role === "CLIENT" && <ClientDashboard />}
      </Route>
      <Route path="/profile">
        <ClientProfile />
      </Route>
      <Route path="/clients">
        {user.role === "EMPLOYEE" || user.role === "ADMIN" ? <Clients /> : <NotFound />}
      </Route>
      <Route path="/clients/:clientId">
        {user.role === "EMPLOYEE" || user.role === "ADMIN" ? <ClientDetail /> : <NotFound />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
