import { FileText, Users, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { DashboardStats, EmployeeStats, ClientStats } from "@/types";

interface StatsCardsProps {
  stats: DashboardStats | EmployeeStats | ClientStats;
  type: "admin" | "employee" | "client";
}

export function StatsCards({ stats, type }: StatsCardsProps) {
  if (type === "admin") {
    const adminStats = stats as DashboardStats;
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Applications</p>
                <p className="text-3xl font-bold text-slate-900" data-testid="text-total-applications">
                  {adminStats.totalApplications}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-sm text-green-600 mt-2">
              <TrendingUp className="w-4 h-4 inline mr-1" />
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Active Employees</p>
                <p className="text-3xl font-bold text-slate-900" data-testid="text-active-employees">
                  {adminStats.activeEmployees}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-sm text-green-600 mt-2">
              <TrendingUp className="w-4 h-4 inline mr-1" />
              +2 new this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Hired This Month</p>
                <p className="text-3xl font-bold text-slate-900" data-testid="text-hired-month">
                  {adminStats.hiredThisMonth}
                </p>
              </div>
              <div className="bg-emerald-100 p-3 rounded-lg">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
            <p className="text-sm text-green-600 mt-2">
              <TrendingUp className="w-4 h-4 inline mr-1" />
              +33% success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Pending Review</p>
                <p className="text-3xl font-bold text-slate-900" data-testid="text-pending-review">
                  {adminStats.pendingReview}
                </p>
              </div>
              <div className="bg-amber-100 p-3 rounded-lg">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            <p className="text-sm text-slate-600 mt-2">Requires attention</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (type === "employee") {
    const empStats = stats as EmployeeStats;
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">My Applications</p>
                <p className="text-3xl font-bold text-slate-900" data-testid="text-my-applications">
                  {empStats.myApplications}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-sm text-green-600 mt-2">
              <TrendingUp className="w-4 h-4 inline mr-1" />
              +3 this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">In Progress</p>
                <p className="text-3xl font-bold text-slate-900" data-testid="text-in-progress">
                  {empStats.inProgress}
                </p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <p className="text-sm text-slate-600 mt-2">Awaiting response</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Success Rate</p>
                <p className="text-3xl font-bold text-slate-900" data-testid="text-success-rate">
                  {empStats.successRate}%
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-sm text-green-600 mt-2">Above average</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Client stats
  const clientStats = stats as ClientStats;
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Applications</p>
              <p className="text-3xl font-bold text-slate-900" data-testid="text-total-applications">
                {clientStats.totalApplications}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-sm text-green-600 mt-2">
            <TrendingUp className="w-4 h-4 inline mr-1" />
            +5 this week
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">In Progress</p>
              <p className="text-3xl font-bold text-slate-900" data-testid="text-in-progress">
                {clientStats.inProgress}
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <p className="text-sm text-slate-600 mt-2">Awaiting updates</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Interviews</p>
              <p className="text-3xl font-bold text-slate-900" data-testid="text-interviews">
                {clientStats.interviews}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-sm text-slate-600 mt-2">Scheduled</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Hired</p>
              <p className="text-3xl font-bold text-slate-900" data-testid="text-hired">
                {clientStats.hired}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-sm text-green-600 mt-2">
            {clientStats.totalApplications > 0 
              ? `${((clientStats.hired / clientStats.totalApplications) * 100).toFixed(1)}% success rate`
              : "0% success rate"
            }
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
