import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, XCircle, TrendingDown, Lightbulb, ExternalLink } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { RejectionRateStats, JobApplication } from "@/types";

interface RejectionRateAnalyticsProps {
  role: "client" | "employee";
}

export function RejectionRateAnalytics({ role }: RejectionRateAnalyticsProps) {
  const { user } = useAuth();

  const endpoint =
    role === "client"
      ? `/api/analytics/rejection-rate/client/${user?.id}`
      : `/api/analytics/rejection-rate/employee/${user?.id}`;

  const { data: stats, isLoading, error } = useQuery<RejectionRateStats>({
    queryKey: [endpoint],
    queryFn: async () => {
      const res = await apiRequest("GET", endpoint);
      if (!res.ok) throw new Error("Failed to fetch rejection stats");
      return res.json();
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000, // 1 minute – avoid refetching on every tab focus
    retry: 1, // Avoid request storm on 429
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <div className="animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-1/4 mb-4"></div>
            <div className="h-8 bg-slate-200 rounded w-1/2 mb-6"></div>
            <div className="h-64 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <p className="text-red-600">Failed to load rejection rate analytics.</p>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const app = (a: JobApplication) => (a as JobApplication & { client?: { name: string }; employee?: { name: string } });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Applications</p>
                <p className="text-3xl font-bold text-slate-900">{stats.totalApplications}</p>
              </div>
              <div className="bg-slate-200 p-3 rounded-lg">
                <FileText className="w-6 h-6 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Rejected</p>
                <p className="text-3xl font-bold text-red-900">{stats.rejectedCount}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-lg">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600">Rejection Rate</p>
                <p className="text-3xl font-bold text-amber-900">{stats.rejectionRate}%</p>
              </div>
              <div className="bg-amber-100 p-3 rounded-lg">
                <TrendingDown className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tips for Employees */}
      {role === "employee" && (
        <Alert className="bg-blue-50 border-blue-200">
          <Lightbulb className="h-4 w-4 text-blue-600" />
          <AlertDescription>
            <p className="font-semibold text-blue-900 mb-2">Tips to Lower Rejection Rate</p>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Use the AI Resume Tool before submitting; aim for <strong>90+ ATS score</strong></li>
              <li>Ensure job titles align with the client&apos;s desired titles (check client profile)</li>
              <li>Apply to roles in the client&apos;s target locations and companies when specified</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Rejected Applications Table */}
      <Card>
        <CardHeader>
          <CardTitle>Rejected Applications</CardTitle>
          <p className="text-sm text-slate-600">
            {stats.rejectedCount === 0
              ? "No rejected applications"
              : `${stats.rejectedCount} application(s) with status Rejected`}
          </p>
        </CardHeader>
        <CardContent>
          {stats.rejectedApplications.length === 0 ? (
            <p className="text-slate-500 py-8 text-center">No rejected applications to display.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date Applied</TableHead>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Company</TableHead>
                    {role === "client" && <TableHead>Applied By</TableHead>}
                    {role === "employee" && <TableHead>Client</TableHead>}
                    <TableHead>Link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.rejectedApplications.map((application) => {
                    const a = app(application);
                    return (
                      <TableRow key={application.id}>
                        <TableCell>{application.dateApplied}</TableCell>
                        <TableCell className="font-medium">{application.jobTitle}</TableCell>
                        <TableCell>{application.companyName}</TableCell>
                        {role === "client" && (
                          <TableCell>{a.employee?.name ?? "-"}</TableCell>
                        )}
                        {role === "employee" && (
                          <TableCell>{a.client?.name ?? "-"}</TableCell>
                        )}
                        <TableCell>
                          {application.jobLink ? (
                            <a
                              href={application.jobLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline inline-flex items-center gap-1"
                            >
                              <ExternalLink className="w-4 h-4" />
                              View
                            </a>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
