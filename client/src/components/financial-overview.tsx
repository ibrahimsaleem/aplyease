import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from "recharts";
import {
  DollarSign, TrendingUp, TrendingDown, Wallet,
  CreditCard, PiggyBank, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { ClientPerformanceAnalytics, EmployeePerformanceAnalytics } from "@/types";

// USD to INR conversion
const USD_TO_INR = 87;

// Color palette for charts
const COLORS = {
  revenue: "#10b981",
  expenses: "#f59e0b",
  profit: "#3b82f6",
  due: "#ef4444",
  chart: ["#10b981", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899"]
};

// Helper to format currency
const formatUSD = (cents: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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

interface MonthlyPayoutData {
  employeeId: string;
  employeeName: string;
  applicationsThisMonth: number;
  totalPayout: number;
}

export function FinancialOverview() {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString());

  // Fetch client performance data
  const { data: clientData, isLoading: clientLoading } = useQuery<ClientPerformanceAnalytics>({
    queryKey: ["/api/analytics/client-performance"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/analytics/client-performance");
      return res.json();
    },
  });

  // Fetch employee performance data
  const { data: employeeData, isLoading: employeeLoading } = useQuery<EmployeePerformanceAnalytics>({
    queryKey: ["/api/analytics/employee-performance"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/analytics/employee-performance");
      return res.json();
    },
  });

  // Fetch monthly payout data for all months of selected year
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const { data: monthlyPayouts } = useQuery({
    queryKey: ["/api/analytics/monthly-payouts-all", selectedYear],
    queryFn: async () => {
      const results = await Promise.all(
        months.map(month =>
          apiRequest("GET", `/api/analytics/monthly-payout?month=${month}&year=${selectedYear}`)
            .then(res => res.json())
            .catch(() => [])
        )
      );
      return results;
    },
  });

  // Generate year options
  const years = Array.from({ length: 3 }, (_, i) => ({
    value: (currentDate.getFullYear() - i).toString(),
    label: (currentDate.getFullYear() - i).toString(),
  }));

  // Calculate financial metrics
  const financialMetrics = useMemo(() => {
    if (!clientData) {
      return {
        totalRevenue: 0,
        totalDue: 0,
        totalExpenses: 0,
        netProfit: 0,
        profitMargin: 0,
      };
    }

    const totalRevenue = clientData.clients.reduce((sum, c) => sum + (c.amountPaid || 0), 0);
    const totalDue = clientData.clients.reduce((sum, c) => sum + (c.amountDue || 0), 0);
    const totalExpenses = employeeData?.totalPayout
      ? employeeData.totalPayout * 100 // Convert to cents
      : 0;
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return { totalRevenue, totalDue, totalExpenses, netProfit, profitMargin };
  }, [clientData, employeeData]);

  // Prepare monthly trend data
  const monthlyTrendData = useMemo(() => {
    if (!monthlyPayouts) return [];

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    return monthNames.map((name, i) => {
      const payoutData = monthlyPayouts[i] || [];
      const expenses = Array.isArray(payoutData)
        ? payoutData.reduce((sum: number, emp: MonthlyPayoutData) => sum + (emp.totalPayout || 0), 0) * 100
        : 0;

      // Estimate monthly revenue (simplified - assume even distribution)
      const avgMonthlyRevenue = financialMetrics.totalRevenue / 12;

      return {
        month: name,
        revenue: Math.round(avgMonthlyRevenue / 100),
        expenses: Math.round(expenses / 100),
        profit: Math.round((avgMonthlyRevenue - expenses) / 100),
      };
    });
  }, [monthlyPayouts, financialMetrics.totalRevenue]);

  // Revenue distribution by client (top 5)
  const revenueByClient = useMemo(() => {
    if (!clientData) return [];

    return clientData.clients
      .filter(c => (c.amountPaid || 0) > 0)
      .sort((a, b) => (b.amountPaid || 0) - (a.amountPaid || 0))
      .slice(0, 5)
      .map(c => ({
        name: c.name.split(' ')[0],
        value: (c.amountPaid || 0) / 100,
      }));
  }, [clientData]);

  // Employee expense distribution (top 5)
  const expensesByEmployee = useMemo(() => {
    if (!employeeData) return [];

    return employeeData.employees
      .filter(e => (e.earnings || 0) > 0)
      .sort((a, b) => (b.earnings || 0) - (a.earnings || 0))
      .slice(0, 5)
      .map(e => ({
        name: e.name.split(' ')[0],
        value: e.earnings || 0,
      }));
  }, [employeeData]);

  const isLoading = clientLoading || employeeLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
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

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-600">Total Revenue</p>
                <p className="text-2xl font-bold text-emerald-900">
                  {formatUSD(financialMetrics.totalRevenue)}
                </p>
                <p className="text-sm font-semibold text-emerald-700 mt-1">
                  {formatINR(financialMetrics.totalRevenue)}
                </p>
              </div>
              <div className="bg-emerald-100 p-3 rounded-lg">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
            <div className="mt-3 flex items-center text-xs text-emerald-600">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              <span>Client payments received</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Expenses */}
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600">Total Expenses</p>
                <p className="text-2xl font-bold text-amber-900">
                  {formatUSD(financialMetrics.totalExpenses)}
                </p>
                <p className="text-sm font-semibold text-amber-700 mt-1">
                  {formatINR(financialMetrics.totalExpenses)}
                </p>
              </div>
              <div className="bg-amber-100 p-3 rounded-lg">
                <CreditCard className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            <div className="mt-3 flex items-center text-xs text-amber-600">
              <ArrowDownRight className="w-3 h-3 mr-1" />
              <span>Employee payouts</span>
            </div>
          </CardContent>
        </Card>

        {/* Net Profit */}
        <Card className={`bg-gradient-to-br ${financialMetrics.netProfit >= 0 ? 'from-blue-50 to-indigo-50 border-blue-200' : 'from-red-50 to-rose-50 border-red-200'}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${financialMetrics.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  Net Profit
                </p>
                <p className={`text-2xl font-bold ${financialMetrics.netProfit >= 0 ? 'text-blue-900' : 'text-red-900'}`}>
                  {formatUSD(financialMetrics.netProfit)}
                </p>
                <p className={`text-sm font-semibold mt-1 ${financialMetrics.netProfit >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                  {formatINR(financialMetrics.netProfit)}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${financialMetrics.netProfit >= 0 ? 'bg-blue-100' : 'bg-red-100'}`}>
                {financialMetrics.netProfit >= 0 ? (
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-red-600" />
                )}
              </div>
            </div>
            <div className={`mt-3 flex items-center text-xs ${financialMetrics.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              <PiggyBank className="w-3 h-3 mr-1" />
              <span>{financialMetrics.profitMargin.toFixed(1)}% margin</span>
            </div>
          </CardContent>
        </Card>

        {/* Amount Due */}
        <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Pending Dues</p>
                <p className="text-2xl font-bold text-red-900">
                  {formatUSD(financialMetrics.totalDue)}
                </p>
                <p className="text-sm font-semibold text-red-700 mt-1">
                  {formatINR(financialMetrics.totalDue)}
                </p>
              </div>
              <div className="bg-red-100 p-3 rounded-lg">
                <Wallet className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <div className="mt-3 flex items-center text-xs text-red-600">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              <span>Outstanding from clients</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Year Selector */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Monthly Trends</CardTitle>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map(year => (
                  <SelectItem key={year.value} value={year.value}>
                    {year.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                formatter={(value: number) => [`$${value}`, '']}
                contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="revenue" name="Revenue" fill={COLORS.revenue} radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill={COLORS.expenses} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Distribution Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Revenue by Client */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              Top Clients by Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            {revenueByClient.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={revenueByClient}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {revenueByClient.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS.chart[index % COLORS.chart.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`$${value}`, 'Revenue']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-slate-400">
                No revenue data
              </div>
            )}
            <div className="flex flex-wrap gap-3 justify-center mt-2">
              {revenueByClient.map((item, i) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS.chart[i % COLORS.chart.length] }}
                  />
                  <span className="text-slate-600">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Expenses by Employee */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-amber-500" />
              Top Employees by Payout
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expensesByEmployee.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={expensesByEmployee}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {expensesByEmployee.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS.chart[index % COLORS.chart.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`$${value}`, 'Payout']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-slate-400">
                No expense data
              </div>
            )}
            <div className="flex flex-wrap gap-3 justify-center mt-2">
              {expensesByEmployee.map((item, i) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS.chart[i % COLORS.chart.length] }}
                  />
                  <span className="text-slate-600">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profit Trend Line */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Profit Trend - {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                formatter={(value: number) => [`$${value}`, 'Profit']}
                contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Line
                type="monotone"
                dataKey="profit"
                stroke={COLORS.profit}
                strokeWidth={2}
                dot={{ fill: COLORS.profit, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Quick Stats Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-slate-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Avg Revenue/Client
                </p>
                <p className="text-xl font-bold text-slate-800 mt-1">
                  {clientData && clientData.clients.length > 0
                    ? formatUSD(financialMetrics.totalRevenue / clientData.clients.length)
                    : '$0'}
                </p>
              </div>
              <div className="text-3xl text-slate-300">📊</div>
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
                  {employeeData && employeeData.employees.length > 0
                    ? `$${(financialMetrics.totalExpenses / 100 / employeeData.employees.length).toFixed(0)}`
                    : '$0'}
                </p>
              </div>
              <div className="text-3xl text-slate-300">💼</div>
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
                  {(financialMetrics.totalRevenue + financialMetrics.totalDue) > 0
                    ? `${((financialMetrics.totalRevenue / (financialMetrics.totalRevenue + financialMetrics.totalDue)) * 100).toFixed(0)}%`
                    : '0%'}
                </p>
              </div>
              <div className="text-3xl text-slate-300">📈</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
