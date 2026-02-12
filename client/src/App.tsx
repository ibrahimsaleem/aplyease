import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import LandingPage from "@/pages/landing-page";
import WorkWithUsPage from "@/pages/work-with-us";
import PublicResumeFormatterPage from "@/pages/public-resume-formatter";
import PendingVerificationPage from "@/pages/pending-verification";
import AdminDashboard from "@/pages/admin-dashboard";
import EmployeeDashboard from "@/pages/employee-dashboard";
import ClientDashboard from "@/pages/client-dashboard";
import ClientProfile from "@/pages/client-profile";
import Clients from "@/pages/clients";
import ClientDetail from "@/pages/client-detail";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";

function ProtectedRoute({ component: Component, ...rest }: { component: React.ComponentType<any> }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

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

  if (!user) return null;

  return <Component />;
}

function Dashboard() {
  const { user } = useAuth();

  if (!user) return null;

  // Employees must be verified (isActive) before accessing dashboard
  if (user.role === "EMPLOYEE" && !user.isActive) {
    return <PendingVerificationPage />;
  }

  return (
    <>
      {user.role === "ADMIN" && <AdminDashboard />}
      {user.role === "EMPLOYEE" && <EmployeeDashboard />}
      {user.role === "CLIENT" && <ClientDashboard />}
    </>
  );
}

function Router() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  // Redirect to dashboard if logged in and trying to access login/signup
  useEffect(() => {
    if (user && (location === "/login" || location === "/signup")) {
      setLocation("/dashboard");
    }
  }, [user, location, setLocation]);

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

  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/work-with-us" component={WorkWithUsPage} />
      <Route path="/resume-formatter" component={PublicResumeFormatterPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={RegisterPage} />

      {/* Protected Routes */}
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/profile">
        <ProtectedRoute component={ClientProfile} />
      </Route>
      <Route path="/clients">
        {(user?.role === "EMPLOYEE" || user?.role === "ADMIN") && user?.isActive ? <Clients /> : <NotFound />}
      </Route>
      <Route path="/clients/:clientId">
        {(user?.role === "EMPLOYEE" || user?.role === "ADMIN") && user?.isActive ? <ClientDetail /> : <NotFound />}
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
