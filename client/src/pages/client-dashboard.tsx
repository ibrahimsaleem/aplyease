import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { NavigationHeader } from "@/components/navigation-header";
import { StatsCards } from "@/components/stats-cards";
import { ApplicationTable } from "@/components/application-table";
import { MobileApplicationsList } from "@/components/mobile/mobile-applications-list";
import { BottomNavigation } from "@/components/mobile/bottom-navigation";
import { MobileSearch } from "@/components/mobile/mobile-search";
import { MobileFilter } from "@/components/mobile/mobile-filter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { exportApplicationsCSV } from "@/lib/csv-export";
import { DollarSign, Eye, EyeOff, Copy, Sparkles, Phone } from "lucide-react";
import type { ClientStats, ApplicationFilters } from "@/types";

// Helper function to format cents to dollars
const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
};

export default function ClientDashboard() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [showSearch, setShowSearch] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showPaymentInstructions, setShowPaymentInstructions] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
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

  // Show welcome modal on first visit for clients only
  useEffect(() => {
    if (user && user.role === "CLIENT") {
      const hasSeenWelcome = localStorage.getItem("hasSeenResumeToolWelcome");
      if (!hasSeenWelcome) {
        setShowWelcomeModal(true);
      }
    }
  }, [user]);

  const handleWelcomeModalClose = () => {
    localStorage.setItem("hasSeenResumeToolWelcome", "true");
    setShowWelcomeModal(false);
  };

  const handleTryResumeToolNow = () => {
    localStorage.setItem("hasSeenResumeToolWelcome", "true");
    setShowWelcomeModal(false);
    setLocation("/profile");
  };

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

        {/* Payment Information - Client Only */}
        {stats && (stats.amountPaid !== undefined || stats.amountDue !== undefined) && (
          <Card className="mb-8 border-2">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-emerald-50 p-3 rounded-lg">
                    <DollarSign className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Payment Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-slate-600">Amount Paid</p>
                        <p className="text-xl font-bold text-emerald-600">
                          {formatCurrency(stats.amountPaid || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">Amount Due</p>
                        <p className="text-xl font-bold text-amber-600">
                          {formatCurrency(stats.amountDue || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {(stats.amountDue || 0) > 0 && (
                  <div className="flex flex-col gap-2">
                    <Button
                      variant={showPaymentInstructions ? "secondary" : "default"}
                      size="sm"
                      onClick={() => setShowPaymentInstructions(!showPaymentInstructions)}
                      className="flex items-center gap-2"
                    >
                      {showPaymentInstructions ? (
                        <>
                          <EyeOff className="w-4 h-4" />
                          Hide Payment Details
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4" />
                          Show Payment Details
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>

              {/* Payment Instructions - Collapsible */}
              {showPaymentInstructions && (stats.amountDue || 0) > 0 && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-slate-900 leading-relaxed">
                    Hi <span className="font-semibold">{user?.name}</span>,
                  </p>
                  <p className="text-slate-900 mt-2 leading-relaxed">
                    You can <span className="font-semibold">Zelle the amount to</span>{" "}
                    <span className="inline-flex items-center gap-2 bg-white px-3 py-1 rounded border border-blue-300">
                      <span className="font-semibold text-blue-700">mqkatytx@gmail.com</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-blue-100"
                        onClick={() => {
                          navigator.clipboard.writeText("mqkatytx@gmail.com");
                          toast({
                            title: "Copied!",
                            description: "Zelle email copied to clipboard",
                          });
                        }}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </span>
                    , and share the screenshot we will mark it paid once received. Thank you!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Assigned Team Section */}
        {stats && stats.assignedEmployees && stats.assignedEmployees.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">My Dedicated Team</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.assignedEmployees.map((employee, i) => (
                <div key={i} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-medium text-slate-900">{employee.name}</p>
                      <a
                        href={`mailto:${employee.email}`}
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
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
                  {employee.whatsappNumber && (
                    <a
                      href={`https://wa.me/${employee.whatsappNumber.replace(/[^0-9+]/g, '')}?text=Hi%20${encodeURIComponent(employee.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 mt-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                      Chat on WhatsApp
                    </a>
                  )}
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

      {/* Welcome Modal for Resume Tool */}
      <Dialog open={showWelcomeModal} onOpenChange={handleWelcomeModalClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="w-6 h-6 text-purple-600" />
              New: AI Resume Tailoring Tool
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              Your base resume is already saved. Paste any job description and we'll generate a tailored resume you can use right away.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 font-bold">✓</span>
                  <span>Your base resume is ready</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 font-bold">✓</span>
                  <span>Paste any job description</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 font-bold">✓</span>
                  <span>Get a tailored resume instantly</span>
                </li>
              </ul>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleWelcomeModalClose}
              className="w-full sm:w-auto"
            >
              Maybe Later
            </Button>
            <Button
              onClick={handleTryResumeToolNow}
              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Try it Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
