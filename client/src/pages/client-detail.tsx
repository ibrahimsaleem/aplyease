import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { NavigationHeader } from "@/components/navigation-header";
import { ResumeGenerator } from "@/components/resume-generator";
import { BaseLatexGenerator } from "@/components/base-latex-generator";
import { ResumeProfilesManager } from "@/components/resume-profiles-manager";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Copy, ExternalLink, ArrowLeft, Eye, EyeOff } from "lucide-react";
import type { ClientProfile, ClientStats } from "@/types";

export default function ClientDetail() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, params] = useRoute("/clients/:clientId");
  const [, setLocation] = useLocation();
  const clientId = params?.clientId;
  const [showFullLatex, setShowFullLatex] = useState(false);

  // Mutation to save base LaTeX to profile (using dedicated endpoint)
  const saveLatexMutation = useMutation({
    mutationFn: async (latex: string) => {
      console.log("[Save LaTeX] Saving to client:", clientId);
      const res = await apiRequest("PUT", `/api/client-profiles/${clientId}/base-latex`, {
        baseResumeLatex: latex,
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to save LaTeX");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-profiles", clientId] });
      toast({
        title: "Saved!",
        description: "Base LaTeX resume saved to client profile",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save LaTeX to profile",
        variant: "destructive",
      });
    },
  });

  const { data: profile, isLoading: profileLoading } = useQuery<ClientProfile>({
    queryKey: ["/api/client-profiles", clientId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/client-profiles/${clientId}`);
      if (res.status === 404) {
        return null;
      }
      return res.json();
    },
    enabled: !!clientId,
  });

  const { data: stats } = useQuery<ClientStats>({
    queryKey: ["/api/stats/client", clientId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/stats/client/${clientId}`);
      return res.json();
    },
    enabled: !!clientId,
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    });
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <NavigationHeader user={user} />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50">
        <NavigationHeader user={user} />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Profile Not Found</CardTitle>
              <CardDescription>
                This client hasn't completed their profile yet.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavigationHeader user={user} />
      
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8 pb-20 sm:pb-8">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          className="mb-4 min-h-[44px]"
          onClick={() => setLocation("/clients")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Back to Clients</span>
          <span className="sm:hidden">Back</span>
        </Button>

        {/* Client Header */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">{profile.fullName}</h1>
              <p className="text-sm sm:text-base text-slate-600 truncate">{profile.user?.email}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                onClick={() => setLocation("/")}
                className="w-full sm:w-auto min-h-[44px]"
                size="sm"
              >
                Apply for Client
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation(`/profile?clientId=${clientId}`)}
                className="w-full sm:w-auto min-h-[44px]"
                size="sm"
              >
                Edit Profile
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-4 sm:mt-6">
              <div className="bg-slate-50 p-3 sm:p-4 rounded-lg">
                <p className="text-xs sm:text-sm text-slate-600">Total Applications</p>
                <p className="text-xl sm:text-2xl font-bold">{stats.totalApplications}</p>
              </div>
              <div className="bg-slate-50 p-3 sm:p-4 rounded-lg">
                <p className="text-xs sm:text-sm text-slate-600">In Progress</p>
                <p className="text-xl sm:text-2xl font-bold">{stats.inProgress}</p>
              </div>
              <div className="bg-slate-50 p-3 sm:p-4 rounded-lg">
                <p className="text-xs sm:text-sm text-slate-600">Interviews</p>
                <p className="text-xl sm:text-2xl font-bold">{stats.interviews}</p>
              </div>
              <div className="bg-slate-50 p-3 sm:p-4 rounded-lg">
                <p className="text-xs sm:text-sm text-slate-600">Hired</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">{stats.hired}</p>
              </div>
            </div>
          )}
        </div>

        {/* Client Details */}
        <Accordion type="multiple" defaultValue={["basic", "job", "location"]} className="bg-white rounded-lg shadow p-4 sm:p-6">
          <AccordionItem value="basic">
            <AccordionTrigger className="text-base sm:text-lg">Basic Information</AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-slate-600">Phone Number</p>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{profile.phoneNumber}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(profile.phoneNumber, "Phone number")}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-600">Mailing Address</p>
                <p className="font-medium">{profile.mailingAddress}</p>
              </div>

              {profile.contactEmail && (
                <div>
                  <p className="text-sm text-slate-600">Application Email</p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{profile.contactEmail}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(profile.contactEmail!, "Email")}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {profile.contactPassword && (
                <div>
                  <p className="text-sm text-slate-600">Application Password</p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium font-mono">••••••••</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(profile.contactPassword!, "Password")}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Work Authorization */}
          <Card>
            <CardHeader>
              <CardTitle>Work Authorization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-slate-600">Status</p>
                <p className="font-medium">{profile.workAuthorization}</p>
              </div>

              <div>
                <p className="text-sm text-slate-600">Sponsorship Answer</p>
                <Badge variant={profile.sponsorshipAnswer.toLowerCase().includes('no') ? 'default' : 'secondary'}>
                  {profile.sponsorshipAnswer}
                </Badge>
              </div>

              <div>
                <p className="text-sm text-slate-600">Current Situation</p>
                <p className="font-medium">{profile.situation}</p>
              </div>
            </CardContent>
          </Card>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="job">
            <AccordionTrigger className="text-base sm:text-lg">Job Preferences</AccordionTrigger>
            <AccordionContent>

          {/* Job Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Job Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-slate-600">Desired Titles</p>
                <p className="font-medium">{profile.desiredTitles}</p>
              </div>

              {profile.targetCompanies && (
                <div>
                  <p className="text-sm text-slate-600">Target Companies/Industries</p>
                  <p className="font-medium">{profile.targetCompanies}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-slate-600">Application Quota</p>
                <p className="font-medium">{profile.applicationQuota} applications</p>
              </div>

              {profile.startDate && (
                <div>
                  <p className="text-sm text-slate-600">Start Date</p>
                  <p className="font-medium">{new Date(profile.startDate).toLocaleDateString()}</p>
                </div>
              )}
            </CardContent>
          </Card>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="location">
            <AccordionTrigger className="text-base sm:text-lg">Location Preferences</AccordionTrigger>
            <AccordionContent>

          {/* Location Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Location Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-slate-600">Search Scope</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {profile.searchScope.map((scope) => (
                    <Badge key={scope} variant="outline">{scope}</Badge>
                  ))}
                </div>
              </div>

              {profile.states.length > 0 && (
                <div>
                  <p className="text-sm text-slate-600">States</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {profile.states.map((state) => (
                      <Badge key={state} variant="secondary">{state}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {profile.cities.length > 0 && (
                <div>
                  <p className="text-sm text-slate-600">Cities</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {profile.cities.map((city) => (
                      <Badge key={city} variant="secondary">{city}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="services">
            <AccordionTrigger className="text-base sm:text-lg">Requested Services</AccordionTrigger>
            <AccordionContent>

          {/* Services */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Requested Services</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {profile.servicesRequested.map((service) => (
                  <Badge key={service} variant="default">{service}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="documents">
            <AccordionTrigger className="text-base sm:text-lg">Documents & Links</AccordionTrigger>
            <AccordionContent>

          {/* Documents */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Documents & Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile.resumeUrl && (
                <div>
                  <p className="text-sm text-slate-600">Resume URL</p>
                  <div className="flex items-center gap-2">
                    <a 
                      href={profile.resumeUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-medium"
                    >
                      {profile.resumeUrl}
                    </a>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(profile.resumeUrl, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(profile.resumeUrl!, "Resume URL")}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {profile.linkedinUrl && (
                <div>
                  <p className="text-sm text-slate-600">LinkedIn Profile</p>
                  <div className="flex items-center gap-2">
                    <a 
                      href={profile.linkedinUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-medium"
                    >
                      {profile.linkedinUrl}
                    </a>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(profile.linkedinUrl, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(profile.linkedinUrl!, "LinkedIn URL")}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
            </AccordionContent>
          </AccordionItem>

          {/* Additional Notes */}
          {profile.additionalNotes && (
            <AccordionItem value="additionalNotes">
              <AccordionTrigger className="text-base sm:text-lg">Additional Notes</AccordionTrigger>
              <AccordionContent>
                <p className="text-slate-700 whitespace-pre-wrap">{profile.additionalNotes}</p>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>

        {/* Resume + AI Tools (separate from client details) */}
        <div className="mt-6">
          <div className="text-sm font-semibold text-slate-700 mb-2">Resume & AI Tools</div>
          <Accordion type="multiple" defaultValue={[]} className="bg-white rounded-lg shadow p-4 sm:p-6">
            <AccordionItem value="resumeTemplates">
              <AccordionTrigger className="text-base sm:text-lg">Resume Templates</AccordionTrigger>
              <AccordionContent>
                {/* Base Resume LaTeX */}
                {profile.baseResumeLatex && (
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Base Resume LaTeX Code</CardTitle>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowFullLatex(!showFullLatex)}
                          >
                            {showFullLatex ? (
                              <>
                                <EyeOff className="w-4 h-4 mr-2" />
                                Show Less
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4 mr-2" />
                                Show Full Code
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => copyToClipboard(profile.baseResumeLatex!, "LaTeX code")}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Copy Code
                          </Button>
                        </div>
                      </div>
                      <CardDescription>
                        This is the client's LaTeX resume template
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto max-h-96 overflow-y-auto">
                        <code className="text-sm font-mono">
                          {showFullLatex
                            ? profile.baseResumeLatex
                            : profile.baseResumeLatex.split('\n').slice(0, 20).join('\n') + '\n\n... (click \"Show Full Code\" to see more)'}
                        </code>
                      </pre>
                    </CardContent>
                  </Card>
                )}

                {/* Resume Profiles (multiple base resumes) */}
                <ResumeProfilesManager
                  clientId={clientId!}
                  legacyBaseResumeLatex={profile.baseResumeLatex ?? null}
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="aiTools">
              <AccordionTrigger className="text-base sm:text-lg">AI Tools</AccordionTrigger>
              <AccordionContent>
                {/* Base LaTeX Generator - For EMPLOYEE/ADMIN to create or update base resume */}
                {(user.role === "EMPLOYEE" || user.role === "ADMIN") && (
                  <BaseLatexGenerator
                    clientId={clientId!}
                    userHasApiKey={!!user.geminiApiKey}
                    existingLatex={profile.baseResumeLatex || undefined}
                    onSaveToProfile={(latex) => saveLatexMutation.mutate(latex)}
                  />
                )}

                {/* AI Resume Generator */}
                {(user.role === "EMPLOYEE" || user.role === "ADMIN") && (
                  <ResumeGenerator
                    clientId={clientId!}
                    hasBaseResume={!!profile.baseResumeLatex}
                    userHasApiKey={!!user.geminiApiKey}
                    resumeCredits={undefined}
                    userRole={user.role}
                  />
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </div>
  );
}

