import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Sparkles, Copy, AlertCircle, History, RefreshCw, Eye, ExternalLink, FileText, Play, Lock, Mail, MessageCircle } from "lucide-react";
import { ResumeEvaluationDisplay } from "./resume-evaluation-display";
import type { ResumeEvaluation, OptimizationIteration, ResumeProfile } from "@/types";

interface ResumeGeneratorProps {
  clientId: string;
  hasBaseResume: boolean;
  userHasApiKey: boolean;
  resumeCredits?: number;
  userRole?: string;
}

const CREDIT_PLANS = [
  { name: "Starter", credits: 25, price: 25, perCredit: 1.00 },
  { name: "Basic", credits: 50, price: 40, perCredit: 0.80 },
  { name: "Standard", credits: 100, price: 70, perCredit: 0.70 },
  { name: "Pro", credits: 250, price: 150, perCredit: 0.60 },
  { name: "Unlimited", credits: 500, price: 250, perCredit: 0.50 },
];

export function ResumeGenerator({ clientId, hasBaseResume, userHasApiKey, resumeCredits, userRole }: ResumeGeneratorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [jobDescription, setJobDescription] = useState("");
  const [currentLatex, setCurrentLatex] = useState("");
  const [evaluationResult, setEvaluationResult] = useState<ResumeEvaluation | null>(null);
  const [iterationCount, setIterationCount] = useState(0);
  const [optimizationHistory, setOptimizationHistory] = useState<OptimizationIteration[]>([]);
  const [showLatexDialog, setShowLatexDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showCreditsDialog, setShowCreditsDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const maxIterations = 10;

  const { data: resumeProfiles = [] } = useQuery<ResumeProfile[]>({
    queryKey: ["/api/resume-profiles", clientId],
    enabled: !!clientId,
  });

  const defaultProfile = useMemo(
    () => resumeProfiles.find((p) => p.isDefault) ?? resumeProfiles[0] ?? null,
    [resumeProfiles]
  );

  const [selectedProfileId, setSelectedProfileId] = useState<string>("");

  useEffect(() => {
    if (!selectedProfileId && defaultProfile?.id) {
      setSelectedProfileId(defaultProfile.id);
    }
  }, [defaultProfile?.id, selectedProfileId]);

  const effectiveHasBaseResume = hasBaseResume || resumeProfiles.length > 0;

  // Generate initial resume (Agent 1: Tailor)
  const generateResume = useMutation({
    mutationFn: async (jobDesc: string) => {
      const response = await apiRequest("POST", `/api/generate-resume/${clientId}`, {
        jobDescription: jobDesc,
        ...(selectedProfileId ? { resumeProfileId: selectedProfileId } : {}),
      });
      if (response.status === 402) {
        const errorData = await response.json();
        throw { status: 402, ...errorData };
      }
      return response.json();
    },
    onSuccess: async (data) => {
      setCurrentLatex(data.latex);
      setIterationCount(1);
      // Immediately invalidate and refetch user query to refresh credits
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Resume Generated!",
        description: "Evaluating resume quality...",
      });
      // Auto-evaluate the generated resume
      await evaluateResume(data.latex, jobDescription);
    },
    onError: (error: any) => {
      setIsProcessing(false);
      if (error.status === 402) {
        setShowCreditsDialog(true);
      } else {
        toast({
          title: "Generation Failed",
          description: error.message || "Failed to generate resume",
          variant: "destructive",
        });
      }
    },
  });

  // Evaluate resume (Agent 2: Evaluate)
  const evaluateResumeMutation = useMutation({
    mutationFn: async ({ latex, jobDesc }: { latex: string; jobDesc: string }) => {
      const response = await apiRequest("POST", `/api/evaluate-resume/${clientId}`, {
        latex,
        jobDescription: jobDesc,
      });
      return response.json();
    },
    onSuccess: (evaluation: ResumeEvaluation) => {
      setEvaluationResult(evaluation);
      setIsProcessing(false);
      
      // Add to history
      const newIteration: OptimizationIteration = {
        iteration: iterationCount,
        score: evaluation.score,
        latex: currentLatex,
        evaluation,
        timestamp: new Date().toISOString(),
      };
      setOptimizationHistory(prev => [...prev, newIteration]);

      toast({
        title: "Evaluation Complete",
        description: `Score: ${evaluation.score}/100`,
      });
    },
    onError: (error: any) => {
      setIsProcessing(false);
      toast({
        title: "Evaluation Failed",
        description: error.message || "Failed to evaluate resume",
        variant: "destructive",
      });
    },
  });

  // Optimize resume (Agent 3: Optimize)
  const optimizeResumeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/optimize-resume/${clientId}`, {
        latex: currentLatex,
        jobDescription,
        previousFeedback: evaluationResult,
      });
      return response.json();
    },
    onSuccess: async (data) => {
      setCurrentLatex(data.latex);
      setIterationCount(prev => prev + 1);
      toast({
        title: "Resume Optimized!",
        description: "Re-evaluating improved resume...",
      });
      // Auto-evaluate the optimized resume
      await evaluateResume(data.latex, jobDescription);
    },
    onError: (error: any) => {
      setIsProcessing(false);
      toast({
        title: "Optimization Failed",
        description: error.message || "Failed to optimize resume",
        variant: "destructive",
      });
    },
  });

  // Helper function to evaluate resume
  const evaluateResume = async (latex: string, jobDesc: string) => {
    await evaluateResumeMutation.mutateAsync({ latex, jobDesc });
  };

  // Handle initial generation
  const handleGenerate = () => {
    if (!jobDescription.trim()) {
      toast({
        title: "Job Description Required",
        description: "Please paste a job description first",
        variant: "destructive",
      });
      return;
    }

    // Reset state
    setCurrentLatex("");
    setEvaluationResult(null);
    setIterationCount(0);
    setOptimizationHistory([]);
    setIsProcessing(true);

    generateResume.mutate(jobDescription);
  };

  // Handle optimization
  const handleOptimize = () => {
    if (iterationCount >= maxIterations) {
      toast({
        title: "Maximum Iterations Reached",
        description: `You've reached the maximum of ${maxIterations} optimization attempts.`,
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    optimizeResumeMutation.mutate();
  };

  // Copy to clipboard
  const copyToClipboard = (latex?: string) => {
    const textToCopy = latex || currentLatex;
    navigator.clipboard.writeText(textToCopy);
    toast({
      title: "Copied!",
      description: "LaTeX code copied to clipboard",
    });
  };

  // Load iteration from history
  const loadIteration = (iteration: OptimizationIteration) => {
    setCurrentLatex(iteration.latex);
    setEvaluationResult(iteration.evaluation);
    setIterationCount(iteration.iteration);
    setShowHistoryDialog(false);
    toast({
      title: "Iteration Loaded",
      description: `Loaded iteration ${iteration.iteration} with score ${iteration.score}/100`,
    });
  };

  const hasResults = currentLatex && evaluationResult;
  const canOptimize = hasResults && iterationCount < maxIterations && !isProcessing;
  const isLocked = userRole === "CLIENT" && (resumeCredits === 0 || resumeCredits === undefined);

  return (
    <>
      <Card className="lg:col-span-2 relative">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <CardTitle>AI Resume Agent System</CardTitle>
          </div>
          <CardDescription>
            Paste a job description to generate and iteratively optimize a tailored LaTeX resume for this client
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 relative">
          {/* Locked Overlay when credits are exhausted */}
          {isLocked && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-center rounded-b-lg">
              <div className="text-center p-8 max-w-md">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
                  <Lock className="w-10 h-10 text-red-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">
                  Your Resume Tailoring AI Credits Are Over
                </h3>
                <Badge variant="destructive" className="mb-4 text-base py-1 px-3">
                  0 Credits Remaining
                </Badge>
                <p className="text-slate-600 mb-6">
                  Purchase more credits to continue using the AI Resume Generator and create tailored resumes for your job applications.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                    onClick={() => setShowCreditsDialog(true)}
                    className="bg-purple-600 hover:bg-purple-700"
                    size="lg"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    View Plans
                  </Button>
                  <Button 
                    onClick={() => window.open("https://wa.me/17138537974?text=Hi!%20I%20need%20to%20purchase%20resume%20credits%20for%20my%20account.", "_blank")}
                    className="bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    WhatsApp Admin
                  </Button>
                  <Button 
                    onClick={() => window.location.href = "mailto:support@aplyease.com?subject=Resume Credits Request"}
                    variant="outline"
                    size="lg"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Email Admin
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {!userHasApiKey && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please configure your Gemini API key in settings to use this feature
              </AlertDescription>
            </Alert>
          )}

          {!effectiveHasBaseResume && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Client hasn't uploaded a LaTeX resume template yet
              </AlertDescription>
            </Alert>
          )}

          {/* Base Resume Profile Selector */}
          {resumeProfiles.length > 0 && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Base Resume Profile
              </label>
              <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                <SelectTrigger disabled={!userHasApiKey || isProcessing || isLocked}>
                  <SelectValue placeholder="Select a base resume profile" />
                </SelectTrigger>
                <SelectContent>
                  {resumeProfiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}{p.isDefault ? " (Default)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">
                The selected profile’s base LaTeX will be used for tailoring.
              </p>
            </div>
          )}

          {/* Job Description Input */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Job Description
            </label>
            <Textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job description here..."
              className="min-h-[200px] font-mono text-sm"
              disabled={!userHasApiKey || !effectiveHasBaseResume || isProcessing || isLocked}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleGenerate}
              disabled={isProcessing || !userHasApiKey || !effectiveHasBaseResume || isLocked}
              className="flex-1"
              size="lg"
            >
              {isProcessing && !hasResults ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating & Evaluating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Tailored Resume
                </>
              )}
            </Button>

            {optimizationHistory.length > 0 && (
              <Button
                onClick={() => setShowHistoryDialog(true)}
                variant="outline"
                size="lg"
                disabled={isProcessing}
              >
                <History className="w-4 h-4 mr-2" />
                History ({optimizationHistory.length})
              </Button>
            )}
          </div>

          {/* Evaluation Results */}
          {hasResults && (
            <div className="space-y-4">
              <ResumeEvaluationDisplay 
                evaluation={evaluationResult} 
                iterationCount={iterationCount}
              />

              {/* Action Buttons for Results */}
              <div className="flex gap-2">
                {canOptimize && (
                  <Button
                    onClick={handleOptimize}
                    disabled={isProcessing}
                    className="flex-1 bg-orange-600 hover:bg-orange-700"
                    size="lg"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Optimizing & Re-evaluating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Optimize Again
                      </>
                    )}
                  </Button>
                )}

                <Button
                  onClick={() => setShowLatexDialog(true)}
                  variant="outline"
                  size="lg"
                  disabled={isProcessing}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View LaTeX
                </Button>

                <Button
                  onClick={() => copyToClipboard()}
                  variant="default"
                  size="lg"
                  disabled={isProcessing}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Code
                </Button>
              </div>

              {/* Progress Info */}
              <div className="text-center text-sm text-slate-600">
                Iteration {iterationCount} of {maxIterations} maximum
                {evaluationResult.score >= 90 && (
                  <span className="text-green-600 font-semibold ml-2">
                    ✓ Target score achieved!
                  </span>
                )}
              </div>

              {/* Quick Next Steps */}
              <Alert className="bg-green-50 border-green-200">
                <Sparkles className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  <p className="font-semibold text-green-900 mb-1">✨ Resume Ready!</p>
                  <p className="text-sm text-green-800">
                    Click "View LaTeX" or "Copy Code" above, then paste into{" "}
                    <a 
                      href="https://www.overleaf.com/login" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="underline font-medium hover:text-green-600"
                    >
                      Overleaf
                    </a>
                    {" "}to create your PDF.
                  </p>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>

      {/* LaTeX Code Dialog */}
      <Dialog open={showLatexDialog} onOpenChange={setShowLatexDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Generated Resume (Iteration {iterationCount})</DialogTitle>
            <DialogDescription>
              Score: {evaluationResult?.score}/100 - Your AI-tailored LaTeX resume
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 min-h-0 space-y-4">
            {/* How to Use Instructions */}
            <Alert className="bg-blue-50 border-blue-200">
              <FileText className="h-4 w-4 text-blue-600" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold text-blue-900">📝 How to Create Your Resume PDF:</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                    <li>Click "Copy Code" button above to copy the LaTeX code</li>
                    <li>Go to <a href="https://www.overleaf.com/login" target="_blank" rel="noopener noreferrer" className="underline font-medium hover:text-blue-600">Overleaf.com</a> and log in (it's free!)</li>
                    <li>Click "New Project" → "Blank Project"</li>
                    <li>Delete the default content and paste your copied LaTeX code</li>
                    <li>Click the green "Recompile" button to generate your PDF</li>
                    <li>Download your professional resume!</li>
                  </ol>
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-blue-700 border-blue-300 hover:bg-blue-100"
                      onClick={() => window.open("https://www.overleaf.com/login", "_blank")}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Open Overleaf
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-blue-700 border-blue-300 hover:bg-blue-100"
                      onClick={() => window.open("https://www.youtube.com/watch?v=4Y7MG70vZlA", "_blank")}
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Watch Tutorial
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            <div className="relative h-full">
              <div className="bg-slate-900 text-slate-100 p-4 rounded-lg h-[45vh] overflow-auto">
                <pre className="text-sm font-mono whitespace-pre-wrap break-words">
                  <code>{currentLatex}</code>
                </pre>
              </div>
              <Button
                onClick={() => copyToClipboard()}
                className="absolute top-2 right-2 z-10"
                size="sm"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Code
              </Button>
            </div>
            
            <div className="flex justify-end gap-2 flex-shrink-0">
              <Button onClick={() => setShowLatexDialog(false)} variant="outline">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Optimization History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Optimization History</DialogTitle>
            <DialogDescription>
              View and revert to previous iterations
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 overflow-y-auto max-h-[60vh]">
            {optimizationHistory.map((iteration) => (
              <Card key={iteration.iteration} className="cursor-pointer hover:bg-slate-50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">
                          Iteration {iteration.iteration}
                        </h3>
                        <Badge 
                          className={
                            iteration.score >= 90 
                              ? "bg-green-600" 
                              : iteration.score >= 75 
                              ? "bg-yellow-600" 
                              : "bg-red-600"
                          }
                        >
                          Score: {iteration.score}/100
                        </Badge>
                        {iteration.iteration === iterationCount && (
                          <Badge variant="outline">Current</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mb-2">
                        {iteration.evaluation.overallAssessment}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(iteration.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => copyToClipboard(iteration.latex)}
                        variant="outline"
                        size="sm"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      {iteration.iteration !== iterationCount && (
                        <Button
                          onClick={() => loadIteration(iteration)}
                          variant="default"
                          size="sm"
                        >
                          Load
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="flex justify-end">
            <Button onClick={() => setShowHistoryDialog(false)} variant="outline">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Credits Exhausted Dialog */}
      <Dialog open={showCreditsDialog} onOpenChange={setShowCreditsDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Resume Credits Exhausted</DialogTitle>
            <DialogDescription>
              You've used all your resume generation credits. Purchase more credits to continue using the AI Resume Generator.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {CREDIT_PLANS.map((plan) => (
                <Card key={plan.name} className="relative hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <div className="text-3xl font-bold text-primary">
                      ${plan.price}
                    </div>
                    <p className="text-sm text-slate-600">
                      {plan.credits} resume generations
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-slate-500">
                        ${plan.perCredit.toFixed(2)} per generation
                      </p>
                      <Badge variant="secondary" className="w-full justify-center">
                        {((1 / plan.perCredit) * 100 / 100).toFixed(0)}% value
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>How to purchase:</strong> Contact your administrator via WhatsApp or email to purchase resume credits. 
                They can add credits to your account and process payment.
              </AlertDescription>
            </Alert>
          </div>

          <div className="flex justify-end gap-3">
            <Button 
              onClick={() => window.open("https://wa.me/17138537974?text=Hi!%20I%20want%20to%20purchase%20resume%20credits.", "_blank")}
              className="bg-green-600 hover:bg-green-700"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp Admin
            </Button>
            <Button 
              onClick={() => window.location.href = "mailto:support@aplyease.com?subject=Resume Credits Purchase"}
              variant="outline"
            >
              <Mail className="w-4 h-4 mr-2" />
              Email Admin
            </Button>
            <Button onClick={() => setShowCreditsDialog(false)} variant="outline">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
