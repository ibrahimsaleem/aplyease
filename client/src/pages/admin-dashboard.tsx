import { useState, lazy, Suspense } from "react";
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

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("applications");

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/stats/dashboard"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/stats/dashboard");
      return res.json();
    },
  });

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
            <TabsTrigger value="financial" data-testid="tab-financial">
              Financial
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

          <TabsContent value="financial" className="space-y-6">
            <Suspense fallback={<div>Loading financial overview...</div>}>
              <FinancialOverview />
            </Suspense>
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
    </div>
  );
}
