import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, Legend
} from "recharts";
import {
  DollarSign, TrendingUp, TrendingDown, Wallet,
  CreditCard, PiggyBank, ArrowUpRight, ArrowDownRight,
  Calendar, Receipt, BarChart3
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { ClientPerformanceAnalytics, EmployeePerformanceAnalytics, MonthlyPaymentStats, PaymentTransaction } from "@/types";

// USD to INR conversion
const USD_TO_INR = 87;

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

  // Fetch monthly payment stats
  const { data: monthlyPayments } = useQuery<MonthlyPaymentStats[]>({
    queryKey: ["/api/payments/monthly-stats", selectedYear],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/payments/monthly-stats?year=${selectedYear}`);
      return res.json();
    },
  });

  // Fetch recent payment transactions
  const { data: recentTransactions } = useQuery<PaymentTransaction[]>({
    queryKey: ["/api/payments"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/payments");
      return res.json();
    },
  });

  // Generate year options
  const years = Array.from({ length: 3 }, (_, i) => ({
    value: (currentDate.getFullYear() - i).toString(),
    label: (currentDate.getFullYear() - i).toString(),
  }));

  // Calculate financial metrics
  const financialMetrics = useMemo(() => {
    if (!clientData || !clientData.clients) {
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

  // Prepare monthly income chart data
  const monthlyIncomeData = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    if (!monthlyPayments) {
      return monthNames.map(name => ({ month: name, income: 0 }));
    }

    return monthNames.map((name, i) => {
      const monthData = monthlyPayments.find(m => m.month === i + 1);
      return {
        month: name,
        income: monthData ? Math.round(monthData.totalAmount / 100) : 0,
      };
    });
  }, [monthlyPayments]);

  // Prepare revenue vs expenses comparison data
  const revenueVsExpensesData = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    if (!monthlyPayments) {
      return monthNames.map(name => ({ month: name, revenue: 0, expenses: 0 }));
    }

    return monthNames.map((name, i) => {
      const monthData = monthlyPayments.find(m => m.month === i + 1);
      return {
        month: name,
        revenue: monthData ? Math.round(monthData.totalAmount / 100) : 0,
        expenses: 0, // Will show only revenue for now - expenses tracking per month not yet implemented
      };
    });
  }, [monthlyPayments]);

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

  // Show all transactions
  const displayTransactions = recentTransactions || [];

  // Get client names for transactions
  const clientsMap = useMemo(() => {
    if (!clientData || !clientData.clients) return new Map();
    return new Map(clientData.clients.map(c => [c.id, c.name]));
  }, [clientData]);

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

        {/* Total Expenses (Salary Paid) */}
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600">Salary Paid</p>
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

      {/* Revenue vs Expenses Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Monthly Revenue - {selectedYear}
          </CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            Revenue received each month (Expenses shown as total salary paid to date)
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenueVsExpensesData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                formatter={(value: number) => [`$${value}`, '']}
                contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                name="Revenue" 
                stroke="#10b981" 
                fill="url(#colorRevenue)" 
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="w-5 h-5 text-purple-600" />
            All Transactions
          </CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            Complete payment history
          </p>
        </CardHeader>
        <CardContent>
          {displayTransactions.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Receipt className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No transactions recorded yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">
                        {new Date(transaction.paymentDate).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </TableCell>
                      <TableCell>{clientsMap.get(transaction.clientId) || 'Unknown'}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-700">
                        {formatUSD(transaction.amount)}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {transaction.notes || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Income Chart */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-500" />
              Monthly Income Breakdown - {selectedYear}
            </CardTitle>
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
          <p className="text-sm text-slate-500 mt-1">
            Payments received each month (based on recorded transactions)
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyIncomeData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                formatter={(value: number) => [`$${value}`, 'Income']}
                contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
