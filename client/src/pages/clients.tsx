import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NavigationHeader } from "@/components/navigation-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Search, UserCircle, ArrowLeft } from "lucide-react";
import type { ClientProfile, User } from "@/types";

type ClientWithStats = ClientProfile & {
  totalApplications?: number;
  applicationsRemaining?: number;
  lastActivity?: string;
};

export default function Clients() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: profiles, isLoading: profilesLoading } = useQuery<ClientProfile[]>({
    queryKey: ["/api/client-profiles"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/client-profiles");
      return res.json();
    },
  });

  const { data: clients } = useQuery<User[]>({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/clients");
      return res.json();
    },
  });

  if (!user) {
    return <div>Loading...</div>;
  }

  // Merge clients with their profiles
  const clientsWithProfiles: ClientWithStats[] = (clients || []).map(client => {
    const profile = profiles?.find(p => p.userId === client.id);
    return {
      userId: client.id,
      fullName: profile?.fullName || client.name,
      contactEmail: profile?.contactEmail,
      contactPassword: profile?.contactPassword,
      phoneNumber: profile?.phoneNumber || "",
      mailingAddress: profile?.mailingAddress || "",
      situation: profile?.situation || "",
      servicesRequested: profile?.servicesRequested || [],
      applicationQuota: profile?.applicationQuota || 0,
      startDate: profile?.startDate,
      searchScope: profile?.searchScope || [],
      states: profile?.states || [],
      cities: profile?.cities || [],
      desiredTitles: profile?.desiredTitles || "",
      targetCompanies: profile?.targetCompanies,
      resumeUrl: profile?.resumeUrl,
      linkedinUrl: profile?.linkedinUrl,
      workAuthorization: profile?.workAuthorization || "",
      sponsorshipAnswer: profile?.sponsorshipAnswer || "",
      additionalNotes: profile?.additionalNotes,
      baseResumeLatex: profile?.baseResumeLatex,
      createdAt: profile?.createdAt || client.createdAt,
      updatedAt: profile?.updatedAt || client.updatedAt,
      user: client,
      applicationsRemaining: (client as any).applicationsRemaining || 0,
    };
  });

  // Filter clients based on search
  const filteredClients = clientsWithProfiles.filter(client => {
    const searchLower = searchTerm.toLowerCase();
    return (
      client.fullName.toLowerCase().includes(searchLower) ||
      client.user?.email.toLowerCase().includes(searchLower) ||
      client.phoneNumber.toLowerCase().includes(searchLower) ||
      client.desiredTitles.toLowerCase().includes(searchLower)
    );
  }).sort((a, b) => (b.applicationsRemaining || 0) - (a.applicationsRemaining || 0));

  return (
    <div className="min-h-screen bg-slate-50">
      <NavigationHeader user={user} />
      
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8 pb-20 sm:pb-8">
        <Button 
          variant="ghost" 
          className="mb-4 min-h-[44px]"
          onClick={() => setLocation("/")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Back to Dashboard</span>
          <span className="sm:hidden">Back</span>
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Client Directory</CardTitle>
                <CardDescription>
                  View and manage client profiles
                </CardDescription>
              </div>
              <Badge variant="secondary">
                {filteredClients.length} {filteredClients.length === 1 ? 'Client' : 'Clients'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search by name, email, phone, or job title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Loading State */}
            {profilesLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}

            {/* Empty State */}
            {!profilesLoading && filteredClients.length === 0 && (
              <div className="text-center py-12">
                <UserCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">
                  {searchTerm ? "No clients found matching your search" : "No clients available"}
                </p>
              </div>
            )}

            {/* Clients Table - Desktop */}
            {!profilesLoading && filteredClients.length > 0 && (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Desired Titles</TableHead>
                        <TableHead>Apps Remaining</TableHead>
                        <TableHead>Profile Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClients.map((client) => (
                        <TableRow 
                          key={client.userId}
                          className="cursor-pointer hover:bg-slate-50"
                          onClick={() => setLocation(`/clients/${client.userId}`)}
                        >
                          <TableCell className="font-medium">{client.fullName}</TableCell>
                          <TableCell className="text-slate-600">
                            {client.user?.email}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {client.phoneNumber || "-"}
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-slate-600">
                            {client.desiredTitles || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={client.applicationsRemaining > 0 ? "default" : "secondary"}>
                              {client.applicationsRemaining}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {client.phoneNumber ? (
                              <Badge variant="default" className="bg-green-600">Complete</Badge>
                            ) : (
                              <Badge variant="secondary">Incomplete</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLocation(`/clients/${client.userId}`);
                              }}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card List */}
                <div className="md:hidden space-y-3">
                  {filteredClients.map((client) => (
                    <div
                      key={client.userId}
                      onClick={() => setLocation(`/clients/${client.userId}`)}
                      className="bg-white border border-slate-200 rounded-lg p-4 active:bg-slate-50 cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 truncate">{client.fullName}</h3>
                          <p className="text-sm text-slate-600 truncate">{client.user?.email}</p>
                        </div>
                        <div className="flex gap-2 ml-2">
                          <Badge variant={client.applicationsRemaining > 0 ? "default" : "secondary"}>
                            {client.applicationsRemaining}
                          </Badge>
                          {client.phoneNumber ? (
                            <Badge variant="default" className="bg-green-600">✓</Badge>
                          ) : (
                            <Badge variant="secondary">!</Badge>
                          )}
                        </div>
                      </div>
                      {client.phoneNumber && (
                        <p className="text-sm text-slate-600 mb-2">
                          <span className="font-medium">Phone:</span> {client.phoneNumber}
                        </p>
                      )}
                      {client.desiredTitles && (
                        <p className="text-sm text-slate-600 line-clamp-2">
                          <span className="font-medium">Titles:</span> {client.desiredTitles}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

