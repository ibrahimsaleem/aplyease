import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  Sparkles,
  Download,
  AlertCircle,
  KeyRound,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Loader2,
  FileText,
  RefreshCw,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FuturisticBackground } from "@/components/ui/futuristic-background";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const MODEL_OPTIONS = [
  { value: "gemini-3-pro-preview", label: "Gemini 3 Pro (Most Powerful)" },
  { value: "gemini-3-flash-preview", label: "Gemini 3 Flash (Fast)" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Recommended)" },
  { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite" },
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
  { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
  { value: "gemini-1.0-pro", label: "Gemini 1.0 Pro" },
];

export default function PublicResumeFormatterPage() {
  const { toast } = useToast();

  const [plainTextResume, setPlainTextResume] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [generatedLatex, setGeneratedLatex] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const compilePdf = async (latex: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latex }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const err = data?.details || data?.message || "Could not create PDF.";
        return { success: false, error: err };
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      setPdfError(null);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || "PDF creation failed." };
    }
  };

  const handleCreatePdf = async (isRetry = false) => {
    if (!plainTextResume.trim()) {
      toast({
        title: "Resume Needed",
        description: "Paste your resume text first.",
        variant: "destructive",
      });
      return;
    }

    if (isRetry && generatedLatex) {
      setIsFixing(true);
      setPdfError(null);
      try {
        const res = await fetch("/api/public/fix-resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            latex: generatedLatex,
            compilationError: pdfError || "Unknown compilation error",
            geminiApiKey: geminiApiKey.trim() || undefined,
            selectedModel: selectedModel || undefined,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErrorMessage(data?.message || "Could not fix resume.");
          toast({ title: "Fix Failed", description: data?.message, variant: "destructive" });
          return;
        }
        if (data.latex) {
          setGeneratedLatex(data.latex);
          const result = await compilePdf(data.latex);
          if (result.success) {
            setShowPreviewDialog(true);
            toast({ title: "Fixed!", description: "Your resume PDF is ready." });
          } else {
            setPdfError(result.error || "Unknown error");
            toast({ title: "Still Not Working", description: "Try again or paste a simpler resume.", variant: "destructive" });
          }
        }
      } catch (e: any) {
        setErrorMessage(e?.message || "Something went wrong.");
        toast({ title: "Error", description: e?.message, variant: "destructive" });
      } finally {
        setIsFixing(false);
      }
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setPdfError(null);
    setGeneratedLatex("");
    setPdfUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

    try {
      const res = await fetch("/api/public/generate-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plainTextResume,
          geminiApiKey: geminiApiKey.trim() || undefined,
          selectedModel: selectedModel || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = data?.message || "Could not create your resume.";
        setErrorMessage(msg);
        toast({ title: "Error", description: msg, variant: "destructive" });
        return;
      }

      if (!data.latex || typeof data.latex !== "string") {
        setErrorMessage("Something went wrong. Please try again.");
        toast({ title: "Error", description: "Please try again.", variant: "destructive" });
        return;
      }

      setGeneratedLatex(data.latex);
      const result = await compilePdf(data.latex);

      if (result.success) {
        setShowPreviewDialog(true);
        toast({ title: "Done!", description: "Your resume PDF is ready to download." });
      } else {
        setPdfError(result.error || "PDF could not be created.");
        toast({
          title: "PDF Issue",
          description: "We had trouble creating the PDF. Tap Try Again to fix it automatically.",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      const msg = e?.message || "Something went wrong.";
      setErrorMessage(msg);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = "my-resume.pdf";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast({ title: "Downloading", description: "Your resume is downloading." });
  };

  const isBusy = isGenerating || isFixing;

  return (
    <FuturisticBackground className="min-h-screen py-6 sm:py-10">
      <div className="container mx-auto px-4 sm:px-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <Link href="/">
            <button
              type="button"
              className="flex items-center gap-2 text-slate-700 hover:text-slate-900 transition-colors touch-manipulation"
            >
              <div className="bg-primary text-white p-2 rounded-lg">
                <Briefcase className="h-5 w-5" />
              </div>
              <span className="text-lg font-semibold">HireEase</span>
            </button>
          </Link>
          <Badge variant="outline" className="border-green-500 text-green-700 text-sm px-2 py-0.5">
            Free
          </Badge>
        </div>

        <Card className="shadow-xl bg-white/95 backdrop-blur border-0">
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-600 flex-shrink-0" />
              Create Your Resume PDF
            </CardTitle>
            <CardDescription className="text-base mt-1">
              Paste your resume text below. We&apos;ll turn it into a professional, ATS-friendly PDF — trusted by 1,000,000+ people.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 block">
                Paste your resume here
              </label>
              <Textarea
                value={plainTextResume}
                onChange={(e) => setPlainTextResume(e.target.value)}
                placeholder="Paste your resume text (education, experience, skills, etc.). Keep it simple — no tables or fancy formatting."
                className="min-h-[200px] sm:min-h-[220px] text-base sm:text-sm bg-white resize-y touch-manipulation"
                disabled={isBusy}
              />
            </div>

            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between text-slate-600 hover:text-slate-900 py-2"
                >
                  <span className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4" />
                    API key & options
                  </span>
                  {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Your Gemini API key</label>
                  <Input
                    type="password"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder="Paste your API key (optional if we provide one)"
                    className="bg-white text-base"
                    autoComplete="off"
                  />
                  <p className="text-xs text-slate-500">
                    Free at{" "}
                    <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline">
                      Google AI Studio
                    </a>
                    . Never stored.
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Model (optional)</label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Auto (recommended if unsure)" />
                    </SelectTrigger>
                    <SelectContent>
                      {MODEL_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">
                    For the strongest resumes, pick the highest model your API key supports (for example Gemini 3 Pro or 2.5 Pro). If you&apos;re not sure, leave this on Auto.
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {errorMessage && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            {pdfError && !pdfUrl && (
              <Alert variant="destructive" className="border-amber-300 bg-amber-50 text-amber-900">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-1">We couldn&apos;t create your PDF.</p>
                  <p className="text-sm mb-3">Tap &quot;Try Again&quot; and we&apos;ll fix it automatically.</p>
                  <Button
                    size="sm"
                    onClick={() => handleCreatePdf(true)}
                    disabled={isBusy}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    {isFixing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Fixing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Try Again
                      </>
                    )}
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={() => handleCreatePdf(false)}
              disabled={isBusy}
              size="lg"
              className="w-full h-12 sm:h-14 text-base sm:text-lg touch-manipulation"
            >
              {isBusy ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {isFixing ? "Fixing..." : "Creating your PDF..."}
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5 mr-2" />
                  Create Resume PDF
                </>
              )}
            </Button>

            {pdfUrl && (
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  onClick={() => setShowPreviewDialog(true)}
                  variant="outline"
                  size="lg"
                  className="flex-1 h-12 touch-manipulation"
                >
                  Preview PDF
                </Button>
                <Button
                  onClick={handleDownloadPdf}
                  size="lg"
                  className="flex-1 h-12 bg-green-600 hover:bg-green-700 touch-manipulation"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Download PDF
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-slate-500 mt-6 px-2">
          Same professional format our team uses for clients. One page, ATS-friendly.
        </p>
      </div>

      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl w-full h-[85vh] sm:h-[92vh] flex flex-col p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Your Resume</DialogTitle>
            <DialogDescription>Here&apos;s your professional resume. Download it when you&apos;re ready.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 rounded-lg overflow-hidden border border-slate-200">
            {pdfUrl ? (
              <iframe
                src={pdfUrl}
                className="w-full h-full"
                title="Resume PDF"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-50">
                <p className="text-slate-600">No PDF yet.</p>
              </div>
            )}
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleDownloadPdf} size="lg" className="bg-green-600 hover:bg-green-700">
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </FuturisticBackground>
  );
}
