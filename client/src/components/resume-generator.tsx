import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Sparkles, Copy, AlertCircle } from "lucide-react";

interface ResumeGeneratorProps {
  clientId: string;
  hasBaseResume: boolean;
  userHasApiKey: boolean;
}

export function ResumeGenerator({ clientId, hasBaseResume, userHasApiKey }: ResumeGeneratorProps) {
  const { toast } = useToast();
  const [jobDescription, setJobDescription] = useState("");
  const [generatedLatex, setGeneratedLatex] = useState("");
  const [showResultDialog, setShowResultDialog] = useState(false);

  const generateResume = useMutation({
    mutationFn: async (jobDesc: string) => {
      const response = await apiRequest("POST", `/api/generate-resume/${clientId}`, {
        jobDescription: jobDesc,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedLatex(data.latex);
      setShowResultDialog(true);
      toast({
        title: "Resume Generated!",
        description: "Your tailored resume is ready to copy.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate resume",
        variant: "destructive",
      });
    },
  });

  const handleGenerate = () => {
    if (!jobDescription.trim()) {
      toast({
        title: "Job Description Required",
        description: "Please paste a job description first",
        variant: "destructive",
      });
      return;
    }
    generateResume.mutate(jobDescription);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLatex);
    toast({
      title: "Copied!",
      description: "LaTeX code copied to clipboard",
    });
  };

  return (
    <>
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <CardTitle>AI Resume Generator</CardTitle>
          </div>
          <CardDescription>
            Paste a job description to generate a tailored LaTeX resume for this client
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

          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Job Description
            </label>
            <Textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job description here..."
              className="min-h-[200px] font-mono text-sm"
              disabled={!userHasApiKey || !hasBaseResume}
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generateResume.isPending || !userHasApiKey || !hasBaseResume}
            className="w-full"
            size="lg"
          >
            {generateResume.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Resume...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Tailored Resume
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Generated Resume</DialogTitle>
            <DialogDescription>
              Your AI-tailored LaTeX resume is ready. Copy the code below.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 min-h-0 space-y-4">
            <div className="relative h-full">
              <div className="bg-slate-900 text-slate-100 p-4 rounded-lg h-[60vh] overflow-auto">
                <pre className="text-sm font-mono whitespace-pre-wrap break-words">
                  <code>{generatedLatex}</code>
                </pre>
              </div>
              <Button
                onClick={copyToClipboard}
                className="absolute top-2 right-2 z-10"
                size="sm"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Code
              </Button>
            </div>
            
            <div className="flex justify-end gap-2 flex-shrink-0">
              <Button onClick={() => setShowResultDialog(false)} variant="outline">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

