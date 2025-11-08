import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Copy, ExternalLink, Pencil } from "lucide-react";
import type { ClientProfile, ClientStats } from "@/types";

interface ClientProfileViewProps {
  profile: ClientProfile;
  stats?: ClientStats;
  isOwnProfile: boolean;
  onEditClick: () => void;
}

export function ClientProfileView({ profile, stats, isOwnProfile, onEditClick }: ClientProfileViewProps) {
  const { toast } = useToast();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{profile.fullName}</h1>
            <p className="text-slate-600">{profile.user?.email}</p>
          </div>
          {isOwnProfile && (
            <Button onClick={onEditClick} variant="outline">
              <Pencil className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>

        {/* Quick Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm text-slate-600">Applications Left</p>
              <p className="text-2xl font-bold">{stats.applicationsRemaining ?? 0}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm text-slate-600">Total Applications</p>
              <p className="text-2xl font-bold">{stats.totalApplications}</p>
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
                This is your LaTeX resume template
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto">
                <code className="text-sm font-mono">{profile.baseResumeLatex}</code>
              </pre>
            </CardContent>
          </Card>
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
  );
}

