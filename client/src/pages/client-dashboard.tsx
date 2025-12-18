import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { NavigationHeader } from "@/components/navigation-header";
import { StatsCards } from "@/components/stats-cards";
import { ApplicationTable } from "@/components/application-table";
import { MobileApplicationsList } from "@/components/mobile/mobile-applications-list";
import { BottomNavigation } from "@/components/mobile/bottom-navigation";
import { MobileSearch } from "@/components/mobile/mobile-search";
import { MobileFilter } from "@/components/mobile/mobile-filter";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { exportApplicationsCSV } from "@/lib/csv-export";
import type { ClientStats, ApplicationFilters } from "@/types";

export default function ClientDashboard() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [showSearch, setShowSearch] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Partial<ApplicationFilters>>({
    clientId: user?.id,
  });

  const { data: stats, refetch: refetchStats } = useQuery<ClientStats>({
    queryKey: ["/api/stats/client", user?.id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/stats/client/${user?.id}`);
      return res.json();
    },
    enabled: !!user?.id,
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setFilters(prev => ({ ...prev, search: query || undefined }));
  };

  const handleApplyFilters = (newFilters: Partial<ApplicationFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, clientId: user?.id }));
  };

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
    await refetchStats();
    toast({ title: "Refreshed", description: "Data updated successfully" });
  };

  const handleExport = async () => {
    try {
      await exportApplicationsCSV(filters);
      toast({
        title: "Success",
        description: "Applications exported successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export applications",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavigationHeader user={user} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        {/* Client Stats */}
        {stats && <StatsCards stats={stats} type="client" />}

        {/* Assigned Team Section */}
        {stats && stats.assignedEmployees && stats.assignedEmployees.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">My Dedicated Team</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.assignedEmployees.map((employee, i) => (
                <div key={i} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center">
                  <div>
                    <p className="font-medium text-slate-900">{employee.name}</p>
                    <a
                      href={`mailto:${employee.email}`}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                    >
                      {employee.email}
                    </a>
                  </div>
                  <div className="bg-blue-50 p-2 rounded-full">
                    <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 font-semibold">
                      {employee.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mobile View */}
        {isMobile ? (
          <>
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Applications for Me</h2>
              <p className="text-sm text-slate-600">
                Read-only view of job applications submitted on your behalf
              </p>
            </div>

            <MobileApplicationsList
              filters={filters}
              readonly={true}
            />

            <BottomNavigation
              onSearchClick={() => setShowSearch(true)}
              onFilterClick={() => setShowFilter(true)}
              onRefreshClick={handleRefresh}
              onProfileClick={() => setLocation("/profile")}
              showProfile={true}
            />

            <MobileSearch
              isOpen={showSearch}
              onClose={() => setShowSearch(false)}
              onSearch={handleSearch}
              initialValue={searchQuery}
            />

            <MobileFilter
              isOpen={showFilter}
              onClose={() => setShowFilter(false)}
              onApplyFilters={handleApplyFilters}
              currentFilters={filters}
              showEmployeeFilter={false}
            />
          </>
        ) : (
          /* Desktop View */
          <ApplicationTable
            title="Applications for Me"
            description="Read-only view of job applications submitted on your behalf"
            showEmployeeColumn={true}
            showClientColumn={false}
            showActions={false}
            readonly={true}
            filters={{ clientId: user.id }}
            useLoadMore={true}
          />
        )}
      </div>
    </div>
  );
}
