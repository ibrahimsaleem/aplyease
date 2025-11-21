import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Sparkles, Copy, AlertCircle, History, RefreshCw, Eye } from "lucide-react";
import { ResumeEvaluationDisplay } from "./resume-evaluation-display";
import type { ResumeEvaluation, OptimizationIteration } from "@/types";

interface ResumeGeneratorProps {
  clientId: string;
  hasBaseResume: boolean;
  userHasApiKey: boolean;
}

export function ResumeGenerator({ clientId, hasBaseResume, userHasApiKey }: ResumeGeneratorProps) {
  const { toast } = useToast();
  const [jobDescription, setJobDescription] = useState("");
  const [currentLatex, setCurrentLatex] = useState("");
  const [evaluationResult, setEvaluationResult] = useState<ResumeEvaluation | null>(null);
  const [iterationCount, setIterationCount] = useState(0);
  const [optimizationHistory, setOptimizationHistory] = useState<OptimizationIteration[]>([]);
  const [showLatexDialog, setShowLatexDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentModelUsed, setCurrentModelUsed] = useState<string>("");
  const maxIterations = 10;

  // Generate initial resume (Agent 1: Tailor)
  const generateResume = useMutation({
    mutationFn: async (jobDesc: string) => {
      const response = await apiRequest("POST", `/api/generate-resume/${clientId}`, {
        jobDescription: jobDesc,
      });
      return response.json();
    },
    onSuccess: async (data) => {
      setCurrentLatex(data.latex);
      setCurrentModelUsed(data.modelUsed || "");
      setIterationCount(1);
      toast({
        title: "Resume Generated!",
        description: data.modelUsed ? `Using ${data.modelUsed} - Evaluating resume quality...` : "Evaluating resume quality...",
      });
      // Auto-evaluate the generated resume
      await evaluateResume(data.latex, jobDescription);
    },
    onError: (error: any) => {
      setIsProcessing(false);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate resume",
        variant: "destructive",
      });
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
      if (evaluation.modelUsed) {
        setCurrentModelUsed(evaluation.modelUsed);
      }
      setIsProcessing(false);
      
      // Add to history
      const newIteration: OptimizationIteration = {
        iteration: iterationCount,
        score: evaluation.score,
        latex: currentLatex,
        evaluation,
        timestamp: new Date().toISOString(),
        modelUsed: evaluation.modelUsed || currentModelUsed,
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
      setCurrentModelUsed(data.modelUsed || "");
      setIterationCount(prev => prev + 1);
      toast({
        title: "Resume Optimized!",
        description: data.modelUsed ? `Using ${data.modelUsed} - Re-evaluating improved resume...` : "Re-evaluating improved resume...",
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

  return (
    <>
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <CardTitle>AI Resume Agent System</CardTitle>
          </div>
          <CardDescription>
            Paste a job description to generate and iteratively optimize a tailored LaTeX resume for this client
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!userHasApiKey && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please configure your Gemini API key in settings to use this feature
              </AlertDescription>
            </Alert>
          )}

          {!hasBaseResume && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Client hasn't uploaded a LaTeX resume template yet
              </AlertDescription>
            </Alert>
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
              disabled={!userHasApiKey || !hasBaseResume || isProcessing}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleGenerate}
              disabled={isProcessing || !userHasApiKey || !hasBaseResume}
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
              <div className="text-center text-sm text-slate-600 space-y-1">
                <div>
                  Iteration {iterationCount} of {maxIterations} maximum
                  {evaluationResult.score >= 90 && (
                    <span className="text-green-600 font-semibold ml-2">
                      ✓ Target score achieved!
                    </span>
                  )}
                </div>
                {currentModelUsed && (
                  <div className="text-xs text-slate-500">
                    AI Model: <span className="font-mono font-semibold text-slate-700">{currentModelUsed}</span>
                  </div>
                )}
              </div>
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
              {currentModelUsed && (
                <span className="block mt-1 text-xs text-slate-500">
                  AI Model: <span className="font-mono font-semibold">{currentModelUsed}</span>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 min-h-0 space-y-4">
            <div className="relative h-full">
              <div className="bg-slate-900 text-slate-100 p-4 rounded-lg h-[60vh] overflow-auto">
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
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{new Date(iteration.timestamp).toLocaleString()}</span>
                        {iteration.modelUsed && (
                          <>
                            <span>•</span>
                            <span>Model: <span className="font-mono font-semibold text-slate-700">{iteration.modelUsed}</span></span>
                          </>
                        )}
                      </div>
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
    </>
  );
}
