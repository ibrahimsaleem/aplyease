export type User = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "CLIENT" | "EMPLOYEE";
  company?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type JobApplication = {
  id: string;
  clientId: string;
  employeeId: string;
  dateApplied: string;
  appliedByName: string;
  jobTitle: string;
  companyName: string;
  location?: string;
  portalName?: string;
  jobLink?: string;
  jobPage?: string;
  resumeUrl?: string;
  additionalLink?: string;
  status: "Applied" | "Screening" | "Interview" | "Offer" | "Hired" | "Rejected" | "On Hold";
  mailSent: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  client: User;
  employee: User;
};

export type DashboardStats = {
  totalApplications: number;
  activeEmployees: number;
  hiredThisMonth: number;
  pendingReview: number;
};

export type EmployeeStats = {
  myApplications: number;
  inProgress: number;
  successRate: number;
};

export type ClientStats = {
  totalApplications: number;
  inProgress: number;
  interviews: number;
  hired: number;
  applicationsRemaining?: number;
};

export type ApplicationFilters = {
  clientId?: string;
  employeeId?: string;
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export type EmployeePerformanceData = {
  id: string;
  name: string;
  applicationsSubmitted: number;
  successRate: number;
  earnings: number;
  interviews: number;
  totalApplications: number;
};

export type EmployeePerformanceAnalytics = {
  totalPayout: number;
  employees: EmployeePerformanceData[];
};

export type ClientPerformanceData = {
  id: string;
  name: string;
  company?: string;
  applicationsRemaining: number;
  totalApplications: number;
  inProgress: number;
  interviews: number;
  hired: number;
  successRate: number;
  priority: "High" | "Medium" | "Low";
};

export type ClientPerformanceAnalytics = {
  totalClients: number;
  clients: ClientPerformanceData[];
};
