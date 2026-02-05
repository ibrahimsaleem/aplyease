export type User = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "CLIENT" | "EMPLOYEE";
  company?: string;
  isActive: boolean;
  whatsappNumber?: string;
  geminiApiKey?: string;
  applicationsRemaining?: number;
  amountPaid?: number; // Payment made by client (in cents)
  amountDue?: number; // Remaining payment due (in cents)
  resumeCredits?: number; // AI Resume Generator credits
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
  amountPaid?: number; // Payment made by client (in cents)
  amountDue?: number; // Remaining payment due (in cents)
  assignedEmployees?: { name: string; email: string; whatsappNumber?: string }[];
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
  amountPaid: number; // Payment made by client (in cents)
  amountDue: number; // Remaining payment due (in cents)
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
  // Optional client details
  dateOfBirth?: string;
  hasValidDrivingLicense?: boolean;
  desiredCompMin?: number;
  desiredCompMax?: number;
  desiredCompUnit?: string; // "HOUR" | "YEAR"
  availabilityDate?: string;
  gender?: string; // "M" | "F" | "DECLINE"
  isHispanicLatino?: string; // "YES" | "NO" | "DECLINE"
  ethnicity?: string;
  veteranStatus?: string;
  disabilityStatus?: string;
  travelAvailability?: string;
  knownLanguages?: string;
  workingShift?: string;
  canProveWorkAuthorization?: boolean;
  requiresSponsorship?: boolean;
  relatedToCompany?: boolean;
  referredByEmployee?: boolean;
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

export type ResumeProfile = {
  id: string;
  clientId: string;
  name: string;
  baseResumeLatex: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
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

export type PaymentTransaction = {
  id: string;
  clientId: string;
  amount: number; // in cents
  paymentDate: string;
  notes?: string;
  recordedBy?: string;
  createdAt: string;
};

export type MonthlyPaymentStats = {
  month: number;
  totalAmount: number;
  transactionCount: number;
};