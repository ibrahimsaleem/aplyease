import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { RefreshCw, Loader2 } from "lucide-react";
import type { User } from "@/types";

const applicationSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  dateApplied: z.string().min(1, "Date applied is required"),
  jobTitle: z.string().min(1, "Job title is required"),
  companyName: z.string().min(1, "Company name is required"),
  location: z.string().optional(),
  portalName: z.string().optional(),
  jobLink: z.string().url("Invalid URL").optional().or(z.literal("")),
  jobPage: z.string().url("Invalid URL").optional().or(z.literal("")),
  resumeUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  additionalLink: z.string().url("Invalid URL").optional().or(z.literal("")),
  notes: z.string().optional(),
  mailSent: z.boolean().default(false),
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

export function ApplicationForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      clientId: "",
      dateApplied: new Date().toISOString().split("T")[0],
      jobTitle: "",
      companyName: "",
      location: "",
      portalName: "",
      jobLink: "",
      jobPage: "",
      resumeUrl: "",
      additionalLink: "",
      notes: "",
      mailSent: false,
    },
  });

  const { data: clients = [], isLoading: clientsLoading, error: clientsError, refetch: refetchClients } = useQuery<User[]>({
    queryKey: ["/api/clients"],
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  // Debug logging for client dropdown issues
  useEffect(() => {
    if (clientsError) {
      console.error("Client dropdown error:", clientsError);
    } else if (clients.length > 0) {
      console.log(`Client dropdown loaded ${clients.length} clients successfully`);
    }
  }, [clients, clientsError]);

  const createApplication = useMutation({
    mutationFn: async (data: ApplicationFormData) => {
      const response = await apiRequest("POST", "/api/applications", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Application created successfully",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create application",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ApplicationFormData) => {
    // Prevent submission if clients are still loading or there's an error
    if (clientsLoading) {
      toast({
        title: "Please wait",
        description: "Clients are still loading. Please wait and try again.",
        variant: "destructive",
      });
      return;
    }
    
    if (clientsError) {
      toast({
        title: "Client data unavailable",
        description: "Unable to load client list. Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }
    
    createApplication.mutate(data);
  };

  const onReset = () => {
    form.reset();
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Add New Application</CardTitle>
          {clientsError && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetchClients()}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Clients
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client *</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value} 
                    data-testid="select-client"
                    disabled={clientsLoading || !!clientsError}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <div className="flex items-center gap-2">
                          {clientsLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                          <SelectValue 
                            placeholder={
                              clientsLoading 
                                ? "Loading clients..." 
                                : clientsError 
                                  ? "Error loading clients" 
                                  : "Select Client"
                            } 
                          />
                        </div>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clientsLoading ? (
                        <SelectItem value="" disabled>
                          Loading clients...
                        </SelectItem>
                      ) : clientsError ? (
                        <SelectItem value="" disabled>
                          Error loading clients. Please try again.
                        </SelectItem>
                      ) : clients.length === 0 ? (
                        <SelectItem value="" disabled>
                          No clients available
                        </SelectItem>
                      ) : (
                        clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                  {clientsError && (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <span>Failed to load clients.</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => refetchClients()}
                        className="h-auto p-1 text-destructive hover:text-destructive/80"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Retry
                      </Button>
                    </div>
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dateApplied"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date Applied *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} data-testid="input-date-applied" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="jobTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Data Scientist" {...field} data-testid="input-job-title" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Google" {...field} data-testid="input-company-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. San Francisco, CA" {...field} data-testid="input-location" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="portalName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Portal</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Job Right" {...field} data-testid="input-portal" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="jobLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Link</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://..." {...field} data-testid="input-job-link" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="jobPage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Page</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://..." {...field} data-testid="input-job-page" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="resumeUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resume URL</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="Google Drive link" {...field} data-testid="input-resume-url" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="additionalLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Link (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="url" 
                      placeholder="Screenshot, PDF, or other link" 
                      {...field} 
                      data-testid="input-additional-link" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="md:col-span-2 lg:col-span-3">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        rows={3} 
                        placeholder="Additional notes..." 
                        {...field} 
                        data-testid="textarea-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Mail Sent */}
            <div className="md:col-span-2 lg:col-span-3">
              <FormField
                control={form.control}
                name="mailSent"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Mail sent</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div className="md:col-span-2 lg:col-span-3 flex justify-end space-x-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onReset}
                data-testid="button-reset"
              >
                Reset
              </Button>
              <Button 
                type="submit" 
                disabled={createApplication.isPending || clientsLoading || !!clientsError}
                data-testid="button-submit-application"
              >
                {createApplication.isPending ? "Adding..." : "Add Application"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
