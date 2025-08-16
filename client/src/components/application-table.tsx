import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Download, ExternalLink, Edit, Trash2, FileText, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { exportApplicationsCSV } from "@/lib/csv-export";
import { getInitials, getStatusColor } from "@/lib/auth-utils";
import type { JobApplication, User, ApplicationFilters } from "@/types";

interface ApplicationTableProps {
  title?: string;
  description?: string;
  showEmployeeColumn?: boolean;
  showClientColumn?: boolean;
  showActions?: boolean;
  readonly?: boolean;
  filters?: ApplicationFilters;
  onEdit?: (application: JobApplication) => void;
  onDelete?: (id: string) => void;
}

export function ApplicationTable({
  title = "Job Applications",
  description,
  showEmployeeColumn = true,
  showClientColumn = true,
  showActions = true,
  readonly = false,
  filters: initialFilters = {},
  onEdit,
  onDelete,
}: ApplicationTableProps) {
  const { toast } = useToast();
  const [filters, setFilters] = useState<ApplicationFilters>({
    page: 1,
    limit: 10,
    sortBy: "dateApplied",
    sortOrder: "desc",
    ...initialFilters,
  });

  const { data: clients = [] } = useQuery<User[]>({
    queryKey: ["/api/clients"],
    enabled: showClientColumn,
  });

  const { data: employees = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: showEmployeeColumn,
  });

  const { data, isLoading } = useQuery<{
    applications: JobApplication[];
    total: number;
  }>({
    queryKey: ["/api/applications", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          params.append(key, value.toString());
        }
      });
      
      const response = await fetch(`/api/applications?${params.toString()}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch applications");
      }
      
      return response.json();
    },
  });

  const updateFilter = (key: keyof ApplicationFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key === "page" ? value : 1, // Reset to page 1 when changing filters
    }));
  };

  const handleExport = async () => {
    try {
      await exportApplicationsCSV(filters);
      toast({
        title: "Success",
        description: "Applications exported successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export applications",
        variant: "destructive",
      });
    }
  };

  const totalPages = Math.ceil((data?.total || 0) / (filters.limit || 10));

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading applications...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <p className="text-sm text-slate-600 mt-1">{description}</p>}
          </div>
          
          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search jobs, companies..."
                className="pl-10 w-64"
                value={filters.search || ""}
                onChange={(e) => updateFilter("search", e.target.value)}
                data-testid="input-search"
              />
            </div>
            
            <Select value={filters.status || "all"} onValueChange={(value) => updateFilter("status", value === "all" ? "" : value)}>
              <SelectTrigger className="w-40" data-testid="select-status">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Applied">Applied</SelectItem>
                <SelectItem value="Screening">Screening</SelectItem>
                <SelectItem value="Interview">Interview</SelectItem>
                <SelectItem value="Offer">Offer</SelectItem>
                <SelectItem value="Hired">Hired</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
                <SelectItem value="On Hold">On Hold</SelectItem>
              </SelectContent>
            </Select>

            {showEmployeeColumn && (
              <Select value={filters.employeeId || "all"} onValueChange={(value) => updateFilter("employeeId", value === "all" ? "" : value)}>
                <SelectTrigger className="w-40" data-testid="select-employee">
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.filter(u => u.role === "EMPLOYEE").map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {showClientColumn && (
              <Select value={filters.clientId || "all"} onValueChange={(value) => updateFilter("clientId", value === "all" ? "" : value)}>
                <SelectTrigger className="w-40" data-testid="select-client">
                  <SelectValue placeholder="All Clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            <Button onClick={handleExport} variant="outline" data-testid="button-export">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer hover:bg-slate-50" onClick={() => {
                  const newOrder = filters.sortBy === "dateApplied" && filters.sortOrder === "desc" ? "asc" : "desc";
                  updateFilter("sortBy", "dateApplied");
                  updateFilter("sortOrder", newOrder);
                }} data-testid="header-date-applied">
                  Date Applied
                  <ArrowUpDown className="w-4 h-4 ml-1 inline" />
                </TableHead>
                {showEmployeeColumn && <TableHead>Employee</TableHead>}
                {showClientColumn && <TableHead>Client</TableHead>}
                <TableHead>Job Title</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Portal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Mail</TableHead>
                <TableHead>Links</TableHead>
                {showActions && !readonly && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.applications.map((application) => (
                <TableRow key={application.id} data-testid={`row-application-${application.id}`}>
                  <TableCell className="font-medium" data-testid="text-date-applied">
                    {new Date(application.dateApplied).toLocaleDateString()}
                  </TableCell>
                  
                  {showEmployeeColumn && (
                    <TableCell>
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-blue-600 text-xs font-medium">
                            {getInitials(application.employee.name)}
                          </span>
                        </div>
                        <span className="text-sm font-medium" data-testid="text-employee-name">
                          {application.employee.name}
                        </span>
                      </div>
                    </TableCell>
                  )}
                  
                  {showClientColumn && (
                    <TableCell data-testid="text-client-name">{application.client.name}</TableCell>
                  )}
                  
                  <TableCell data-testid="text-job-title">{application.jobTitle}</TableCell>
                  <TableCell data-testid="text-company-name">{application.companyName}</TableCell>
                  <TableCell data-testid="text-location">{application.location || "-"}</TableCell>
                  <TableCell data-testid="text-portal">{application.portalName || "-"}</TableCell>
                  
                  <TableCell>
                    <Badge className={getStatusColor(application.status)} data-testid="badge-status">
                      {application.status}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <Badge className={application.mailSent ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"} data-testid="badge-mail">
                      {application.mailSent ? "Yes" : "No"}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {application.jobLink && (
                        <a
                          href={application.jobLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-900"
                          title="Job Link"
                          data-testid="link-job"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      {application.jobPage && (
                        <a
                          href={application.jobPage}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-600 hover:text-slate-900"
                          title="Job Page"
                          data-testid="link-job-page"
                        >
                          <FileText className="w-4 h-4" />
                        </a>
                      )}
                      {application.resumeUrl && (
                        <a
                          href={application.resumeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-900"
                          title="Resume"
                          data-testid="link-resume"
                        >
                          <FileText className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                  
                  {showActions && !readonly && (
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {onEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(application)}
                            data-testid="button-edit"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(application.id)}
                            className="text-red-600 hover:text-red-900"
                            data-testid="button-delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              
              {!data?.applications.length && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    <div className="text-slate-500" data-testid="text-no-applications">
                      No applications found. Try adjusting your filters.
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="bg-white px-6 py-3 border-t border-slate-200 flex items-center justify-between">
          <div className="flex-1 flex justify-between sm:hidden">
            <Button
              variant="outline"
              onClick={() => updateFilter("page", Math.max(1, (filters.page || 1) - 1))}
              disabled={(filters.page || 1) <= 1}
              data-testid="button-prev-mobile"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => updateFilter("page", (filters.page || 1) + 1)}
              disabled={(filters.page || 1) >= totalPages}
              data-testid="button-next-mobile"
            >
              Next
            </Button>
          </div>
          
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-700" data-testid="text-pagination-info">
                Showing {((filters.page || 1) - 1) * (filters.limit || 10) + 1} to{" "}
                {Math.min((filters.page || 1) * (filters.limit || 10), data?.total || 0)} of{" "}
                {data?.total || 0} results
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateFilter("page", Math.max(1, (filters.page || 1) - 1))}
                disabled={(filters.page || 1) <= 1}
                data-testid="button-prev"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <span className="text-sm text-slate-700" data-testid="text-current-page">
                Page {filters.page || 1} of {totalPages}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateFilter("page", (filters.page || 1) + 1)}
                disabled={(filters.page || 1) >= totalPages}
                data-testid="button-next"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
