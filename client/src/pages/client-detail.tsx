import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NavigationHeader } from "@/components/navigation-header";
import { ResumeGenerator } from "@/components/resume-generator";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Copy, ExternalLink, ArrowLeft } from "lucide-react";
import type { ClientProfile, ClientStats } from "@/types";

export default function ClientDetail() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, params] = useRoute("/clients/:clientId");
  const [, setLocation] = useLocation();
  const clientId = params?.clientId;

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
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          className="mb-4"
          onClick={() => setLocation("/clients")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Clients
        </Button>

        {/* Client Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{profile.fullName}</h1>
              <p className="text-slate-600">{profile.user?.email}</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setLocation("/")}
              >
                Apply for This Client
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation(`/profile?clientId=${clientId}`)}
              >
                Edit Profile
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm text-slate-600">Total Applications</p>
                <p className="text-2xl font-bold">{stats.totalApplications}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm text-slate-600">In Progress</p>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm text-slate-600">Interviews</p>
                <p className="text-2xl font-bold">{stats.interviews}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm text-slate-600">Hired</p>
                <p className="text-2xl font-bold text-green-600">{stats.hired}</p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

          {/* Base Resume LaTeX */}
          {profile.baseResumeLatex && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Base Resume LaTeX Code</CardTitle>
                  <Button
                    size="sm"
                    onClick={() => copyToClipboard(profile.baseResumeLatex!, "LaTeX code")}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Code
                  </Button>
                </div>
                <CardDescription>
                  This is the client's LaTeX resume template
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto">
                  <code className="text-sm font-mono">{profile.baseResumeLatex}</code>
                </pre>
              </CardContent>
            </Card>
          )}

          {/* AI Resume Generator */}
          {(user.role === "EMPLOYEE" || user.role === "ADMIN") && (
            <ResumeGenerator
              clientId={clientId!}
              hasBaseResume={!!profile.baseResumeLatex}
              userHasApiKey={!!user.geminiApiKey}
            />
          )}

          {/* Additional Notes */}
          {profile.additionalNotes && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Additional Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 whitespace-pre-wrap">{profile.additionalNotes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

