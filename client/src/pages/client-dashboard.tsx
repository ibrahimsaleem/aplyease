import { useQuery } from "@tanstack/react-query";
import { NavigationHeader } from "@/components/navigation-header";
import { StatsCards } from "@/components/stats-cards";
import { ApplicationTable } from "@/components/application-table";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import type { ClientStats } from "@/types";

export default function ClientDashboard() {
  const { user } = useAuth();

  const { data: stats } = useQuery<ClientStats & { applicationsRemaining?: number }>({
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
        {stats && <>
          <StatsCards stats={stats} type="client" />
          {typeof stats.applicationsRemaining === 'number' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Applications Left</p>
                    <p className="text-3xl font-bold text-slate-900">{stats.applicationsRemaining}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>}

        {/* Applications for Me Table */}
        <ApplicationTable
          title="Applications for Me"
          description="Read-only view of job applications submitted on your behalf"
          showEmployeeColumn={true}
          showClientColumn={false}
          showActions={false}
          readonly={true}
          filters={{ clientId: user.id }}
        />
      </div>
    </div>
  );
}
