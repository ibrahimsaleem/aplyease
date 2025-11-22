import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Users, Target, FileText, BarChart3 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { ClientPerformanceAnalytics } from "@/types";

export function ClientPerformanceAnalytics() {
  const { data: analytics, isLoading, error } = useQuery<ClientPerformanceAnalytics>({
    queryKey: ["/api/analytics/client-performance"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/analytics/client-performance");
      return res.json();
    },
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
        <p className="text-red-600">Failed to load client performance analytics.</p>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  // Calculate summary stats
  const highPriorityClients = analytics.clients.filter(c => c.priority === "High");
  const totalApplicationsRemaining = analytics.clients.reduce((sum, client) => sum + client.applicationsRemaining, 0);
  const averageSuccessRate = analytics.clients.length > 0
    ? analytics.clients.reduce((sum, client) => sum + client.successRate, 0) / analytics.clients.length
    : 0;

  // Prepare chart data: Sort by applications remaining (descending)
  const chartData = [...analytics.clients]
    .sort((a, b) => b.applicationsRemaining - a.applicationsRemaining);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">High Priority Clients</p>
                <p className="text-3xl font-bold text-red-900" data-testid="text-high-priority">
                  {highPriorityClients.length}
                </p>
                <p className="text-sm text-red-600 mt-1">
                  Need immediate attention
                </p>
              </div>
              <div className="bg-red-100 p-3 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Applications Left</p>
                <p className="text-3xl font-bold text-blue-900" data-testid="text-total-apps-left">
                  {totalApplicationsRemaining}
                </p>
                <p className="text-sm text-blue-600 mt-1">
                  Across all clients
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Average Success Rate</p>
                <p className="text-3xl font-bold text-green-900" data-testid="text-avg-success">
                  {averageSuccessRate.toFixed(1)}%
                </p>
                <p className="text-sm text-green-600 mt-1">
                  Hired/Total applications
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <Target className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Active Clients</p>
                <p className="text-3xl font-bold text-purple-900" data-testid="text-active-clients">
                  {analytics.totalClients}
                </p>
                <p className="text-sm text-purple-600 mt-1">
                  Total client accounts
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Applications Remaining Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Applications Remaining by Client
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" />
              <YAxis
                dataKey="name"
                type="category"
                width={120}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: 'transparent' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend />
              <Bar
                dataKey="applicationsRemaining"
                name="Applications Remaining"
                fill="#3b82f6"
                radius={[0, 4, 4, 0]}
                barSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Client Table */}
      <Card>
        <CardHeader>
          <CardTitle>Client Performance Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Company</TableHead>
                <TableHead className="text-center">Apps Left</TableHead>
                <TableHead className="text-center">Total Apps</TableHead>
                <TableHead className="text-center">In Progress</TableHead>
                <TableHead className="text-center">Interviews</TableHead>
                <TableHead className="text-center">Hired</TableHead>
                <TableHead className="text-center">Success Rate</TableHead>
                <TableHead className="text-center">Priority</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics.clients.map((client) => {
                const priorityColor = client.priority === "High" ? "bg-red-100 text-red-800" :
                  client.priority === "Medium" ? "bg-amber-100 text-amber-800" :
                    "bg-green-100 text-green-800";

                return (
                  <TableRow key={client.id} className={client.priority === "High" ? "bg-red-50" : ""}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>{client.company || "-"}</TableCell>
                    <TableCell className="text-center">
                      <span className={`font-semibold ${client.applicationsRemaining <= 2 ? "text-red-600" :
                        client.applicationsRemaining <= 5 ? "text-amber-600" : "text-green-600"
                        }`}>
                        {client.applicationsRemaining}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">{client.totalApplications}</TableCell>
                    <TableCell className="text-center">{client.inProgress}</TableCell>
                    <TableCell className="text-center">{client.interviews}</TableCell>
                    <TableCell className="text-center">
                      <span className="font-semibold text-green-600">{client.hired}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-semibold">{client.successRate}%</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={priorityColor}>
                        {client.priority}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}