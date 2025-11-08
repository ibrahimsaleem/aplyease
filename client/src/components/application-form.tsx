import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Checkbox } from "@/components/ui/checkbox";
import { ExternalLink, Download } from "lucide-react";
import type { User, ClientProfile } from "@/types";

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
  const [, setLocation] = useLocation();
  const [selectedClientId, setSelectedClientId] = useState<string>("");

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

  const { data: clients = [] } = useQuery<User[]>({
    queryKey: ["/api/clients"],
  });

  const { data: clientProfile } = useQuery<ClientProfile>({
    queryKey: ["/api/client-profiles", selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return null;
      try {
        const res = await apiRequest("GET", `/api/client-profiles/${selectedClientId}`);
        if (res.status === 404) return null;
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return res.json();
      } catch (error) {
        // If it's a 404 or network error, return null instead of throwing
        if (error instanceof Error && (error.message.includes('404') || error.message.includes('Failed to fetch'))) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!selectedClientId,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Update selected client when form value changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "clientId" && value.clientId) {
        setSelectedClientId(value.clientId);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const useProfileData = () => {
    if (!clientProfile) return;
    
    // Auto-fill resume URL and LinkedIn from profile
    if (clientProfile.resumeUrl) {
      form.setValue("resumeUrl", clientProfile.resumeUrl);
    }
    
    toast({
      title: "Profile data loaded",
      description: "Resume URL has been filled from client profile",
    });
  };

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
    createApplication.mutate(data);
  };

  const onReset = () => {
    form.reset();
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Add New Application</CardTitle>
        <CardDescription>
          {selectedClientId && clientProfile && (
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline">
                Profile Available
              </Badge>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={useProfileData}
              >
                <Download className="w-3 h-3 mr-1" />
                Use Profile Data
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setLocation(`/clients/${selectedClientId}`)}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                View Profile
              </Button>
            </div>
          )}
        </CardDescription>
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
                  <Select onValueChange={field.onChange} value={field.value} data-testid="select-client">
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Client" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
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
                disabled={createApplication.isPending}
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
