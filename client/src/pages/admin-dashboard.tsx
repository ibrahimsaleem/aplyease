import { useEffect, useState, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NavigationHeader } from "@/components/navigation-header";
import { StatsCards } from "@/components/stats-cards";
import { ApplicationTable } from "@/components/application-table";
import { UserManagement } from "@/components/user-management";
const EmployeePerformanceAnalytics = lazy(() => import("@/components/employee-performance-analytics").then(m => ({ default: m.EmployeePerformanceAnalytics })));
const ClientPerformanceAnalytics = lazy(() => import("@/components/client-performance-analytics").then(m => ({ default: m.ClientPerformanceAnalytics })));
const MonthlyPayoutAnalytics = lazy(() => import("@/components/monthly-payout-analytics").then(m => ({ default: m.MonthlyPayoutAnalytics })));
const FinancialOverview = lazy(() => import("@/components/financial-overview").then(m => ({ default: m.FinancialOverview })));
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import type { DashboardStats } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("applications");
  const [isUnlockOpen, setIsUnlockOpen] = useState(false);
  const [unlockCode, setUnlockCode] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  const [isUnlocked, setIsUnlocked] = useState(() => {
    try {
      return sessionStorage.getItem("aplyease:secureTabUnlocked") === "true";
    } catch {
      return false;
    }
  });

  // If someone lands on the restricted tab without unlock, bounce them to the code prompt.
  useEffect(() => {
    if (activeTab === "financial" && !isUnlocked) {
      setActiveTab("secure");
      setIsUnlockOpen(true);
    }
  }, [activeTab, isUnlocked]);

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/stats/dashboard"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/stats/dashboard");
      return res.json();
    },
  });

  const submitUnlock = async () => {
    setUnlockError(null);
    const trimmed = unlockCode.trim();
    if (!trimmed) {
      setUnlockError("Code is required.");
      return;
    }

    setUnlocking(true);
    try {
      const res = await apiRequest("POST", "/api/admin/unlock-financial", { code: trimmed });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setUnlockError(data?.message || "Invalid code.");
        return;
      }

      try {
        sessionStorage.setItem("aplyease:secureTabUnlocked", "true");
      } catch {
        // If storage is unavailable, still allow navigation for this session.
      }
      setIsUnlocked(true);

      setIsUnlockOpen(false);
      setUnlockCode("");
      setActiveTab("financial");
    } catch (e: any) {
      setUnlockError(e?.message || "Failed to verify code.");
    } finally {
      setUnlocking(false);
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavigationHeader user={user} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Stats */}
        {stats && <StatsCards stats={stats} type="admin" />}

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full overflow-x-auto">
            <TabsTrigger value="applications" data-testid="tab-applications">
              All Applications
            </TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">
              User Management
            </TabsTrigger>
            <TabsTrigger value="employee-analytics" data-testid="tab-employee-analytics">
              Employee Analytics
            </TabsTrigger>
            <TabsTrigger value="client-analytics" data-testid="tab-client-analytics">
              Client Analytics
            </TabsTrigger>
            <TabsTrigger value="monthly-payout" data-testid="tab-monthly-payout">
              Monthly Payout
            </TabsTrigger>
            <TabsTrigger
              value="secure"
              data-testid="tab-secure"
              onClick={() => setIsUnlockOpen(true)}
            >
              Enter Code
            </TabsTrigger>
          </TabsList>

          <TabsContent value="applications" className="space-y-6">
            <ApplicationTable
              title="Job Applications"
              showEmployeeColumn={true}
              showClientColumn={true}
              showActions={true}
              readonly={false}
            />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <UserManagement />
          </TabsContent>

          <TabsContent value="secure" className="space-y-6">
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-900">Restricted section</div>
                  <div className="text-sm text-slate-600">Enter the secret code to continue.</div>
                </div>
                <Button onClick={() => setIsUnlockOpen(true)} variant="default">
                  Enter Code
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="financial" className="space-y-6">
            {isUnlocked ? (
              <Suspense fallback={<div>Loading...</div>}>
                <FinancialOverview />
              </Suspense>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-white p-6">
                <div className="text-sm font-medium text-slate-900">Restricted section</div>
                <div className="text-sm text-slate-600">Enter the secret code to continue.</div>
                <div className="mt-4">
                  <Button onClick={() => setIsUnlockOpen(true)}>Enter Code</Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="employee-analytics" className="space-y-6">
            <Suspense fallback={<div>Loading employee analytics...</div>}>
              <EmployeePerformanceAnalytics />
            </Suspense>
          </TabsContent>

          <TabsContent value="client-analytics" className="space-y-6">
            <Suspense fallback={<div>Loading client analytics...</div>}>
              <ClientPerformanceAnalytics />
            </Suspense>
          </TabsContent>

          <TabsContent value="monthly-payout" className="space-y-6">
            <Suspense fallback={<div>Loading monthly payout...</div>}>
              <MonthlyPayoutAnalytics />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isUnlockOpen} onOpenChange={setIsUnlockOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enter code</DialogTitle>
            <DialogDescription>Enter the secret code to view the restricted section.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={unlockCode}
              onChange={(e) => setUnlockCode(e.target.value)}
              placeholder="Secret code"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") submitUnlock();
              }}
            />
            {unlockError && <div className="text-sm text-red-600">{unlockError}</div>}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setIsUnlockOpen(false)} disabled={unlocking}>
                Cancel
              </Button>
              <Button onClick={submitUnlock} disabled={unlocking}>
                {unlocking ? "Verifying..." : "Continue"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
