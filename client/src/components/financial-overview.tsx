import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from "recharts";
import {
  DollarSign, TrendingUp, TrendingDown, Wallet,
  CreditCard, PiggyBank, Users, FileText, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// USD to INR conversion
const USD_TO_INR = 87;

// Color palette for charts
const COLORS = {
  applications: "#3b82f6",
  expenses: "#f59e0b",
  revenue: "#10b981",
  profit: "#8b5cf6",
};

// Helper to format currency from cents
const formatUSD = (cents: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
};

const formatINR = (cents: number) => {
  const inr = (cents / 100) * USD_TO_INR;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(inr);
};

interface FinancialOverviewData {
  totalApplications: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  totalDue: number;
  ratePerApplication: number;
  employeePayouts: Array<{
    id: string;
    name: string;
    email: string;
    applicationsSubmitted: number;
    totalPayout: number;
  }>;
  monthlyData: Array<{
    month: string;
    applications: number;
    expenses: number;
    revenue: number;
  }>;
  clientPayments: Array<{
    id: string;
    name: string;
    company: string | null;
    amountPaid: number;
    amountDue: number;
    applicationsUsed: number;
  }>;
}

export function FinancialOverview() {
  // Fetch comprehensive financial data
  const { data: financialData, isLoading, error } = useQuery<FinancialOverviewData>({
    queryKey: ["/api/analytics/financial-overview"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/analytics/financial-overview");
      return res.json();
    },
  });

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!financialData?.monthlyData) return [];
    return financialData.monthlyData.map(item => ({
      month: item.month,
      applications: item.applications,
      expenses: Math.round(item.expenses / 100), // Convert to dollars for display
    }));
  }, [financialData]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-slate-200 rounded w-24"></div>
                  <div className="h-8 bg-slate-200 rounded w-32"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !financialData) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <p className="text-red-600">Failed to load financial data. Please try again.</p>
        </CardContent>
      </Card>
    );
  }

  const rateInCents = financialData.ratePerApplication * 100;

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards - 6 columns */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* Total Applications */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Total Applications</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">
                  {financialData.totalApplications.toLocaleString()}
                </p>
              </div>
              <div className="bg-blue-100 p-2 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-blue-600 mt-2">
              @ ${financialData.ratePerApplication.toFixed(2)}/app
            </p>
          </CardContent>
        </Card>

        {/* Total Revenue (Sales) */}
        <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Total Sales</p>
                <p className="text-2xl font-bold text-emerald-900 mt-1">
                  {formatUSD(financialData.totalRevenue)}
                </p>
                <p className="text-xs font-semibold text-emerald-700 mt-0.5">
                  {formatINR(financialData.totalRevenue)}
                </p>
              </div>
              <div className="bg-emerald-100 p-2 rounded-lg">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <div className="flex items-center text-xs text-emerald-600 mt-2">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              <span>Client payments received</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Expenses (Employee Payouts) */}
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">Total Expenses</p>
                <p className="text-2xl font-bold text-amber-900 mt-1">
                  {formatUSD(financialData.totalExpenses)}
                </p>
                <p className="text-xs font-semibold text-amber-700 mt-0.5">
                  {formatINR(financialData.totalExpenses)}
                </p>
              </div>
              <div className="bg-amber-100 p-2 rounded-lg">
                <CreditCard className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <div className="flex items-center text-xs text-amber-600 mt-2">
              <ArrowDownRight className="w-3 h-3 mr-1" />
              <span>Paid to employees</span>
            </div>
          </CardContent>
        </Card>

        {/* Net Profit */}
        <Card className={`bg-gradient-to-br ${financialData.netProfit >= 0 ? 'from-purple-50 to-violet-50 border-purple-200' : 'from-red-50 to-rose-50 border-red-200'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-medium uppercase tracking-wide ${financialData.netProfit >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                  Net Profit
                </p>
                <p className={`text-2xl font-bold mt-1 ${financialData.netProfit >= 0 ? 'text-purple-900' : 'text-red-900'}`}>
                  {formatUSD(financialData.netProfit)}
                </p>
                <p className={`text-xs font-semibold mt-0.5 ${financialData.netProfit >= 0 ? 'text-purple-700' : 'text-red-700'}`}>
                  {formatINR(financialData.netProfit)}
                </p>
              </div>
              <div className={`p-2 rounded-lg ${financialData.netProfit >= 0 ? 'bg-purple-100' : 'bg-red-100'}`}>
                {financialData.netProfit >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-600" />
                )}
              </div>
            </div>
            <div className={`flex items-center text-xs mt-2 ${financialData.netProfit >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
              <PiggyBank className="w-3 h-3 mr-1" />
              <span>{financialData.profitMargin.toFixed(1)}% margin</span>
            </div>
          </CardContent>
        </Card>

        {/* Pending Dues */}
        <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-red-600 uppercase tracking-wide">Pending Dues</p>
                <p className="text-2xl font-bold text-red-900 mt-1">
                  {formatUSD(financialData.totalDue)}
                </p>
                <p className="text-xs font-semibold text-red-700 mt-0.5">
                  {formatINR(financialData.totalDue)}
                </p>
              </div>
              <div className="bg-red-100 p-2 rounded-lg">
                <Wallet className="w-5 h-5 text-red-600" />
              </div>
            </div>
            <div className="flex items-center text-xs text-red-600 mt-2">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              <span>Outstanding from clients</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Employees */}
        <Card className="bg-gradient-to-br from-slate-50 to-gray-50 border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Active Employees</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {financialData.employeePayouts.length}
                </p>
              </div>
              <div className="bg-slate-100 p-2 rounded-lg">
                <Users className="w-5 h-5 text-slate-600" />
              </div>
            </div>
            <div className="flex items-center text-xs text-slate-600 mt-2">
              <span>Contributing to payroll</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Applications & Expenses Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart className="w-5 h-5 text-blue-500" />
            Monthly Applications & Expenses (Last 12 Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === 'expenses') return [`$${value}`, 'Employee Payouts'];
                  return [value, 'Applications'];
                }}
                contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="applications" name="Applications" fill={COLORS.applications} radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="expenses" name="Expenses ($)" fill={COLORS.expenses} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Employee Payouts Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-500" />
            Employee Payouts Breakdown
            <Badge variant="outline" className="ml-2 text-xs">
              ${financialData.ratePerApplication.toFixed(2)} per application
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold">Employee</TableHead>
                  <TableHead className="font-semibold text-center">Applications</TableHead>
                  <TableHead className="font-semibold text-right">Payout (USD)</TableHead>
                  <TableHead className="font-semibold text-right">Payout (INR)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {financialData.employeePayouts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-slate-400 py-8">
                      No employee data available
                    </TableCell>
                  </TableRow>
                ) : (
                  financialData.employeePayouts.map((employee, index) => (
                    <TableRow key={employee.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-900">{employee.name}</p>
                          <p className="text-xs text-slate-500">{employee.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="font-mono">
                          {employee.applicationsSubmitted.toLocaleString()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-amber-700">
                        {formatUSD(employee.totalPayout)}
                      </TableCell>
                      <TableCell className="text-right text-slate-600">
                        {formatINR(employee.totalPayout)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {financialData.employeePayouts.length > 0 && (
            <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-amber-800">Total Employee Payouts</span>
                <div className="text-right">
                  <p className="text-lg font-bold text-amber-900">{formatUSD(financialData.totalExpenses)}</p>
                  <p className="text-sm text-amber-700">{formatINR(financialData.totalExpenses)}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client Payments Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-500" />
            Client Payments Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold">Client</TableHead>
                  <TableHead className="font-semibold text-center">Apps Used</TableHead>
                  <TableHead className="font-semibold text-right">Paid</TableHead>
                  <TableHead className="font-semibold text-right">Due</TableHead>
                  <TableHead className="font-semibold text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {financialData.clientPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-400 py-8">
                      No client data available
                    </TableCell>
                  </TableRow>
                ) : (
                  financialData.clientPayments.map((client, index) => (
                    <TableRow key={client.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-900">{client.name}</p>
                          {client.company && (
                            <p className="text-xs text-slate-500">{client.company}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="font-mono">
                          {client.applicationsUsed.toLocaleString()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-emerald-700">
                        {formatUSD(client.amountPaid)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-red-600">
                        {formatUSD(client.amountDue)}
                      </TableCell>
                      <TableCell className="text-right">
                        {client.amountDue > 0 ? (
                          <Badge variant="destructive" className="text-xs">Outstanding</Badge>
                        ) : client.amountPaid > 0 ? (
                          <Badge variant="default" className="bg-emerald-500 text-xs">Paid</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">No Payment</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {financialData.clientPayments.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-emerald-800">Total Received</span>
                  <div className="text-right">
                    <p className="text-lg font-bold text-emerald-900">{formatUSD(financialData.totalRevenue)}</p>
                    <p className="text-sm text-emerald-700">{formatINR(financialData.totalRevenue)}</p>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-red-800">Total Outstanding</span>
                  <div className="text-right">
                    <p className="text-lg font-bold text-red-900">{formatUSD(financialData.totalDue)}</p>
                    <p className="text-sm text-red-700">{formatINR(financialData.totalDue)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-slate-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Avg Apps/Employee
                </p>
                <p className="text-xl font-bold text-slate-800 mt-1">
                  {financialData.employeePayouts.length > 0
                    ? Math.round(financialData.totalApplications / financialData.employeePayouts.length).toLocaleString()
                    : '0'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Avg Payout/Employee
                </p>
                <p className="text-xl font-bold text-slate-800 mt-1">
                  {financialData.employeePayouts.length > 0
                    ? formatUSD(financialData.totalExpenses / financialData.employeePayouts.length)
                    : '$0'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Collection Rate
                </p>
                <p className="text-xl font-bold text-slate-800 mt-1">
                  {(financialData.totalRevenue + financialData.totalDue) > 0
                    ? `${((financialData.totalRevenue / (financialData.totalRevenue + financialData.totalDue)) * 100).toFixed(0)}%`
                    : '0%'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Cost per App Value
                </p>
                <p className="text-xl font-bold text-slate-800 mt-1">
                  ${financialData.ratePerApplication.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
