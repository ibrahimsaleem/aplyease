export type User = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "CLIENT" | "EMPLOYEE";
  company?: string;
  isActive: boolean;
  geminiApiKey?: string;
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
  totalAppsRemaining?: number;
  assignedClients?: { name: string; appsRemaining: number }[];
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
  assignedClients: string[];
  applicationsToday: number;
  applicationsThisMonth: number;
  interviewsThisMonth: number;
  earningsThisMonth: number;
  activeClientsCount: number;
  totalApplicationsRemaining: number;
  effectiveWorkload: number;
};

export type EmployeePerformanceAnalytics = {
  totalPayout: number;
  employees: EmployeePerformanceData[];
  weeklyPerformance: Array<{
    week: string;
    applications: number;
    employees: number;
  }>;
  dailyPerformance: Array<{
    date: string;
    applications: number;
    employees: number;
  }>;
};

export type DailyEmployeeApplicationData = {
  id: string;
  name: string;
  applicationsToday: number;
  applicationsYesterday: number;
  applicationsLast3Days: number;
  applicationsLast7Days: number;
  totalApplications: number;
  successRate: number;
  earnings: number;
  interviews: number;
};

export type DailyEmployeeAnalytics = {
  totalApplicationsToday: number;
  totalApplicationsYesterday: number;
  totalApplicationsLast3Days: number;
  totalApplicationsLast7Days: number;
  employees: DailyEmployeeApplicationData[];
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
  assignedEmployees: { id: string; name: string }[];
};

export type ClientPerformanceAnalytics = {
  totalClients: number;
  clients: ClientPerformanceData[];
};

export type ClientProfile = {
  userId: string;
  fullName: string;
  contactEmail?: string;
  contactPassword?: string;
  phoneNumber: string;
  mailingAddress: string;
  situation: string;
  servicesRequested: string[];
  applicationQuota: number;
  startDate?: string;
  searchScope: string[];
  states: string[];
  cities: string[];
  desiredTitles: string;
  targetCompanies?: string;
  resumeUrl?: string;
  linkedinUrl?: string;
  workAuthorization: string;
  sponsorshipAnswer: string;
  additionalNotes?: string;
  baseResumeLatex?: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
};

export type ResumeEvaluation = {
  score: number;
  overallAssessment: string;
  strengths: string[];
  improvements: string[];
  missingElements: string[];
};

export type OptimizationIteration = {
  iteration: number;
  score: number;
  latex: string;
  evaluation: ResumeEvaluation;
  timestamp: string;
};