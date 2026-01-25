import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, Compass, FileText, Search, UserPlus, Save, Send, Youtube, ExternalLink, Settings, Key } from "lucide-react";

export function EmployeeTraining() {
  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-blue-600" />
            <CardTitle className="text-2xl text-blue-900">Employee Training & Onboarding Guide</CardTitle>
          </div>
          <CardDescription className="text-blue-700 text-base">
            Welcome to the team! innovative platform. Please review this mandatory training guide to understand our workflows, tools, and best practices.
          </CardDescription>
        </CardHeader>
      </Card>

      <ScrollArea className="h-[calc(100vh-300px)] pr-4">
        <Accordion type="single" collapsible className="w-full space-y-4" defaultValue="item-1">

          {/* Section 1: Portal Navigation */}
          <AccordionItem value="item-1" className="bg-white border rounded-lg px-4 shadow-sm">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-3 text-left">
                <div className="p-2 bg-slate-100 rounded-full text-slate-600">
                  <Compass className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-900">1. Portal Navigation</h3>
                  <p className="text-sm text-slate-500 font-normal">Getting around the system</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 pt-2 text-slate-600 space-y-3">
              <p>Familiarize yourself with the main sections of the portal:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Dashboard:</strong> Your central hub. View your assigned clients, track application stats, and access this training guide.</li>
                <li><strong>Clients Directory (`/clients`):</strong> Browse all clients. Use the search bar to find specific clients by name or email. Click on a client to view their full profile and tools.</li>
                <li><strong>Application Form:</strong> A quick-access form on the dashboard to log every job application you submit.</li>
                <li><strong>My Payout:</strong> Track your earnings based on the applications you've submitted.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          {/* Section 2: Resume Creation & Tailoring */}
          <AccordionItem value="item-2" className="bg-white border rounded-lg px-4 shadow-sm">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-3 text-left">
                <div className="p-2 bg-slate-100 rounded-full text-slate-600">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-900">2. Resume Creation & Tailoring</h3>
                  <p className="text-sm text-slate-500 font-normal">Generating professional LaTeX resumes</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 pt-2 text-slate-600 space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium text-slate-900">Step A: Create Base Resume</h4>
                <p>Convert a client's raw text resume into our standard LaTeX format.</p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Go to a <strong>Client Profile</strong> page.</li>
                  <li>Scroll to the <strong>"Base LaTeX Resume Generator"</strong>.</li>
                  <li>Paste the raw text resume.</li>
                  <li>Click <strong>Generate</strong> to create the LaTeX code.</li>
                  <li>Use the <strong>Update</strong> feature to refine it with specific instructions (e.g., "Make education section smaller").</li>
                  <li><strong>Save to Profile</strong>. This becomes the master template.</li>
                </ol>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-slate-900">Step B: Tailor for Jobs</h4>
                <p>Customize the resume for a specific job application.</p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>On the Client Profile, find the <strong>"AI Resume Agent System"</strong>.</li>
                  <li>Paste the <strong>Job Description (JD)</strong> from the job portal.</li>
                  <li>Click <strong>Generate Tailored Resume</strong>. The AI will optimize the resume for that specific job.</li>
                  <li>Review the <strong>ATS Score</strong>. If it's low, click "Optimize Again".</li>
                  <li><strong>Copy Code</strong> and use Overleaf to generate the PDF.</li>
                </ol>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Section 3: Job Search & Application Process */}
          <AccordionItem value="item-3" className="bg-white border rounded-lg px-4 shadow-sm">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-3 text-left">
                <div className="p-2 bg-slate-100 rounded-full text-slate-600">
                  <Search className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-900">3. Job Search & Application Process</h3>
                  <p className="text-sm text-slate-500 font-normal">Finding and applying for jobs</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 pt-2 text-slate-600 space-y-4">
              <p>We use external platforms to find the best opportunities.</p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="border p-3 rounded-md bg-slate-50">
                  <h4 className="font-medium text-slate-900 mb-2">Platforms</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>LinkedIn:</strong> Use filters for "Date Posted" (Past 24h) and "Easy Apply" if applicable.</li>
                    <li><strong>JobRight.ai:</strong> excellent for AI-matched opportunities.</li>
                    <li><strong>Company Careers Pages:</strong> For high-priority target companies.</li>
                  </ul>
                </div>
                <div className="border p-3 rounded-md bg-slate-50">
                  <h4 className="font-medium text-slate-900 mb-2">Workflow</h4>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Find a suitable job matching client's skills.</li>
                    <li><strong>Copy the full Job Description.</strong></li>
                    <li>Use our <strong>AI Resume Agent</strong> to create a tailored resume.</li>
                    <li>Apply on the portal using the tailored PDF.</li>
                  </ol>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Section 4: Client Onboarding */}
          <AccordionItem value="item-4" className="bg-white border rounded-lg px-4 shadow-sm">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-3 text-left">
                <div className="p-2 bg-slate-100 rounded-full text-slate-600">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-900">4. Client Onboarding & Account Setup</h3>
                  <p className="text-sm text-slate-500 font-normal">Setting up a new client</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 pt-2 text-slate-600 space-y-3">
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-md mb-2">
                <p className="text-amber-800 text-sm">
                  <strong>Security Note:</strong> Always log in to the client's dedicated Google Account first. This keeps their data separate and secure.
                </p>
              </div>
              <ol className="list-decimal pl-5 space-y-2">
                <li><strong>Log in to Google:</strong> Use the provided client email and password to sign in to their Google/Gmail account in your browser.</li>
                <li><strong>Access Portals:</strong> Use "Sign in with Google" to access:
                  <ul className="list-disc pl-5 mt-1">
                    <li><a href="https://www.overleaf.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">Overleaf <ExternalLink className="h-3 w-3" /></a> (for generating PDFs)</li>
                    <li><a href="https://jobright.ai" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">JobRight.ai <ExternalLink className="h-3 w-3" /></a> (for job search)</li>
                  </ul>
                </li>
                <li><strong>Store Credentials:</strong> Ensure any new account passwords are saved in the <strong>Client Profile &rarr; Contact Information</strong> section.</li>
              </ol>
            </AccordionContent>
          </AccordionItem>

          {/* Section 5: Resume Storage */}
          <AccordionItem value="item-5" className="bg-white border rounded-lg px-4 shadow-sm">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-3 text-left">
                <div className="p-2 bg-slate-100 rounded-full text-slate-600">
                  <Save className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-900">5. Resume Storage & File Management</h3>
                  <p className="text-sm text-slate-500 font-normal">Formatting and saving files</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 pt-2 text-slate-600 space-y-3">
              <p>Organization is key. Follow these strict naming conventions:</p>
              <div className="p-4 bg-slate-100 rounded-md font-mono text-sm border border-slate-200">
                Format: CompanyName_JobTitle.pdf
                <br />
                Example: Google_SeniorDataScientist.pdf
              </div>
              <ol className="list-decimal pl-5 space-y-2 mt-2">
                <li>Paste the LaTeX code from our tool into a new Overleaf project.</li>
                <li>Compile and download the PDF.</li>
                <li>Rename the file immediately using the format above.</li>
                <li>Upload the file to the client's <strong>Google Drive</strong> (typically in a folder named "Resumes" or "Applications").</li>
                <li>Get a <strong>Shareable Link</strong>/URL for the file to use in our tracking form.</li>
              </ol>
            </AccordionContent>
          </AccordionItem>

          {/* Section 6: Application Submission */}
          <AccordionItem value="item-6" className="bg-white border rounded-lg px-4 shadow-sm">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-3 text-left">
                <div className="p-2 bg-slate-100 rounded-full text-slate-600">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-900">6. Application Submission & Tracking</h3>
                  <p className="text-sm text-slate-500 font-normal">Recording your work</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 pt-2 text-slate-600 space-y-3">
              <p>Every application MUST be recorded in the portal to get paid and track progress.</p>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Go to your <strong>Dashboard</strong> or the <strong>Client Profile</strong>.</li>
                <li>Use the <strong>"Add New Application"</strong> form.</li>
                <li>Fill in ALL details accurately:
                  <ul className="list-disc pl-5 mt-1 text-sm">
                    <li><strong>Job Title & Company:</strong> Exactly as they appear on the job post.</li>
                    <li><strong>Job Link:</strong> Direct URL to the job posting.</li>
                    <li><strong>Resume URL:</strong> The Google Drive link to the tailored PDF you created.</li>
                  </ul>
                </li>
                <li>Click <strong>Submit</strong>. This updates your monthly payout stats immediately.</li>
              </ol>
            </AccordionContent>
          </AccordionItem>

          {/* Section 7: Gemini AI Setup */}
          <AccordionItem value="item-7" className="bg-white border rounded-lg px-4 shadow-sm">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-3 text-left">
                <div className="p-2 bg-purple-100 rounded-full text-purple-600">
                  <Key className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-900">7. Gemini AI Setup Guide</h3>
                  <p className="text-sm text-slate-500 font-normal">Enabling AI features for resume generation</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 pt-2 text-slate-600 space-y-4">
              <div className="bg-purple-50 border border-purple-200 p-3 rounded-md mb-2">
                <p className="text-purple-800 text-sm">
                  <strong>Important:</strong> You must configure your Gemini API key to use AI-powered features like resume generation, evaluation, and optimization.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-slate-900">Step A: Get Your Gemini API Key</h4>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>Visit <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">Google AI Studio <ExternalLink className="h-3 w-3" /></a></li>
                  <li>Sign in with your Google account (create one if needed)</li>
                  <li>Click the <strong>"Create API Key"</strong> button</li>
                  <li>Select a Google Cloud project or create a new one</li>
                  <li>Copy your API key and store it securely</li>
                </ol>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-slate-900">Step B: Configure Settings in AplyEase</h4>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>Click the <strong>Settings icon</strong> (⚙️) in the top navigation bar</li>
                  <li>The Settings dialog will open with AI configuration options</li>
                  <li>Choose your <strong>Preferred AI Model</strong>:
                    <div className="mt-2 p-3 bg-slate-50 rounded-md border text-sm">
                      <ul className="space-y-1">
                        <li><strong>Gemini 2.5 Flash</strong> ⭐ - Best price-performance (Recommended)</li>
                        <li><strong>Gemini 3 Pro Preview</strong> - Most powerful for complex tasks</li>
                        <li><strong>Gemini 3 Flash Preview</strong> - Fastest intelligent responses</li>
                        <li><strong>Gemini 2.5 Pro</strong> - Advanced thinking and reasoning</li>
                        <li><strong>Gemini 2.5 Flash-Lite</strong> - Most cost-efficient option</li>
                      </ul>
                    </div>
                  </li>
                  <li>Paste your <strong>Primary Gemini API Key</strong> in the input field</li>
                  <li>(Optional) Add a <strong>Fallback API Key</strong> for backup when primary key hits rate limits</li>
                  <li>Click <strong>"Save Settings"</strong></li>
                </ol>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-slate-900">Step C: Using AI Features</h4>
                <p>After configuration, you can:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Generate AI Resumes:</strong> Go to a client's profile and use the AI Resume Agent</li>
                  <li><strong>Evaluate Resumes:</strong> Get AI feedback on resume quality and ATS score</li>
                  <li><strong>Optimize Content:</strong> Let AI improve resume sections automatically</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-slate-900">Troubleshooting</h4>
                <div className="grid md:grid-cols-2 gap-2 text-sm">
                  <div className="p-2 bg-red-50 border border-red-100 rounded">
                    <strong className="text-red-700">Error:</strong> "Please configure your API key"
                    <p className="text-red-600 mt-1">→ Add your API key in Settings</p>
                  </div>
                  <div className="p-2 bg-red-50 border border-red-100 rounded">
                    <strong className="text-red-700">Error:</strong> "Invalid API key"
                    <p className="text-red-600 mt-1">→ Verify your key at Google AI Studio</p>
                  </div>
                  <div className="p-2 bg-amber-50 border border-amber-100 rounded">
                    <strong className="text-amber-700">Error:</strong> "Quota exceeded"
                    <p className="text-amber-600 mt-1">→ Wait for reset, or use a fallback key</p>
                  </div>
                  <div className="p-2 bg-amber-50 border border-amber-100 rounded">
                    <strong className="text-amber-700">Issue:</strong> Slow responses
                    <p className="text-amber-600 mt-1">→ Try Gemini 2.5 Flash (faster model)</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-100 p-3 rounded-md mt-2">
                <h4 className="font-medium text-slate-900 mb-2">🔐 Security Best Practices</h4>
                <ul className="text-sm space-y-1">
                  <li>✅ Use your own personal API key</li>
                  <li>✅ Set up a fallback key for high availability</li>
                  <li>✅ Monitor your usage at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">AI Studio</a></li>
                  <li>❌ Never share your API key with others</li>
                  <li>❌ Don't post API keys publicly or in code</li>
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>

        </Accordion>
      </ScrollArea>
    </div>
  );
}
