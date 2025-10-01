import { useQuery } from "@tanstack/react-query";
import { NavigationHeader } from "@/components/navigation-header";
import { StatsCards } from "@/components/stats-cards";
import { ApplicationTable } from "@/components/application-table";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import type { ClientStats } from "@/types";

export default function ClientDashboard() {
  const { user } = useAuth();

  const { data: stats } = useQuery<ClientStats>({
    queryKey: ["/api/stats/client", user?.id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/stats/client/${user?.id}`);
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
        {/* Client Stats */}
        {stats && <StatsCards stats={stats} type="client" />}

        {/* All Applications Table */}
        <ApplicationTable
          title="All Job Applications"
          description="Complete view of all job applications with applicant information"
          showEmployeeColumn={true}
          showClientColumn={true}
          showActions={false}
          readonly={true}
        />
      </div>
    </div>
  );
}
