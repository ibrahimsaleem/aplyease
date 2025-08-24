import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Users, Target } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { EmployeePerformanceAnalytics } from "@/types";

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
      {/* Total Payout Card */}
      <Card className="bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-600">Total Payout to Employees</p>
              <p className="text-4xl font-bold text-emerald-900" data-testid="text-total-payout">
                ${analytics.totalPayout.toFixed(2)}
              </p>
              <p className="text-sm text-emerald-600 mt-1">
                Based on {analytics.employees.length} active employees
              </p>
            </div>
            <div className="bg-emerald-100 p-4 rounded-lg">
              <DollarSign className="w-8 h-8 text-emerald-600" />
            </div>
          </div>
        </CardContent>
      </Card>

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

      {/* Earnings Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            Earnings Generated ($0.20 per application)
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
    </div>
  );
}