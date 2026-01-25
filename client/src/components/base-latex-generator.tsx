import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, FileCode, Copy, AlertCircle, Eye, Save, Sparkles, MessageSquare, RefreshCw, ChevronDown, ChevronUp, Edit } from "lucide-react";

interface BaseLatexGeneratorProps {
  clientId: string;
  userHasApiKey: boolean;
  existingLatex?: string;
  onSaveToProfile?: (latex: string) => void;
}

export function BaseLatexGenerator({ clientId, userHasApiKey, existingLatex, onSaveToProfile }: BaseLatexGeneratorProps) {
  const { toast } = useToast();
  const [plainTextResume, setPlainTextResume] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");
  const [generatedLatex, setGeneratedLatex] = useState("");
  const [showLatexDialog, setShowLatexDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showGenerateSection, setShowGenerateSection] = useState(!existingLatex);

  // Pre-load existing LaTeX if provided
  useEffect(() => {
    if (existingLatex) {
      setGeneratedLatex(existingLatex);
    }
  }, [existingLatex]);

  // Step 1: Generate base LaTeX from plain text (no instructions)
  const generateLatex = useMutation({
    mutationFn: async (plainText: string) => {
      console.log("[Step 1] Generating LaTeX from plain text...");
      const response = await apiRequest("POST", `/api/generate-base-latex/${clientId}`, {
        plainTextResume: plainText,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to generate LaTeX");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedLatex(data.latex);
      setIsProcessing(false);
      setShowGenerateSection(false);
      toast({
        title: "LaTeX Generated!",
        description: "Your resume has been converted to LaTeX. You can now add instructions to refine it.",
      });
    },
    onError: (error: any) => {
      setIsProcessing(false);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate LaTeX",
        variant: "destructive",
      });
    },
  });

  // Step 2: Update/refine LaTeX with custom instructions
  const updateLatex = useMutation({
    mutationFn: async ({ baseLatex, instructions }: { baseLatex: string; instructions: string }) => {
      console.log("[Step 2] Updating LaTeX with instructions...");
      const response = await apiRequest("POST", `/api/update-base-latex/${clientId}`, {
        baseLatex,
        customInstructions: instructions,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update LaTeX");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedLatex(data.latex);
      setIsUpdating(false);
      setCustomInstructions("");
      toast({
        title: "Resume Updated!",
        description: "Your LaTeX resume has been refined based on your instructions.",
      });
    },
    onError: (error: any) => {
      setIsUpdating(false);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update LaTeX",
        variant: "destructive",
      });
    },
  });

  // Handle Step 1: Generate
  const handleGenerate = () => {
    if (!plainTextResume.trim()) {
      toast({
        title: "Resume Required",
        description: "Please paste your plain text resume first",
        variant: "destructive",
      });
      return;
    }

    setGeneratedLatex("");
    setCustomInstructions("");
    setIsProcessing(true);
    generateLatex.mutate(plainTextResume);
  };

  // Handle Step 2: Update with instructions
  const handleUpdate = () => {
    if (!generatedLatex) {
      toast({
        title: "No LaTeX to Update",
        description: "Please generate LaTeX first",
        variant: "destructive",
      });
      return;
    }

    if (!customInstructions.trim()) {
      toast({
        title: "Instructions Required",
        description: "Please add instructions to refine the resume",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    updateLatex.mutate({ baseLatex: generatedLatex, instructions: customInstructions });
  };

  // Copy to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLatex);
    toast({
      title: "Copied!",
      description: "LaTeX code copied to clipboard",
    });
  };

  // Save to profile
  const handleSaveToProfile = () => {
    if (onSaveToProfile && generatedLatex) {
      onSaveToProfile(generatedLatex);
      toast({
        title: "Saved!",
        description: "LaTeX code saved to client profile",
      });
    }
  };

  const isAnyProcessing = isProcessing || isUpdating;
  const hasExistingOrGenerated = !!generatedLatex;

  return (
    <>
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-blue-600" />
            <CardTitle>
              {existingLatex ? "Update Base LaTeX Resume" : "Base LaTeX Resume Generator"}
            </CardTitle>
          </div>
          <CardDescription>
            {existingLatex 
              ? "Update the existing base resume with custom instructions, or generate a new one from plain text."
              : "Two-step process: First generate LaTeX from plain text, then refine with custom instructions."
            }
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

          {/* Step 1: Plain Text Resume Input - Collapsible when existing LaTeX */}
          {existingLatex ? (
            <Collapsible open={showGenerateSection} onOpenChange={setShowGenerateSection}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Generate New Base Resume from Plain Text
                  </span>
                  {showGenerateSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <div className="p-4 border rounded-lg bg-slate-50">
                  <Textarea
                    placeholder={`Paste the client's resume here in plain text format to generate a new base LaTeX...`}
                    value={plainTextResume}
                    onChange={(e) => setPlainTextResume(e.target.value)}
                    className="min-h-[200px] font-mono text-sm bg-white"
                    disabled={isAnyProcessing}
                  />
                  <Button
                    onClick={handleGenerate}
                    disabled={!userHasApiKey || isAnyProcessing || !plainTextResume.trim()}
                    className="mt-3 bg-blue-600 hover:bg-blue-700"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating LaTeX...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate New LaTeX
                      </>
                    )}
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <div className="p-4 border rounded-lg bg-slate-50">
              <div className="flex items-center gap-2 mb-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-sm font-bold">1</span>
                <label className="text-sm font-medium text-slate-700">
                  Paste Plain Text Resume
                </label>
              </div>
              <Textarea
                placeholder={`Paste the client's resume here in plain text format. Example:

John Doe
john.doe@email.com | (555) 123-4567 | linkedin.com/in/johndoe | github.com/johndoe

EDUCATION
University of California, Berkeley
Bachelor of Science in Computer Science | Aug 2019 - May 2023
GPA: 3.8/4.0

EXPERIENCE
Software Engineer Intern | Google | Mountain View, CA | Jun 2022 - Aug 2022
- Developed a microservice using Go and gRPC that improved API response times by 40%
- Implemented unit tests achieving 95% code coverage

PROJECTS
E-commerce Platform | React, Node.js, PostgreSQL | Jan 2023
- Built a full-stack web application with user authentication and payment processing

SKILLS
Languages: Python, JavaScript, Java, Go, SQL
Frameworks: React, Node.js, Express, Django
Tools: Git, Docker, Kubernetes, AWS`}
                value={plainTextResume}
                onChange={(e) => setPlainTextResume(e.target.value)}
                className="min-h-[250px] font-mono text-sm bg-white"
                disabled={isAnyProcessing}
              />
              <Button
                onClick={handleGenerate}
                disabled={!userHasApiKey || isAnyProcessing || !plainTextResume.trim()}
                className="mt-3 bg-blue-600 hover:bg-blue-700"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating LaTeX...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate LaTeX
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Step 2: Custom Instructions - shown when LaTeX exists */}
          {hasExistingOrGenerated && (
            <div className="p-4 border rounded-lg bg-purple-50 border-purple-200">
              <div className="flex items-center gap-2 mb-3">
                <Edit className="w-5 h-5 text-purple-600" />
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-purple-600" />
                  Update Resume with Custom Instructions
                </label>
              </div>
              <Textarea
                placeholder={`Add specific instructions to customize the LaTeX resume. Examples:

• Focus on data science and machine learning skills
• Highlight leadership and management experience
• Emphasize cloud computing and DevOps expertise
• Make the experience section more prominent than education
• Add specific keywords: "Agile", "Scrum", "CI/CD"
• Remove projects section and expand work experience
• Use more technical language for a senior role
• Keep coursework section minimal, focus on work experience`}
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                className="min-h-[120px] text-sm bg-white"
                disabled={isAnyProcessing}
              />
              <p className="text-xs text-slate-500 mt-1 mb-3">
                The AI will refine the {existingLatex ? "existing" : "generated"} LaTeX based on these instructions while keeping it on one page.
              </p>
              <Button
                onClick={handleUpdate}
                disabled={!userHasApiKey || isAnyProcessing || !customInstructions.trim()}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating Resume...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Update Base Resume
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Action Buttons for Generated LaTeX */}
          {hasExistingOrGenerated && (
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowLatexDialog(true)}
                disabled={isAnyProcessing}
              >
                <Eye className="w-4 h-4 mr-2" />
                View LaTeX
              </Button>
              <Button
                variant="outline"
                onClick={copyToClipboard}
                disabled={isAnyProcessing}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Code
              </Button>
              {onSaveToProfile && (
                <Button
                  variant="default"
                  onClick={handleSaveToProfile}
                  disabled={isAnyProcessing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save to Profile
                </Button>
              )}
            </div>
          )}

          {/* Info Message */}
          {hasExistingOrGenerated && (
            <Alert className="bg-green-50 border-green-200">
              <FileCode className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {existingLatex && generatedLatex === existingLatex
                  ? "Current base resume loaded. Add instructions above to update, or save changes to profile."
                  : "LaTeX code ready! Add instructions above to refine, or save directly to the client's profile."
                }
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* LaTeX Preview Dialog */}
      <Dialog open={showLatexDialog} onOpenChange={setShowLatexDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCode className="w-5 h-5" />
              {existingLatex ? "Current LaTeX Code" : "Generated LaTeX Code"}
            </DialogTitle>
            <DialogDescription>
              Copy this code and paste it into the client's Base Resume LaTeX field, or use the "Save to Profile" button.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="absolute top-2 right-2 z-10"
              onClick={copyToClipboard}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
            <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-auto max-h-[50vh] text-sm font-mono">
              {generatedLatex}
            </pre>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            {onSaveToProfile && (
              <Button
                onClick={handleSaveToProfile}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Save to Profile
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowLatexDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
