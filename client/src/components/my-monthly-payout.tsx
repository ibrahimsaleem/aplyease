import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, DollarSign, Target, TrendingUp, TrendingDown, CheckCircle, XCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

// Conversion rate: 1 USD = 87 INR
const USD_TO_INR = 87;

interface DailyPayoutData {
  employeeName: string;
  monthYear: string;
  dailyBreakdown: Array<{
    date: string;
    dayOfWeek: string;
    applicationsCount: number;
    metTarget: boolean;
    dailyTarget: number;
    rateApplied: number;
    dailyPayout: number;
  }>;
  monthlyTotal: {
    totalApplications: number;
    totalPayout: number;
    daysMetTarget: number;
    totalWorkingDays: number;
  };
  rates: {
    baseRate: number;
    belowTargetRate: number;
    dailyTarget: number;
  };
}

export function MyMonthlyPayout() {
  const { user } = useAuth();
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState((currentDate.getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString());

  const { data: payoutData, isLoading, error } = useQuery({
    queryKey: [`/api/analytics/employee-daily-payout/${user?.id}`, selectedMonth, selectedYear],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/analytics/employee-daily-payout/${user?.id}?month=${selectedMonth}&year=${selectedYear}`);
      return res.json();
    },
    enabled: !!user?.id,
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
            Failed to load payout data
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!payoutData) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            No payout data available for the selected month
          </div>
        </CardContent>
      </Card>
    );
  }

  const successRate = (payoutData.monthlyTotal.daysMetTarget / payoutData.monthlyTotal.totalWorkingDays) * 100;

  return (
    <div className="space-y-6">
      {/* Payment Explanation Notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <DollarSign className="h-5 w-5" />
            How Your Payment is Calculated
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-900">
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-blue-100 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-blue-700">Current Rate:</span>
                <span className="text-lg font-bold text-green-600">1 USD = ₹{USD_TO_INR}</span>
              </div>
              <div className="text-sm text-blue-600 italic">
                Note: This is the bank transfer rate, not the online market rate.
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-lg">💰 Daily Payment Rates</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 p-2 bg-green-100 rounded">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span><strong>$0.20 per application</strong> when you submit <strong>15 or more</strong> applications in a day</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-orange-100 rounded">
                    <XCircle className="h-4 w-4 text-orange-600" />
                    <span><strong>$0.15 per application</strong> when you submit <strong>less than 15</strong> applications in a day</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-lg">🎯 How to Earn Maximum</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-600" />
                    <span>Submit <strong>15+ applications every day</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <span>Consistency is key - aim for daily targets</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span>Each day is calculated separately</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-100 p-3 rounded-lg">
              <h4 className="font-semibold mb-2">📊 Example Calculation:</h4>
              <div className="grid md:grid-cols-3 gap-2 text-sm">
                <div>
                  <strong>Day 1:</strong> 25 apps → $0.20 × 25 = <span className="text-green-600 font-bold">$5.00</span>
                </div>
                <div>
                  <strong>Day 2:</strong> 15 apps → $0.15 × 15 = <span className="text-orange-600 font-bold">$2.25</span>
                </div>
                <div>
                  <strong>Day 3:</strong> 20 apps → $0.20 × 20 = <span className="text-green-600 font-bold">$4.00</span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-blue-200">
                <strong>Total for 3 days: $5.00 + $2.25 + $4.00 = <span className="text-green-700 text-lg">$11.25</span></strong>
              </div>
            </div>

            <div className="bg-yellow-100 p-3 rounded-lg border border-yellow-300">
              <div className="flex items-start gap-2">
                <span className="text-xl">💡</span>
                <div>
                  <h4 className="font-semibold text-yellow-800">Pro Tip:</h4>
                  <p className="text-sm text-yellow-800">
                    Meeting the 15 application target daily gives you <strong>33% higher pay rate</strong> ($0.20 vs $0.15).
                    Focus on consistent daily performance rather than sporadic high-volume days!
                  </p>
                </div>
              </div>
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
            <div className="text-2xl font-bold">{payoutData.monthlyTotal.totalApplications}</div>
            <p className="text-xs text-muted-foreground">
              For {payoutData.monthYear}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payout</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${payoutData.monthlyTotal.totalPayout.toFixed(2)}</div>
            <div className="text-sm font-semibold text-emerald-600 mt-1">
              ₹{(payoutData.monthlyTotal.totalPayout * USD_TO_INR).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Your monthly earnings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Days Met Target</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payoutData.monthlyTotal.daysMetTarget}</div>
            <p className="text-xs text-muted-foreground">
              Out of {payoutData.monthlyTotal.totalWorkingDays} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            {successRate >= 50 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${successRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
              {successRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Target achievement rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Rate Information */}
      <Card>
        <CardHeader>
          <CardTitle>Payout Rates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                ${payoutData.rates.baseRate}
              </div>
              <div className="text-sm text-muted-foreground">Target Met Rate</div>
              <div className="text-xs text-muted-foreground mt-1">
                When you meet {payoutData.rates.dailyTarget} applications/day
              </div>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                ${payoutData.rates.belowTargetRate}
              </div>
              <div className="text-sm text-muted-foreground">Below Target Rate</div>
              <div className="text-xs text-muted-foreground mt-1">
                When below {payoutData.rates.dailyTarget} applications/day
              </div>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {payoutData.rates.dailyTarget}
              </div>
              <div className="text-sm text-muted-foreground">Daily Target</div>
              <div className="text-xs text-muted-foreground mt-1">
                Applications per day
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Breakdown - {payoutData.monthYear}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {payoutData.dailyBreakdown.map((day: any) => (
              <div
                key={day.date}
                className={`flex items-center justify-between p-4 border rounded-lg ${day.metTarget ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'
                  }`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {day.metTarget ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-orange-600" />
                    )}
                    <div>
                      <div className="font-medium">
                        {new Date(day.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                      <div className="text-sm text-muted-foreground">{day.dayOfWeek}</div>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-lg font-semibold">{day.applicationsCount}</div>
                    <div className="text-xs text-muted-foreground">Applications</div>
                  </div>

                  <Badge variant={day.metTarget ? "default" : "secondary"}>
                    {day.metTarget ? "Target Met" : "Below Target"}
                  </Badge>
                </div>

                <div className="text-right">
                  <div className="text-lg font-bold text-green-600">
                    ${day.dailyPayout.toFixed(2)}
                  </div>
                  <div className="text-sm font-semibold text-emerald-700">
                    ₹{(day.dailyPayout * USD_TO_INR).toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    @ ${day.rateApplied}/app
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
