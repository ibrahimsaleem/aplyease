import { useQuery } from "@tanstack/react-query";
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, BarChart, Bar } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Calendar, Clock, BarChart3, Users } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { EmployeePerformanceAnalytics, DailyEmployeeAnalytics } from "@/types";

// Conversion rate: 1 USD = 87 INR
const USD_TO_INR = 87;

export function EmployeePerformanceAnalytics() {
  const { data: analytics, isLoading, error } = useQuery<EmployeePerformanceAnalytics>({
    queryKey: ["/api/analytics/employee-performance"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/analytics/employee-performance");
      return res.json();
    },
  });

  const { data: dailyAnalytics } = useQuery<DailyEmployeeAnalytics>({
    queryKey: ["/api/analytics/daily-employee-applications"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/analytics/daily-employee-applications");
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
        <p className="text-red-600">Failed to load employee performance analytics.</p>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Payout Card */}
        <Card className="bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-600">Total Payout</p>
                <p className="text-3xl font-bold text-emerald-900" data-testid="text-total-payout">
                  ${analytics.totalPayout.toFixed(2)}
                </p>
                <p className="text-lg font-semibold text-emerald-700 mt-1">
                  ₹{(analytics.totalPayout * USD_TO_INR).toFixed(2)}
                </p>
                <p className="text-sm text-emerald-600 mt-1">
                  {analytics.employees.length} active employees
                </p>
              </div>
              <div className="bg-emerald-100 p-3 rounded-lg">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* This Week Applications */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">This Week</p>
                <p className="text-3xl font-bold text-blue-900" data-testid="text-this-week">
                  {(() => {
                    // Calculate this week's total from daily performance (last 7 days)
                    const last7Days = analytics.dailyPerformance.slice(-7);
                    return last7Days.reduce((sum, day) => sum + day.applications, 0);
                  })()}
                </p>
                <p className="text-sm text-blue-600 mt-1">
                  applications submitted
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today's Applications */}
        <Card className="bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Today</p>
                <p className="text-3xl font-bold text-purple-900" data-testid="text-today">
                  {analytics.dailyPerformance[analytics.dailyPerformance.length - 1]?.applications || 0}
                </p>
                <p className="text-sm text-purple-600 mt-1">
                  applications submitted
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average Daily Applications */}
        <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Daily Average</p>
                <p className="text-3xl font-bold text-orange-900" data-testid="text-daily-avg">
                  {Math.round(analytics.dailyPerformance.reduce((sum, day) => sum + day.applications, 0) / analytics.dailyPerformance.length)}
                </p>
                <p className="text-sm text-orange-600 mt-1">
                  applications per day
                </p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workload Distribution Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Workload Distribution (Clients per Employee)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.employees}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis allowDecimals={false} />
              <Tooltip
                cursor={{ fill: 'transparent' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number, name: string, props: any) => {
                  if (name === "Active Clients") {
                    return [value, "Active Clients"];
                  }
                  return [value, name];
                }}
                labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
              />
              <Legend />
              <Bar
                dataKey="activeClientsCount"
                name="Active Clients"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="effectiveWorkload"
                name="Effective Application Load"
                fill="#f59e0b"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 text-sm text-slate-500 text-center">
            Hover over bars to see detailed workload metrics.
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Chart (Last 3 vs 7 Days) */}
      {dailyAnalytics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              Recent Activity (Last 3 vs 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyAnalytics.employees}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
                <Bar
                  dataKey="applicationsLast3Days"
                  name="Last 3 Days"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="applicationsLast7Days"
                  name="Last 7 Days"
                  fill="#a855f7"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Daily Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-600" />
            Daily Performance (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.dailyPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                fontSize={10}
                angle={-45}
                textAnchor="end"
                height={80}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
              />
              <YAxis />
              <Tooltip
                formatter={(value: number, name: string) => [
                  value,
                  name === "applications" ? "Applications" : "Active Employees"
                ]}
                labelFormatter={(label) => {
                  const date = new Date(label);
                  return date.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  });
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="applications"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Applications"
                dot={{ fill: "#3b82f6", strokeWidth: 1, r: 2 }}
              />
              <Line
                type="monotone"
                dataKey="employees"
                stroke="#10b981"
                strokeWidth={2}
                name="Active Employees"
                dot={{ fill: "#10b981", strokeWidth: 1, r: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Employee Performance Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Performance Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead className="text-center">Apps (Today)</TableHead>
                <TableHead className="text-center">Apps (Month)</TableHead>
                <TableHead className="text-center">Interviews (Month)</TableHead>
                <TableHead className="text-center">Earnings (Month)</TableHead>
                <TableHead className="text-center">Performance</TableHead>
                <TableHead>Assigned Clients</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics.employees.map((employee) => {
                const performanceColor = employee.applicationsSubmitted >= 100 ? "bg-green-100 text-green-800" :
                  employee.applicationsSubmitted >= 50 ? "bg-blue-100 text-blue-800" :
                    "bg-amber-100 text-amber-800";

                const performanceLabel = employee.applicationsSubmitted >= 100 ? "Excellent" :
                  employee.applicationsSubmitted >= 50 ? "Good" : "Needs Improvement";

                return (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell className="text-center font-semibold text-slate-700">
                      {employee.applicationsToday}
                    </TableCell>
                    <TableCell className="text-center font-semibold text-slate-700">
                      {employee.applicationsThisMonth}
                    </TableCell>
                    <TableCell className="text-center">
                      {employee.interviewsThisMonth}
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      ${employee.earningsThisMonth.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={performanceColor}>
                        {performanceLabel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {employee.assignedClients.map((client, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {client}
                          </Badge>
                        ))}
                        {employee.assignedClients.length === 0 && (
                          <span className="text-slate-400 text-xs italic">None</span>
                        )}
                      </div>
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