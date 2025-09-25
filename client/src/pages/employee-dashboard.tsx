import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NavigationHeader } from "@/components/navigation-header";
import { StatsCards } from "@/components/stats-cards";
import { ApplicationForm } from "@/components/application-form";
import { ApplicationTable } from "@/components/application-table";
import { ClientPerformanceAnalytics } from "@/components/client-performance-analytics";
import { MyMonthlyPayout } from "@/components/my-monthly-payout";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import type { EmployeeStats } from "@/types";

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("applications");

  const { data: stats } = useQuery<EmployeeStats>({
    queryKey: ["/api/stats/employee", user?.id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/stats/employee/${user?.id}`);
      return res.json();
    },
    enabled: !!user?.id,
  });

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavigationHeader user={user} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Employee Stats */}
        {stats && <StatsCards stats={stats} type="employee" />}

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full overflow-x-auto">
            <TabsTrigger value="applications" data-testid="tab-applications">
              All Applications
            </TabsTrigger>
            <TabsTrigger value="client-analytics" data-testid="tab-client-analytics">
              Client Analytics
            </TabsTrigger>
            <TabsTrigger value="my-payout" data-testid="tab-my-payout">
              My Payout
            </TabsTrigger>
          </TabsList>

          <TabsContent value="applications" className="space-y-6">
            {/* Quick Add Application */}
            <ApplicationForm />

            {/* All Applications Table */}
            <ApplicationTable
              title="All Applications"
              description="View all applications to prevent duplicates and coordinate with other employees"
              showEmployeeColumn={true}
              showClientColumn={true}
              showActions={true}
              readonly={false}
            />
          </TabsContent>

          <TabsContent value="client-analytics" className="space-y-6">
            <ClientPerformanceAnalytics />
          </TabsContent>

          <TabsContent value="my-payout" className="space-y-6">
            <MyMonthlyPayout />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
