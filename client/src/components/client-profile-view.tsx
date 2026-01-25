import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Copy, ExternalLink, Pencil, Eye, EyeOff, DollarSign, Sparkles, Key, Loader2, Info, Zap, Target, TrendingUp, FileText, CheckCircle2 } from "lucide-react";
import { ResumeGenerator } from "@/components/resume-generator";
import { BaseLatexGenerator } from "@/components/base-latex-generator";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { ClientProfile, ClientStats } from "@/types";

// Helper function to format cents to dollars
const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
};

interface ClientProfileViewProps {
  profile: ClientProfile;
  stats?: ClientStats;
  isOwnProfile: boolean;
  onEditClick: () => void;
}

export function ClientProfileView({ profile, stats, isOwnProfile, onEditClick }: ClientProfileViewProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showFullLatex, setShowFullLatex] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState(user?.geminiApiKey || "");
  const [preferredModel, setPreferredModel] = useState((user as any)?.preferredGeminiModel || "gemini-1.5-flash");
  const [showApiKey, setShowApiKey] = useState(false);

  const saveGeminiSettings = useMutation({
    mutationFn: async (data: { apiKey: string; preferredModel: string }) => {
      const response = await apiRequest("PUT", `/api/users/${user?.id}/gemini-key`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Gemini settings saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    });
  };

  // Mutation to save base LaTeX to profile (using dedicated endpoint)
  const saveLatexMutation = useMutation({
    mutationFn: async (latex: string) => {
      console.log("[Save LaTeX] Saving to client:", profile.userId);
      const res = await apiRequest("PUT", `/api/client-profiles/${profile.userId}/base-latex`, {
        baseResumeLatex: latex,
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to save LaTeX");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-profiles", profile.userId] });
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

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 break-words">{profile.fullName}</h1>
            <p className="text-sm sm:text-base text-slate-600 break-all">{profile.user?.email}</p>
          </div>
          {isOwnProfile && (
            <Button onClick={onEditClick} variant="outline" className="w-full sm:w-auto min-h-[44px]">
              <Pencil className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>

        {/* Quick Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mt-4 sm:mt-6">
            <div className="bg-purple-50 p-3 sm:p-4 rounded-lg border border-purple-200">
              <p className="text-xs sm:text-sm text-purple-600 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Resume Credits
              </p>
              <p className="text-xl sm:text-2xl font-bold text-purple-700">{user?.resumeCredits ?? 0}</p>
            </div>
            <div className="bg-slate-50 p-3 sm:p-4 rounded-lg">
              <p className="text-xs sm:text-sm text-slate-600">Applications Left</p>
              <p className="text-xl sm:text-2xl font-bold">{stats.applicationsRemaining ?? 0}</p>
            </div>
            <div className="bg-slate-50 p-3 sm:p-4 rounded-lg">
              <p className="text-xs sm:text-sm text-slate-600">Total Applications</p>
              <p className="text-xl sm:text-2xl font-bold">{stats.totalApplications}</p>
            </div>
            <div className="bg-slate-50 p-3 sm:p-4 rounded-lg">
              <p className="text-xs sm:text-sm text-slate-600">Interviews</p>
              <p className="text-xl sm:text-2xl font-bold">{stats.interviews}</p>
            </div>
            <div className="bg-slate-50 p-3 sm:p-4 rounded-lg">
              <p className="text-xs sm:text-sm text-slate-600">Hired</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600">{stats.hired}</p>
            </div>
            <div className="bg-emerald-50 p-3 sm:p-4 rounded-lg border border-emerald-200">
              <p className="text-xs sm:text-sm text-emerald-600 flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                Amount Paid
              </p>
              <p className="text-xl sm:text-2xl font-bold text-emerald-700">{formatCurrency(stats.amountPaid ?? 0)}</p>
            </div>
            <div className="bg-amber-50 p-3 sm:p-4 rounded-lg border border-amber-200">
              <p className="text-xs sm:text-sm text-amber-600 flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                Amount Due
              </p>
              <p className={`text-xl sm:text-2xl font-bold ${(stats.amountDue ?? 0) > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                {formatCurrency(stats.amountDue ?? 0)}
              </p>
            </div>
          </div>
        )}
      </div>

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
                This is your LaTeX resume template
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto max-h-96 overflow-y-auto">
                <code className="text-sm font-mono">
                  {showFullLatex 
                    ? profile.baseResumeLatex 
                    : profile.baseResumeLatex.split('\n').slice(0, 20).join('\n') + '\n\n... (click "Show Full Code" to see more)'}
                </code>
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Gemini API Key Configuration */}
        {isOwnProfile && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-600" />
                <CardTitle>AI Resume Generator Configuration</CardTitle>
              </div>
              <CardDescription>
                Configure your Gemini API key and preferred AI model for resume generation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="preferredModel" className="text-sm font-medium mb-2 block">
                  Preferred AI Model
                </Label>
                <Select value={preferredModel} onValueChange={setPreferredModel}>
                  <SelectTrigger id="preferredModel">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini-3-pro-preview">Gemini 3 Pro Preview (Most Powerful)</SelectItem>
                    <SelectItem value="gemini-3-flash-preview">Gemini 3 Flash Preview (Fastest Intelligent)</SelectItem>
                    <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro (Advanced Thinking)</SelectItem>
                    <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash (Best Price-Performance)</SelectItem>
                    <SelectItem value="gemini-2.5-flash-lite">Gemini 2.5 Flash-Lite (Cost-Efficient)</SelectItem>
                    <SelectItem value="gemini-2.0-flash">Gemini 2.0 Flash (Next-Gen Workhorse)</SelectItem>
                    <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro (High Intelligence)</SelectItem>
                    <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash (Balanced)</SelectItem>
                    <SelectItem value="gemini-1.0-pro">Gemini 1.0 Pro (Legacy Stable)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-1">
                  Higher models are more capable but may have stricter rate limits.
                </p>
              </div>

              <div>
                <Label htmlFor="apiKey" className="text-sm font-medium mb-2 block">
                  Gemini API Key
                </Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <Input
                      id="apiKey"
                      type={showApiKey ? "text" : "password"}
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      placeholder="Enter your Gemini API key"
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      onClick={() => saveGeminiSettings.mutate({ apiKey: geminiApiKey, preferredModel })}
                      disabled={saveGeminiSettings.isPending || !geminiApiKey}
                      size="sm"
                    >
                      {saveGeminiSettings.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Save Settings
                    </Button>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-500">
                Get your free API key from{" "}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Google AI Studio
                </a>
              </p>
            </CardContent>
          </Card>
        )}

        {/* AI Resume Tailoring Tool Section */}
        {isOwnProfile && (
          <>
            {/* Section Divider */}
            <div className="lg:col-span-2 my-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-2 border-purple-200"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-slate-50 px-6 py-2 rounded-full border-2 border-purple-200">
                    <div className="flex items-center gap-2 text-purple-700 font-semibold">
                      <Sparkles className="w-5 h-5" />
                      <span>AI Resume Tailoring Tool</span>
                    </div>
                  </span>
                </div>
              </div>
            </div>

            {/* Tool Description Card */}
            <Card className="lg:col-span-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-purple-600" />
                  <CardTitle className="text-purple-900">What is the AI Resume Tailoring Tool?</CardTitle>
                </div>
                <CardDescription>
                  An intelligent system that optimizes your resume for specific job descriptions using advanced AI
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-purple-600" />
                      How It Works
                    </h4>
                    <ol className="space-y-2 text-sm text-slate-700">
                      <li className="flex items-start gap-2">
                        <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 bg-purple-600 text-white rounded-full text-xs font-bold">1</span>
                        <span>Paste a job description</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 bg-purple-600 text-white rounded-full text-xs font-bold">2</span>
                        <span>AI analyzes requirements and tailors your resume</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 bg-purple-600 text-white rounded-full text-xs font-bold">3</span>
                        <span>Receive an ATS-optimized score (0-100)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 bg-purple-600 text-white rounded-full text-xs font-bold">4</span>
                        <span>Iterate to improve the score further</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 bg-purple-600 text-white rounded-full text-xs font-bold">5</span>
                        <span>Copy LaTeX code to Overleaf and create PDF</span>
                      </li>
                    </ol>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                      <Target className="w-4 h-4 text-purple-600" />
                      Key Features
                    </h4>
                    <ul className="space-y-2 text-sm text-slate-700">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Tailors resume content to match job requirements</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Optimizes for Applicant Tracking Systems (ATS)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Provides detailed feedback and improvement suggestions</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Iterative optimization for best results</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Professional LaTeX formatting</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="bg-purple-100 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-purple-700 flex-shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-semibold text-purple-900 mb-1">Credits System</h5>
                      <p className="text-sm text-purple-800">
                        Each resume generation uses <strong>1 credit</strong>. You have <strong>{user?.resumeCredits ?? 0} credits</strong> remaining. 
                        Evaluating and optimizing your resume after generation does not use additional credits.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Base LaTeX Generator - For EMPLOYEE/ADMIN to create or update base resume */}
            {(user?.role === "EMPLOYEE" || user?.role === "ADMIN") && (
              <BaseLatexGenerator
                clientId={profile.userId}
                userHasApiKey={!!user?.geminiApiKey}
                existingLatex={profile.baseResumeLatex || undefined}
                onSaveToProfile={(latex) => saveLatexMutation.mutate(latex)}
              />
            )}

            {/* AI Resume Generator */}
            <ResumeGenerator
              clientId={user?.id!}
              hasBaseResume={!!profile.baseResumeLatex}
              userHasApiKey={!!user?.geminiApiKey}
              resumeCredits={user?.resumeCredits}
              userRole={user?.role}
            />
          </>
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

