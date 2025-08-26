import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingUp, Users, Target, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { DailyEmployeeAnalytics } from "@/types";

export function DailyEmployeeAnalytics() {
  const { data: analytics, isLoading, error } = useQuery<DailyEmployeeAnalytics>({
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
        <p className="text-red-600">Failed to load daily employee analytics.</p>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  // Prepare data for the today's applications chart
  const todayChartData = analytics.employees.map(employee => ({
    name: employee.name,
    applications: employee.applicationsToday,
  }));

  // Prepare data for the historical comparison chart
  const historicalData = analytics.employees.map(employee => ({
    name: employee.name,
    today: employee.applicationsToday,
    yesterday: employee.applicationsYesterday,
    last3Days: employee.applicationsLast3Days,
    last7Days: employee.applicationsLast7Days,
  }));

  // Prepare data for the trend line chart (last 7 days)
  const trendData = [
    { day: "7 days ago", applications: analytics.totalApplicationsLast7Days - analytics.totalApplicationsLast3Days },
    { day: "3 days ago", applications: analytics.totalApplicationsLast3Days - analytics.totalApplicationsYesterday },
    { day: "Yesterday", applications: analytics.totalApplicationsYesterday },
    { day: "Today", applications: analytics.totalApplicationsToday },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Today's Applications */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Applications Today</p>
                <p className="text-3xl font-bold text-blue-900" data-testid="text-applications-today">
                  {analytics.totalApplicationsToday}
                </p>
                <p className="text-sm text-blue-600 mt-1">
                  Across {analytics.employees.length} employees
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Yesterday's Applications */}
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Yesterday</p>
                <p className="text-3xl font-bold text-green-900" data-testid="text-applications-yesterday">
                  {analytics.totalApplicationsYesterday}
                </p>
                <p className="text-sm text-green-600 mt-1">
                  {analytics.totalApplicationsToday > analytics.totalApplicationsYesterday ? (
                    <span className="text-green-700">↑ {analytics.totalApplicationsToday - analytics.totalApplicationsYesterday} more today</span>
                  ) : analytics.totalApplicationsToday < analytics.totalApplicationsYesterday ? (
                    <span className="text-red-700">↓ {analytics.totalApplicationsYesterday - analytics.totalApplicationsToday} fewer today</span>
                  ) : (
                    <span className="text-gray-700">Same as yesterday</span>
                  )}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Last 3 Days */}
        <Card className="bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Last 3 Days</p>
                <p className="text-3xl font-bold text-purple-900" data-testid="text-applications-3days">
                  {analytics.totalApplicationsLast3Days}
                </p>
                <p className="text-sm text-purple-600 mt-1">
                  Average: {Math.round(analytics.totalApplicationsLast3Days / 3)} per day
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Last 7 Days */}
        <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Last 7 Days</p>
                <p className="text-3xl font-bold text-orange-900" data-testid="text-applications-7days">
                  {analytics.totalApplicationsLast7Days}
                </p>
                <p className="text-sm text-orange-600 mt-1">
                  Average: {Math.round(analytics.totalApplicationsLast7Days / 7)} per day
                </p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Applications Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Applications Submitted Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={todayChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [value, "Applications"]}
                  labelFormatter={(label) => `Employee: ${label}`}
                />
                <Bar dataKey="applications" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Historical Comparison Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Historical Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [value, "Applications"]}
                  labelFormatter={(label) => `Employee: ${label}`}
                />
                <Legend />
                <Bar dataKey="today" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Today" />
                <Bar dataKey="yesterday" fill="#10b981" radius={[4, 4, 0, 0]} name="Yesterday" />
                <Bar dataKey="last3Days" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Last 3 Days" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Trend Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-600" />
            Application Trend (Last 7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => [value, "Applications"]}
                labelFormatter={(label) => `Period: ${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="applications" 
                stroke="#8b5cf6" 
                strokeWidth={3}
                dot={{ fill: "#8b5cf6", strokeWidth: 2, r: 6 }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Employee Performance Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead className="text-center">Today</TableHead>
                <TableHead className="text-center">Yesterday</TableHead>
                <TableHead className="text-center">Last 3 Days</TableHead>
                <TableHead className="text-center">Last 7 Days</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-center">Success Rate</TableHead>
                <TableHead className="text-center">Performance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics.employees.map((employee) => {
                const performanceLevel = employee.applicationsToday >= 5 ? "Excellent" :
                                        employee.applicationsToday >= 3 ? "Good" :
                                        employee.applicationsToday >= 1 ? "Average" : "Needs Improvement";
                
                const performanceColor = employee.applicationsToday >= 5 ? "bg-green-100 text-green-800" :
                                        employee.applicationsToday >= 3 ? "bg-blue-100 text-blue-800" :
                                        employee.applicationsToday >= 1 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";

                return (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell className="text-center">
                      <span className="font-semibold text-blue-600">{employee.applicationsToday}</span>
                    </TableCell>
                    <TableCell className="text-center">{employee.applicationsYesterday}</TableCell>
                    <TableCell className="text-center">{employee.applicationsLast3Days}</TableCell>
                    <TableCell className="text-center">{employee.applicationsLast7Days}</TableCell>
                    <TableCell className="text-center">{employee.totalApplications}</TableCell>
                    <TableCell className="text-center">
                      <span className="font-semibold">{employee.successRate}%</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={performanceColor}>
                        {performanceLevel}
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
