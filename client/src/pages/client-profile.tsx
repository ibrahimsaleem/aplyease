import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { NavigationHeader } from "@/components/navigation-header";
import { ClientProfileView } from "@/components/client-profile-view";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Loader2, ArrowLeft } from "lucide-react";
import type { ClientProfile, ClientStats } from "@/types";

const profileSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  contactEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  contactPassword: z.string().optional(),
  phoneNumber: z.string().min(1, "Phone number is required"),
  mailingAddress: z.string().min(1, "Mailing address is required"),
  situation: z.string().min(1, "Situation is required"),
  servicesRequested: z.array(z.string()),
  applicationQuota: z.number().int().min(0),
  startDate: z.string().optional(),
  searchScope: z.array(z.string()),
  states: z.array(z.string()),
  cities: z.array(z.string()),
  desiredTitles: z.string().min(1, "Desired job titles are required"),
  targetCompanies: z.string().optional(),
  resumeUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  linkedinUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  workAuthorization: z.string().min(1, "Work authorization is required"),
  sponsorshipAnswer: z.string().min(1, "Sponsorship answer is required"),
  additionalNotes: z.string().optional(),
  baseResumeLatex: z.string().optional(),
  // Optional client details (all optional)
  dateOfBirth: z.string().optional(),
  hasValidDrivingLicense: z.boolean().optional(),
  desiredCompMin: z.number().int().min(0).optional(),
  desiredCompMax: z.number().int().min(0).optional(),
  desiredCompUnit: z.enum(["HOUR", "YEAR"]).optional(),
  availabilityDate: z.string().optional(),
  gender: z.enum(["M", "F", "DECLINE"]).optional(),
  isHispanicLatino: z.enum(["YES", "NO", "DECLINE"]).optional(),
  ethnicity: z.string().optional(),
  veteranStatus: z.string().optional(),
  disabilityStatus: z.string().optional(),
  travelAvailability: z.enum(["0", "0_25", "50", "75_100"]).optional(),
  knownLanguages: z.string().optional(),
  workingShift: z.string().optional(),
  canProveWorkAuthorization: z.boolean().optional(),
  requiresSponsorship: z.boolean().optional(),
  relatedToCompany: z.boolean().optional(),
  referredByEmployee: z.boolean().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const serviceOptions = [
  "Apply for jobs on my behalf",
  "Resume/CV optimization for each job",
  "Web portfolio development ($99)",
  "LinkedIn Review and optimization ($78)",
];

const searchScopeOptions = [
  "Anywhere in the U.S.",
  "Remote-only",
  "Specific states",
  "Specific cities",
];

export default function ClientProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [statesInput, setStatesInput] = useState("");
  const [citiesInput, setCitiesInput] = useState("");
  const [editMode, setEditMode] = useState(false);
  
  // Get clientId from URL query params (for employees editing client profiles)
  const urlParams = new URLSearchParams(window.location.search);
  const editClientId = urlParams.get('clientId');
  
  // Determine which user's profile to load/edit
  const targetUserId = editClientId || user?.id;
  const isEditingOtherProfile = editClientId && editClientId !== user?.id;
  const isOwnProfile = !editClientId || editClientId === user?.id;

  const { data: profile, isLoading } = useQuery<ClientProfile>({
    queryKey: ["/api/client-profiles", targetUserId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/client-profiles/${targetUserId}`);
      if (res.status === 404) {
        return null;
      }
      return res.json();
    },
    enabled: !!targetUserId,
  });

  // Fetch stats when viewing own profile in read-only mode
  const { data: stats } = useQuery<ClientStats>({
    queryKey: ["/api/stats/client", user?.id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/stats/client/${user?.id}`);
      return res.json();
    },
    enabled: isOwnProfile && !editMode && !!user?.id,
  });

  // Update input fields when profile loads
  useEffect(() => {
    if (profile?.states) {
      setStatesInput(profile.states.join(', '));
    }
    if (profile?.cities) {
      setCitiesInput(profile.cities.join(', '));
    }
  }, [profile]);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: profile ? {
      fullName: profile.fullName,
      contactEmail: profile.contactEmail || "",
      contactPassword: profile.contactPassword || "",
      phoneNumber: profile.phoneNumber,
      mailingAddress: profile.mailingAddress,
      situation: profile.situation,
      servicesRequested: profile.servicesRequested || [],
      applicationQuota: profile.applicationQuota,
      startDate: profile.startDate || "",
      searchScope: profile.searchScope || [],
      states: profile.states || [],
      cities: profile.cities || [],
      desiredTitles: profile.desiredTitles,
      targetCompanies: profile.targetCompanies || "",
      resumeUrl: profile.resumeUrl || "",
      linkedinUrl: profile.linkedinUrl || "",
      workAuthorization: profile.workAuthorization,
      sponsorshipAnswer: profile.sponsorshipAnswer,
      additionalNotes: profile.additionalNotes || "",
      baseResumeLatex: profile.baseResumeLatex || "",
      dateOfBirth: profile.dateOfBirth || "",
      hasValidDrivingLicense: profile.hasValidDrivingLicense ?? false,
      desiredCompMin: profile.desiredCompMin ?? 0,
      desiredCompMax: profile.desiredCompMax ?? 0,
      desiredCompUnit: profile.desiredCompUnit || undefined,
      availabilityDate: profile.availabilityDate || "",
      gender: profile.gender || undefined,
      isHispanicLatino: profile.isHispanicLatino || undefined,
      ethnicity: profile.ethnicity || "",
      veteranStatus: profile.veteranStatus || "",
      disabilityStatus: profile.disabilityStatus || "",
      travelAvailability: profile.travelAvailability || undefined,
      knownLanguages: profile.knownLanguages || "",
      workingShift: profile.workingShift || "",
      canProveWorkAuthorization: profile.canProveWorkAuthorization ?? false,
      requiresSponsorship: profile.requiresSponsorship ?? false,
      relatedToCompany: profile.relatedToCompany ?? false,
      referredByEmployee: profile.referredByEmployee ?? false,
    } : {
      fullName: user?.name || "",
      contactEmail: "",
      contactPassword: "",
      phoneNumber: "",
      mailingAddress: "",
      situation: "",
      servicesRequested: [],
      applicationQuota: 500,
      startDate: "",
      searchScope: [],
      states: [],
      cities: [],
      desiredTitles: "",
      targetCompanies: "",
      resumeUrl: "",
      linkedinUrl: "",
      workAuthorization: "",
      sponsorshipAnswer: "",
      additionalNotes: "",
      baseResumeLatex: "",
      dateOfBirth: "",
      hasValidDrivingLicense: false,
      desiredCompMin: 0,
      desiredCompMax: 0,
      desiredCompUnit: undefined,
      availabilityDate: "",
      gender: undefined,
      isHispanicLatino: undefined,
      ethnicity: "",
      veteranStatus: "",
      disabilityStatus: "",
      travelAvailability: undefined,
      knownLanguages: "",
      workingShift: "",
      canProveWorkAuthorization: false,
      requiresSponsorship: false,
      relatedToCompany: false,
      referredByEmployee: false,
    },
  });

  const updateProfile = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const response = await apiRequest("PUT", `/api/client-profiles/${targetUserId}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: isEditingOtherProfile ? "Client profile updated successfully" : "Profile updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/client-profiles", targetUserId] });
      // Exit edit mode after successful save (for clients viewing their own profile)
      if (isOwnProfile) {
        setEditMode(false);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    updateProfile.mutate(data);
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <NavigationHeader user={user} />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavigationHeader user={user} />
      
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8 pb-20 sm:pb-8">
        {/* Back button for employees editing client profile */}
        {isEditingOtherProfile && (
          <Button 
            variant="ghost" 
            className="mb-4 min-h-[44px]"
            onClick={() => setLocation(`/clients/${editClientId}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Back to Client Detail</span>
            <span className="sm:hidden">Back</span>
          </Button>
        )}

        {/* Back button for clients viewing their own profile */}
        {isOwnProfile && user?.role === "CLIENT" && (
          <Button 
            variant="ghost" 
            className="mb-4 min-h-[44px]"
            onClick={() => setLocation("/")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Button>
        )}

        {/* Show read-only view for clients viewing their own profile, unless in edit mode */}
        {isOwnProfile && !editMode && profile ? (
          <ClientProfileView
            profile={profile}
            stats={stats}
            isOwnProfile={isOwnProfile}
            onEditClick={() => setEditMode(true)}
          />
        ) : (
          <Card>
          <CardHeader>
            <CardTitle>
              {isEditingOtherProfile ? `Edit Client Profile: ${profile?.fullName || 'Loading...'}` : 'Client Profile'}
            </CardTitle>
            <CardDescription>
              {isEditingOtherProfile 
                ? 'Update this client\'s information to help them with job applications.'
                : 'Update your information to help us build a custom job-application strategy just for you.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Accordion
                  type="multiple"
                  defaultValue={["basic", "job", "location"]}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4"
                >
                  <AccordionItem value="basic">
                    <AccordionTrigger className="text-base sm:text-lg">Basic Information</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="fullName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Enter your first and last name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="contactEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Contact Email (Optional)</FormLabel>
                              <FormControl>
                                <Input {...field} type="email" placeholder="Email for job applications" />
                              </FormControl>
                              <FormDescription>
                                We'll use this in job applications. Leave blank to create a new one.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="contactPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Contact Password (Optional)</FormLabel>
                              <FormControl>
                                <Input {...field} type="password" placeholder="Password for application portals" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="phoneNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number (WhatsApp) *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="For quick calls or SMS reminders" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="mailingAddress"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Mailing Address *</FormLabel>
                              <FormControl>
                                <Textarea {...field} placeholder="Street, City, State, ZIP – needed for job applications" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="clientDetails">
                    <AccordionTrigger className="text-base sm:text-lg">Client Details</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="dateOfBirth"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date of Birth</FormLabel>
                              <FormControl>
                                <Input {...field} type="date" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="hasValidDrivingLicense"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between space-y-0">
                              <div>
                                <FormLabel>Valid Driving License</FormLabel>
                                <FormDescription>Indicate if you currently hold a valid driving license.</FormDescription>
                              </div>
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={(checked) => field.onChange(!!checked)}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name="desiredCompMin"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Desired Compensation (Min)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min={0}
                                    placeholder="e.g. 50"
                                    value={field.value ?? ""}
                                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                                  />
                                </FormControl>
                                <FormDescription>Enter numeric amount only.</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="desiredCompMax"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Desired Compensation (Max)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min={0}
                                    placeholder="e.g. 70"
                                    value={field.value ?? ""}
                                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="desiredCompUnit"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Unit</FormLabel>
                                <FormControl>
                                  <select
                                    className="border border-input bg-background px-3 py-2 rounded-md text-sm"
                                    value={field.value || ""}
                                    onChange={(e) => field.onChange(e.target.value || undefined)}
                                  >
                                    <option value="">Select</option>
                                    <option value="HOUR">Per Hour</option>
                                    <option value="YEAR">Per Year</option>
                                  </select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="availabilityDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date of Availability / Joining</FormLabel>
                              <FormControl>
                                <Input {...field} type="date" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="gender"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Gender</FormLabel>
                                <FormControl>
                                  <select
                                    className="border border-input bg-background px-3 py-2 rounded-md text-sm"
                                    value={field.value || ""}
                                    onChange={(e) => field.onChange(e.target.value || undefined)}
                                  >
                                    <option value="">Select</option>
                                    <option value="M">Male</option>
                                    <option value="F">Female</option>
                                    <option value="DECLINE">Decline to Answer</option>
                                  </select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="isHispanicLatino"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Are you Hispanic/Latino?</FormLabel>
                                <FormControl>
                                  <select
                                    className="border border-input bg-background px-3 py-2 rounded-md text-sm"
                                    value={field.value || ""}
                                    onChange={(e) => field.onChange(e.target.value || undefined)}
                                  >
                                    <option value="">Select</option>
                                    <option value="YES">Yes</option>
                                    <option value="NO">No</option>
                                    <option value="DECLINE">Decline to Answer</option>
                                  </select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="ethnicity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ethnicity</FormLabel>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  placeholder="Asian, American, Black, European, Southeast Asian, etc. or prefer not to self identify"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="veteranStatus"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Veteran Status</FormLabel>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  placeholder="e.g. 'I am not a protected veteran', 'I identify as one or more of the classifications of a protected veteran', or 'I don't wish to answer'"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="disabilityStatus"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Disability Status</FormLabel>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  placeholder="e.g. 'Yes, I have a disability, or have had one in the past', 'No, I do not have a disability and have not had one in the past', or 'I do not want to answer'"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="travelAvailability"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Travel Availability</FormLabel>
                              <FormControl>
                                <select
                                  className="border border-input bg-background px-3 py-2 rounded-md text-sm"
                                  value={field.value || ""}
                                  onChange={(e) => field.onChange(e.target.value || undefined)}
                                >
                                  <option value="">Select</option>
                                  <option value="0">0%</option>
                                  <option value="0_25">0–25%</option>
                                  <option value="50">50%</option>
                                  <option value="75_100">75–100%</option>
                                </select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="knownLanguages"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Known Languages</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="English, Spanish, etc." />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="workingShift"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Preferred Working Shift</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Day, Evening, Night, etc." />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="canProveWorkAuthorization"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between space-y-0">
                              <div>
                                <FormLabel>If hired, can you provide proof of U.S. work authorization?</FormLabel>
                              </div>
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={(checked) => field.onChange(!!checked)}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="requiresSponsorship"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between space-y-0">
                              <div>
                                <FormLabel>Will you require sponsorship to work legally in the U.S. in the future?</FormLabel>
                              </div>
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={(checked) => field.onChange(!!checked)}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="relatedToCompany"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between space-y-0">
                              <div>
                                <FormLabel>Are you related to anyone at the company or its subsidiaries?</FormLabel>
                              </div>
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={(checked) => field.onChange(!!checked)}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="referredByEmployee"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between space-y-0">
                              <div>
                                <FormLabel>Were you referred to this position by a current employee?</FormLabel>
                              </div>
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={(checked) => field.onChange(!!checked)}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="currentSituation">
                    <AccordionTrigger className="text-base sm:text-lg">Current Situation</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="situation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>What best describes your situation? *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="e.g., Student, Employed, Unemployed" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="services">
                    <AccordionTrigger className="text-base sm:text-lg">Services</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="servicesRequested"
                          render={() => (
                            <FormItem>
                              <FormLabel>Which services would you like?</FormLabel>
                              {serviceOptions.map((service) => (
                                <FormField
                                  key={service}
                                  control={form.control}
                                  name="servicesRequested"
                                  render={({ field }) => {
                                    return (
                                      <FormItem
                                        key={service}
                                        className="flex flex-row items-start space-x-3 space-y-0"
                                      >
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(service)}
                                            onCheckedChange={(checked) => {
                                              return checked
                                                ? field.onChange([...field.value, service])
                                                : field.onChange(
                                                    field.value?.filter(
                                                      (value) => value !== service
                                                    )
                                                  )
                                            }}
                                          />
                                        </FormControl>
                                        <FormLabel className="font-normal">
                                          {service}
                                        </FormLabel>
                                      </FormItem>
                                    )
                                  }}
                                />
                              ))}
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="applicationQuota"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>How many applications? *</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="number" 
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  placeholder="500, 1000, etc." 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="startDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Preferred Start Date</FormLabel>
                              <FormControl>
                                <Input {...field} type="date" />
                              </FormControl>
                              <FormDescription>
                                When should we begin submitting your applications?
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="location">
                    <AccordionTrigger className="text-base sm:text-lg">Location Preferences</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="searchScope"
                          render={() => (
                            <FormItem>
                              <FormLabel>Where should we search? *</FormLabel>
                              {searchScopeOptions.map((option) => (
                                <FormField
                                  key={option}
                                  control={form.control}
                                  name="searchScope"
                                  render={({ field }) => {
                                    return (
                                      <FormItem
                                        key={option}
                                        className="flex flex-row items-start space-x-3 space-y-0"
                                      >
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(option)}
                                            onCheckedChange={(checked) => {
                                              return checked
                                                ? field.onChange([...field.value, option])
                                                : field.onChange(
                                                    field.value?.filter(
                                                      (value) => value !== option
                                                    )
                                                  )
                                            }}
                                          />
                                        </FormControl>
                                        <FormLabel className="font-normal">
                                          {option}
                                        </FormLabel>
                                      </FormItem>
                                    )
                                  }}
                                />
                              ))}
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="states"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Specific States (if applicable)</FormLabel>
                              <FormControl>
                                <Input 
                                  value={statesInput}
                                  onChange={(e) => {
                                    setStatesInput(e.target.value);
                                    field.onChange(e.target.value.split(',').map(s => s.trim()).filter(Boolean));
                                  }}
                                  placeholder="California, New York, Texas (comma-separated)" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="cities"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Specific Cities (if applicable)</FormLabel>
                              <FormControl>
                                <Input 
                                  value={citiesInput}
                                  onChange={(e) => {
                                    setCitiesInput(e.target.value);
                                    field.onChange(e.target.value.split(',').map(c => c.trim()).filter(Boolean));
                                  }}
                                  placeholder="San Francisco, Austin, Seattle (comma-separated)" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="job">
                    <AccordionTrigger className="text-base sm:text-lg">Job Preferences</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="desiredTitles"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Desired Job Titles *</FormLabel>
                              <FormControl>
                                <Textarea {...field} placeholder='e.g., "Data Analyst Summer Intern," "Senior Mechanical Engineer"' />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="targetCompanies"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Target Industries or Companies (Optional)</FormLabel>
                              <FormControl>
                                <Textarea {...field} placeholder="Helps us narrow your search" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="documents">
                    <AccordionTrigger className="text-base sm:text-lg">Documents & Links</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="resumeUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Resume/CV URL</FormLabel>
                              <FormControl>
                                <Input {...field} type="url" placeholder="https://..." />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="linkedinUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>LinkedIn Profile URL (Optional)</FormLabel>
                              <FormControl>
                                <Input {...field} type="url" placeholder="https://linkedin.com/in/..." />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="baseResumeLatex"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Legacy Base Resume LaTeX Code</FormLabel>
                              <FormControl>
                                <Textarea 
                                  {...field} 
                                  className="font-mono min-h-[200px]" 
                                  placeholder="\\documentclass{article}..." 
                                />
                              </FormControl>
                              <FormDescription>
                                Optional legacy field. Prefer using Resume Profiles in the resume templates section.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="workAuth">
                    <AccordionTrigger className="text-base sm:text-lg">Work Authorization</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="workAuthorization"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Work Authorization / Visa Status *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder='e.g., "F-1 OPT until Dec 2027," "U.S. Citizen"' />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="sponsorshipAnswer"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sponsorship Required? *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Yes / No" />
                              </FormControl>
                              <FormDescription>
                                What to answer when asked if sponsorship is required in job applications
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="additional">
                    <AccordionTrigger className="text-base sm:text-lg">Additional Information</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="additionalNotes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Additional Notes or Special Requests</FormLabel>
                              <FormControl>
                                <Textarea {...field} placeholder="Visa constraints, salary targets, or other preferences" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <div className="flex justify-end gap-4">
                  {isOwnProfile && editMode && (
                    <Button type="button" variant="outline" onClick={() => setEditMode(false)}>
                      Cancel
                    </Button>
                  )}
                  <Button type="submit" disabled={updateProfile.isPending}>
                    {updateProfile.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Profile
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  );
}

