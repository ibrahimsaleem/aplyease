import { useQuery } from "@tanstack/react-query";
import { NavigationHeader } from "@/components/navigation-header";
import { StatsCards } from "@/components/stats-cards";
import { ApplicationForm } from "@/components/application-form";
import { ApplicationTable } from "@/components/application-table";
import { useAuth } from "@/hooks/use-auth";
import type { EmployeeStats } from "@/types";

export default function EmployeeDashboard() {
  const { user } = useAuth();

  const { data: stats } = useQuery<EmployeeStats>({
    queryKey: ["/api/stats/employee", user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/stats/employee/${user?.id}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch employee stats");
      }
      
      return response.json();
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

        {/* Quick Add Application */}
        <ApplicationForm />

        {/* My Applications Table */}
        <ApplicationTable
          title="My Applications"
          description="Applications you have submitted"
          showEmployeeColumn={false}
          showClientColumn={true}
          showActions={true}
          readonly={false}
          filters={{ employeeId: user.id }}
        />
      </div>
    </div>
  );
}
