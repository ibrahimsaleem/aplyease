import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NavigationHeader } from "@/components/navigation-header";
import { StatsCards } from "@/components/stats-cards";
import { ApplicationForm } from "@/components/application-form";
import { ApplicationTable } from "@/components/application-table";
import { ClientPerformanceAnalytics } from "@/components/client-performance-analytics";
import { MyMonthlyPayout } from "@/components/my-monthly-payout";
import { RejectionRateAnalytics } from "@/components/rejection-rate-analytics";
import { useAuth } from "@/hooks/use-auth";
import { EmployeeTraining } from "@/components/employee-training";
import { apiRequest } from "@/lib/queryClient";
import type { EmployeeStats } from "@/types";

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("training");

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

        {/* Assigned Clients List */}
        {stats && stats.assignedClients && stats.assignedClients.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">My Assigned Clients</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.assignedClients.map((client, i) => (
                <div key={i} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center">
                  <div>
                    <p className="font-medium text-slate-900">{client.name}</p>
                    <p className="text-sm text-slate-500">Assigned Client</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-blue-600">{client.appsRemaining}</p>
                    <p className="text-xs text-slate-500">Apps Left</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full overflow-x-auto">
            <TabsTrigger value="training" data-testid="tab-training">
              Training & Guide
            </TabsTrigger>
            <TabsTrigger value="applications" data-testid="tab-applications">
              All Applications
            </TabsTrigger>
            <TabsTrigger value="client-analytics" data-testid="tab-client-analytics">
              Client Analytics
            </TabsTrigger>
            <TabsTrigger value="my-payout" data-testid="tab-my-payout">
              My Payout
            </TabsTrigger>
            <TabsTrigger value="rejection-rate" data-testid="tab-rejection-rate">
              Rejection Rate
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

          <TabsContent value="training" className="space-y-6">
            <EmployeeTraining />
          </TabsContent>

          <TabsContent value="my-payout" className="space-y-6">
            <MyMonthlyPayout />
          </TabsContent>

          <TabsContent value="rejection-rate" className="space-y-6">
            <RejectionRateAnalytics role="employee" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
