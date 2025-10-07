import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Users, Target, Calendar, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { EmployeePerformanceAnalytics } from "@/types";
import { DailyEmployeeAnalytics } from "./daily-employee-analytics";

export function EmployeePerformanceAnalytics() {
  const { data: analytics, isLoading, error } = useQuery<EmployeePerformanceAnalytics>({
    queryKey: ["/api/analytics/employee-performance"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/analytics/employee-performance");
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

  // Prepare data for the bar chart
  const chartData = analytics.employees.map(employee => ({
    name: employee.name,
    applications: employee.applicationsSubmitted,
    successRate: employee.successRate,
    earnings: employee.earnings,
  }));

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

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Applications Submitted Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Applications Submitted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
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

        {/* Success Rate Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-green-600" />
              Success Rate (Interviews/Total)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
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
                  formatter={(value: number) => [`${value}%`, "Success Rate"]}
                  labelFormatter={(label) => `Employee: ${label}`}
                />
                <Bar dataKey="successRate" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            Weekly Performance (Last 8 Weeks)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.weeklyPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="week" 
                fontSize={12}
              />
              <YAxis />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  value, 
                  name === "applications" ? "Applications" : "Active Employees"
                ]}
                labelFormatter={(label) => `Week: ${label}`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="applications" 
                stroke="#3b82f6" 
                strokeWidth={3}
                name="Applications"
                dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="employees" 
                stroke="#10b981" 
                strokeWidth={3}
                name="Active Employees"
                dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

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

      {/* Earnings Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            Earnings Generated ($0.20 per application when meeting daily target)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
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
                formatter={(value: number) => [`$${value.toFixed(2)}`, "Earnings"]}
                labelFormatter={(label) => `Employee: ${label}`}
              />
              <Bar dataKey="earnings" fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Performance Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead className="text-center">Applications</TableHead>
                <TableHead className="text-center">Interviews</TableHead>
                <TableHead className="text-center">Success Rate</TableHead>
                <TableHead className="text-center">Earnings</TableHead>
                <TableHead className="text-center">Performance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics.employees.map((employee) => {
                const performanceLevel = employee.successRate >= 20 ? "Excellent" :
                                        employee.successRate >= 15 ? "Good" :
                                        employee.successRate >= 10 ? "Average" : "Needs Improvement";
                
                const performanceColor = employee.successRate >= 20 ? "bg-green-100 text-green-800" :
                                        employee.successRate >= 15 ? "bg-blue-100 text-blue-800" :
                                        employee.successRate >= 10 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";

                return (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell className="text-center">{employee.applicationsSubmitted}</TableCell>
                    <TableCell className="text-center">{employee.interviews}</TableCell>
                    <TableCell className="text-center">
                      <span className="font-semibold">{employee.successRate}%</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-semibold text-emerald-600">
                        ${employee.earnings.toFixed(2)}
                      </span>
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

      {/* Daily Employee Application Analytics */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Daily Application Analytics</h2>
        <DailyEmployeeAnalytics />
      </div>
    </div>
  );
}