import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NavigationHeader } from "@/components/navigation-header";
import { StatsCards } from "@/components/stats-cards";
import { ApplicationTable } from "@/components/application-table";
import { UserManagement } from "@/components/user-management";
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="applications" data-testid="tab-applications">
              All Applications
            </TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">
              User Management
            </TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">
              Analytics
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

          <TabsContent value="analytics" className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Analytics Dashboard</h3>
              <p className="text-slate-600">Advanced analytics and reporting features coming soon.</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
