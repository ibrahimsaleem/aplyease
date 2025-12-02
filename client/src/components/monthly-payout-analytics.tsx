import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Users, Target, TrendingUp, Calendar } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Conversion rate: 1 USD = 87 INR
const USD_TO_INR = 87;

interface MonthlyPayoutData {
  employeeId: string;
  employeeName: string;
  applicationsThisMonth: number;
  totalPayout: number;
  baseRate: number;
  belowTargetRate: number;
  dailyTarget: number;
  isAboveTarget: boolean;
}

export function MonthlyPayoutAnalytics() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState((currentDate.getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString());

  const { data: payoutData, isLoading, error } = useQuery({
    queryKey: ["/api/analytics/monthly-payout", selectedMonth, selectedYear],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/analytics/monthly-payout?month=${selectedMonth}&year=${selectedYear}`);
      return res.json();
    },
  });

  // Generate month options
  const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  // Generate year options (current year and previous 2 years)
  const years = [];
  for (let i = 0; i < 3; i++) {
    years.push({
      value: (currentDate.getFullYear() - i).toString(),
      label: (currentDate.getFullYear() - i).toString(),
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Loading...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Failed to load monthly payout data
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!payoutData || payoutData.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            No employee data available for this month
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter to only active employees (with applications)
  const activeEmployees = payoutData.filter((emp: any) => emp.applicationsThisMonth > 0);
  
  const totalApplications = activeEmployees.reduce((sum: number, emp: any) => sum + emp.applicationsThisMonth, 0);
  const totalPayout = activeEmployees.reduce((sum: number, emp: any) => sum + emp.totalPayout, 0);
  const employeesAboveTarget = activeEmployees.filter((emp: any) => emp.isAboveTarget).length;
  const averageApplications = activeEmployees.length > 0 ? totalApplications / activeEmployees.length : 0;

  return (
    <div className="space-y-6">
      {/* Payment Calculation Info */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <DollarSign className="h-5 w-5" />
            Payment Calculation Method
          </CardTitle>
        </CardHeader>
        <CardContent className="text-green-900">
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="text-center p-3 bg-white rounded-lg border">
              <div className="text-lg font-bold text-green-600">$0.20</div>
              <div className="font-semibold">High Rate</div>
              <div className="text-xs">When employee submits ≥15 applications in a day</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border">
              <div className="text-lg font-bold text-orange-600">$0.15</div>
              <div className="font-semibold">Standard Rate</div>
              <div className="text-xs">When employee submits &lt;15 applications in a day</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border">
              <div className="text-lg font-bold text-blue-600">Daily</div>
              <div className="font-semibold">Calculation</div>
              <div className="text-xs">Each day calculated separately, then summed for monthly total</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Month/Year Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Select Month & Year
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium">Month</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium">Year</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year.value} value={year.value}>
                      {year.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalApplications.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {selectedMonth}/{selectedYear} across all employees
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payout</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPayout.toFixed(2)}</div>
            <div className="text-sm font-semibold text-emerald-600 mt-1">
              ₹{(totalPayout * USD_TO_INR).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total amount to be paid
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Above Target</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employeesAboveTarget}</div>
            <p className="text-xs text-muted-foreground">
              Employees meeting monthly target
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Applications</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageApplications.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              Per employee for {selectedMonth}/{selectedYear}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Employee Payout Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Employee Monthly Payouts - {selectedMonth}/{selectedYear}</span>
            <span className="text-sm font-normal text-muted-foreground">
              Showing {activeEmployees.length} active employee{activeEmployees.length !== 1 ? 's' : ''}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {activeEmployees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Active Employees</h3>
                <p>No employees have submitted applications for {selectedMonth}/{selectedYear}</p>
              </div>
            ) : (
              activeEmployees
                .sort((a: any, b: any) => b.applicationsThisMonth - a.applicationsThisMonth) // Sort by applications count
                .map((employee: any) => {
                const monthlyTarget = employee.dailyTarget * 30; // Approximate monthly target
                const targetPercentage = (employee.applicationsThisMonth / monthlyTarget) * 100;
                
                return (
                  <div
                    key={employee.employeeId}
                    className={`p-6 border rounded-lg ${
                      employee.isAboveTarget ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'
                    }`}
                  >
                    {/* Employee Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold">{employee.employeeName}</h3>
                        <Badge variant={employee.isAboveTarget ? "default" : "secondary"} className="text-sm">
                          {employee.isAboveTarget ? "Target Met" : "Below Target"}
                        </Badge>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-3xl font-bold text-green-600">
                          ${employee.totalPayout.toFixed(2)}
                        </div>
                        <div className="text-lg font-semibold text-emerald-700">
                          ₹{(employee.totalPayout * USD_TO_INR).toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Monthly Payout
                        </div>
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center p-3 bg-white rounded-lg border">
                        <div className="text-2xl font-bold text-blue-600">
                          {employee.applicationsThisMonth}
                        </div>
                        <div className="text-sm text-muted-foreground">Applications</div>
                      </div>
                      
                      <div className="text-center p-3 bg-white rounded-lg border">
                        <div className="text-2xl font-bold text-purple-600">
                          {Math.round(employee.applicationsThisMonth / 30)}
                        </div>
                        <div className="text-sm text-muted-foreground">Daily Average</div>
                      </div>
                      
                      <div className="text-center p-3 bg-white rounded-lg border">
                        <div className={`text-2xl font-bold ${targetPercentage >= 100 ? 'text-green-600' : 'text-orange-600'}`}>
                          {targetPercentage.toFixed(0)}%
                        </div>
                        <div className="text-sm text-muted-foreground">Target Achievement</div>
                      </div>
                      
                      <div className="text-center p-3 bg-white rounded-lg border">
                        <div className="text-2xl font-bold text-gray-600">
                          ${employee.isAboveTarget ? employee.baseRate : employee.belowTargetRate}
                        </div>
                        <div className="text-sm text-muted-foreground">Rate/Application</div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-muted-foreground mb-1">
                        <span>Progress towards monthly target ({monthlyTarget} applications)</span>
                        <span>{employee.applicationsThisMonth} / {monthlyTarget}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full transition-all duration-300 ${
                            targetPercentage >= 100 ? 'bg-green-500' : 'bg-orange-500'
                          }`}
                          style={{ width: `${Math.min(targetPercentage, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div className="text-center p-2 bg-white rounded border">
                        <div className="font-semibold">Target: {employee.dailyTarget}/day</div>
                      </div>
                      <div className="text-center p-2 bg-white rounded border">
                        <div className="font-semibold">
                          {employee.applicationsThisMonth > monthlyTarget ? 
                            `+${employee.applicationsThisMonth - monthlyTarget} Extra` : 
                            `${monthlyTarget - employee.applicationsThisMonth} Behind`
                          }
                        </div>
                      </div>
                      <div className="text-center p-2 bg-white rounded border">
                        <div className="font-semibold">
                          Rate: ${employee.isAboveTarget ? employee.baseRate : employee.belowTargetRate}
                        </div>
                      </div>
                      <div className="text-center p-2 bg-white rounded border">
                        <div className="font-semibold text-green-600">
                          ${employee.totalPayout.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Rate Information */}
      <Card>
        <CardHeader>
          <CardTitle>Payout Rates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                ${payoutData[0]?.baseRate || 0}
              </div>
              <div className="text-sm text-muted-foreground">Above Target Rate</div>
              <div className="text-xs text-muted-foreground mt-1">
                When monthly target is met
              </div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                ${payoutData[0]?.belowTargetRate || 0}
              </div>
              <div className="text-sm text-muted-foreground">Below Target Rate</div>
              <div className="text-xs text-muted-foreground mt-1">
                When monthly target is not met
              </div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {payoutData[0]?.dailyTarget || 0}
              </div>
              <div className="text-sm text-muted-foreground">Daily Target</div>
              <div className="text-xs text-muted-foreground mt-1">
                Applications per day
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
