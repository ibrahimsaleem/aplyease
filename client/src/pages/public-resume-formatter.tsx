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
  Upload,
  X,
  Undo2,
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
  { value: "gemini-2.0-flash-exp", label: "Gemini 2.0 Flash Exp (Recommended - Fast & Smart)" },
  { value: "gemini-3-pro-preview", label: "Gemini 3 Pro (Most Powerful)" },
  { value: "gemini-3-flash-preview", label: "Gemini 3 Flash (Very Fast)" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro (High Quality)" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Balanced)" },
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

  // File upload state
  const [isExtracting, setIsExtracting] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Update resume state
  const [updateInstructions, setUpdateInstructions] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [showUpdateSection, setShowUpdateSection] = useState(false);
  const [resumeHistory, setResumeHistory] = useState<string[]>([]);

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
      setResumeHistory([data.latex]); // Initialize history with first version
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

  const handleFileUpload = async (file: File) => {
    // Validate file type
    const allowedTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF or Word document (.pdf, .docx, .doc)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setIsExtracting(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/extract-resume", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to extract text from file");
      }

      setPlainTextResume(data.text);
      setUploadedFileName(file.name);
      toast({
        title: "Success!",
        description: "Text extracted from your file. You can edit it below before generating your resume.",
      });
    } catch (e: any) {
      const msg = e?.message || "Failed to process file";
      setErrorMessage(msg);
      toast({ title: "Upload Failed", description: msg, variant: "destructive" });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleUpdateResume = async () => {
    if (!updateInstructions.trim()) {
      toast({
        title: "Instructions Required",
        description: "Please describe what changes you'd like to make.",
        variant: "destructive",
      });
      return;
    }

    if (!generatedLatex) {
      toast({
        title: "No Resume",
        description: "Generate a resume first before updating it.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/public/update-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentLatex: generatedLatex,
          updateInstructions: updateInstructions.trim(),
          geminiApiKey: geminiApiKey.trim() || undefined,
          selectedModel: selectedModel || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update resume");
      }

      if (!data.latex) {
        throw new Error("No updated resume returned");
      }

      // Save current version to history before updating
      setResumeHistory((prev) => [...prev, data.latex]);
      setGeneratedLatex(data.latex);
      const result = await compilePdf(data.latex);

      if (result.success) {
        toast({
          title: "Resume Updated!",
          description: "Your resume has been updated successfully.",
        });
        setUpdateInstructions("");
      } else {
        setPdfError(result.error || "PDF compilation failed");
        toast({
          title: "Update Successful, but PDF Failed",
          description: "Your resume was updated but we couldn't compile the PDF. Try fixing it.",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to update resume";
      setErrorMessage(msg);
      toast({ title: "Update Failed", description: msg, variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleUndoUpdate = async () => {
    if (resumeHistory.length <= 1) {
      toast({
        title: "No Previous Version",
        description: "This is the original resume version.",
        variant: "destructive",
      });
      return;
    }

    // Remove current version and go back to previous
    const newHistory = [...resumeHistory];
    newHistory.pop(); // Remove current version
    const previousVersion = newHistory[newHistory.length - 1];

    setResumeHistory(newHistory);
    setGeneratedLatex(previousVersion);
    
    const result = await compilePdf(previousVersion);
    if (result.success) {
      toast({
        title: "Undone!",
        description: "Restored previous resume version.",
      });
    } else {
      setPdfError(result.error || "Failed to compile previous version");
    }
  };

  const isBusy = isGenerating || isFixing || isExtracting || isUpdating;

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
              Upload or paste your resume. We&apos;ll turn it into a professional, ATS-friendly PDF — no API key needed!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* File Upload Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700 block">
                  Upload your resume or paste text
                </label>
                <Badge variant="secondary" className="text-xs">
                  PDF, DOCX, DOC
                </Badge>
              </div>
              
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  relative border-2 border-dashed rounded-lg p-6 sm:p-8 transition-all
                  ${isDragging 
                    ? "border-primary bg-primary/5 scale-[1.02]" 
                    : "border-slate-300 bg-slate-50/50 hover:border-slate-400"
                  }
                  ${isBusy ? "opacity-50 pointer-events-none" : ""}
                `}
              >
                <input
                  type="file"
                  id="resume-upload"
                  accept=".pdf,.docx,.doc"
                  onChange={handleFileInputChange}
                  disabled={isBusy}
                  className="hidden"
                />
                <label
                  htmlFor="resume-upload"
                  className="flex flex-col items-center justify-center gap-3 cursor-pointer touch-manipulation"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-primary animate-spin" />
                      <p className="text-sm sm:text-base font-medium text-slate-700">
                        Extracting text from your file...
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 sm:w-12 sm:h-12 text-slate-400" />
                      <div className="text-center">
                        <p className="text-sm sm:text-base font-medium text-slate-700">
                          Drop your resume here or{" "}
                          <span className="text-primary underline">browse</span>
                        </p>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">
                          PDF or Word documents up to 5MB
                        </p>
                      </div>
                    </>
                  )}
                </label>
              </div>

              {uploadedFileName && !isExtracting && (
                <div className="flex items-center justify-between gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="text-sm text-green-700 truncate">{uploadedFileName}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setUploadedFileName(null);
                      setPlainTextResume("");
                    }}
                    className="flex-shrink-0 h-8 w-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-500">Or</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 block">
                Edit your resume text
              </label>
              <Textarea
                value={plainTextResume}
                onChange={(e) => setPlainTextResume(e.target.value)}
                placeholder="Paste or edit your resume text (education, experience, skills, etc.). Keep it simple — no tables or fancy formatting."
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
                  <label className="text-sm font-medium text-slate-700">
                    Your Gemini API key <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <Input
                    type="password"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder="Leave empty to use our default key"
                    className="bg-white text-base"
                    autoComplete="off"
                  />
                  <p className="text-xs text-slate-500">
                    We provide a default API key. Or get your own free key at{" "}
                    <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline">
                      Google AI Studio
                    </a>
                    . Your key is never stored.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">
                      AI Model Selection
                    </label>
                    {selectedModel && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedModel("")}
                        className="h-6 text-xs text-slate-500 hover:text-slate-700"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Clear (use auto)
                      </Button>
                    )}
                  </div>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="🤖 Auto Mode (smart detection - learns what works best)" />
                    </SelectTrigger>
                    <SelectContent>
                      {MODEL_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-start gap-1.5">
                    {selectedModel ? (
                      <Badge variant="secondary" className="text-xs">
                        Manual Mode
                      </Badge>
                    ) : (
                      <Badge variant="default" className="text-xs bg-green-600">
                        Auto Mode
                      </Badge>
                    )}
                    <p className="text-xs text-slate-500 flex-1">
                      {selectedModel ? (
                        <>Your selected model will be tried first, with automatic fallback if needed.</>
                      ) : (
                        <>System automatically picks the best model and learns from successful requests for faster future generations.</>
                      )}
                    </p>
                  </div>
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
                  {isFixing ? "Fixing..." : isExtracting ? "Extracting text..." : isUpdating ? "Updating..." : "Creating your PDF..."}
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
          
          {/* Update Resume Section */}
          {pdfUrl && (
            <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
              <Collapsible open={showUpdateSection} onOpenChange={setShowUpdateSection}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between text-slate-700 hover:text-slate-900 py-2"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <RefreshCw className="w-4 h-4" />
                      Need changes? Update your resume
                    </span>
                    {showUpdateSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Describe the changes you want
                    </label>
                    <Textarea
                      value={updateInstructions}
                      onChange={(e) => setUpdateInstructions(e.target.value)}
                      placeholder="E.g., 'Add a skills section with Python, JavaScript, and SQL', 'Remove the education section', 'Make it more concise', 'Add bullet points about my freelance work'"
                      className="min-h-[100px] text-base sm:text-sm bg-white resize-y touch-manipulation"
                      disabled={isUpdating}
                    />
                    <p className="text-xs text-slate-500">
                      Be specific about what you want to add, remove, or change.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={handleUpdateResume}
                      disabled={isUpdating || !updateInstructions.trim()}
                      size="lg"
                      className="flex-1 h-11 sm:h-12 touch-manipulation"
                    >
                      {isUpdating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Updating your resume...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Update Resume
                        </>
                      )}
                    </Button>
                    {resumeHistory.length > 1 && (
                      <Button
                        onClick={handleUndoUpdate}
                        disabled={isUpdating}
                        variant="outline"
                        size="lg"
                        className="h-11 sm:h-12 touch-manipulation"
                      >
                        <Undo2 className="w-4 h-4 mr-2" />
                        Undo ({resumeHistory.length - 1})
                      </Button>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <Button onClick={handleDownloadPdf} size="lg" className="bg-green-600 hover:bg-green-700 touch-manipulation">
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </FuturisticBackground>
  );
}
