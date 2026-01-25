import { Link } from "wouter";
import { ArrowRight, Briefcase, CheckCircle, Users, ClipboardList, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function WorkWithUsPage() {
    return (
        <div className="min-h-screen flex flex-col bg-white">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/">
                            <div className="flex items-center gap-2 cursor-pointer">
                                <div className="bg-primary text-white p-2 rounded-lg">
                                    <Briefcase className="h-5 w-5" />
                                </div>
                                <span className="text-xl font-bold text-slate-900">HireEase</span>
                            </div>
                        </Link>
                        <div className="flex items-center gap-4">
                            <Link href="/login">
                                <Button variant="ghost">Login</Button>
                            </Link>
                            <Link href="/signup?role=employee">
                                <Button>Apply Now</Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1">
                {/* Hero Section */}
                <section className="pt-16 pb-20 bg-gradient-to-b from-blue-50 to-white">
                    <div className="container mx-auto px-4 md:px-6 text-center">
                        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
                            Work With Us
                        </h1>
                        <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-8">
                            Join HireEase as an Application Specialist and help clients land jobs using our AI-powered workflows.
                        </p>
                        <Link href="/signup?role=employee">
                            <Button size="lg" className="text-lg px-8 h-14">
                                Apply as Employee <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </Link>
                    </div>
                </section>

                {/* What You'll Do */}
                <section className="py-16 bg-white">
                    <div className="container mx-auto px-4 md:px-6">
                        <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">What You'll Do</h2>
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
                            <Card className="border-none shadow-lg">
                                <CardContent className="p-6 text-center">
                                    <div className="mb-4 inline-block p-3 bg-blue-50 rounded-xl">
                                        <ClipboardList className="h-8 w-8 text-primary" />
                                    </div>
                                    <h3 className="font-semibold text-slate-900 mb-2">Search Jobs</h3>
                                    <p className="text-sm text-slate-600">Find relevant opportunities on approved job platforms</p>
                                </CardContent>
                            </Card>
                            <Card className="border-none shadow-lg">
                                <CardContent className="p-6 text-center">
                                    <div className="mb-4 inline-block p-3 bg-blue-50 rounded-xl">
                                        <Users className="h-8 w-8 text-primary" />
                                    </div>
                                    <h3 className="font-semibold text-slate-900 mb-2">Tailor Resumes</h3>
                                    <p className="text-sm text-slate-600">Customize resumes using our AI tools and SOP guidelines</p>
                                </CardContent>
                            </Card>
                            <Card className="border-none shadow-lg">
                                <CardContent className="p-6 text-center">
                                    <div className="mb-4 inline-block p-3 bg-blue-50 rounded-xl">
                                        <CheckCircle className="h-8 w-8 text-primary" />
                                    </div>
                                    <h3 className="font-semibold text-slate-900 mb-2">Submit Applications</h3>
                                    <p className="text-sm text-slate-600">Complete and submit job applications on behalf of clients</p>
                                </CardContent>
                            </Card>
                            <Card className="border-none shadow-lg">
                                <CardContent className="p-6 text-center">
                                    <div className="mb-4 inline-block p-3 bg-blue-50 rounded-xl">
                                        <Shield className="h-8 w-8 text-primary" />
                                    </div>
                                    <h3 className="font-semibold text-slate-900 mb-2">Log Proof</h3>
                                    <p className="text-sm text-slate-600">Document each application with screenshots and details</p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* What We Look For */}
                <section className="py-16 bg-slate-50">
                    <div className="container mx-auto px-4 md:px-6">
                        <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">What We Look For</h2>
                        <div className="max-w-2xl mx-auto">
                            <ul className="space-y-4">
                                <li className="flex items-start gap-3">
                                    <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-slate-900">Detail-Oriented</p>
                                        <p className="text-sm text-slate-600">Accuracy is critical when applying on behalf of clients</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-slate-900">Follows SOP Strictly</p>
                                        <p className="text-sm text-slate-600">Must adhere to our standard operating procedures</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-slate-900">Basic Tech Comfort</p>
                                        <p className="text-sm text-slate-600">Comfortable with web browsers, job boards, and our tools</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-slate-900">Good Communication</p>
                                        <p className="text-sm text-slate-600">Clear and timely communication with the team</p>
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-20 bg-primary text-white">
                    <div className="container mx-auto px-4 md:px-6 text-center">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Join?</h2>
                        <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">
                            Start earning by helping job seekers land their dream positions.
                        </p>
                        <Link href="/signup?role=employee">
                            <Button size="lg" variant="secondary" className="text-lg px-8 h-14">
                                Apply as Employee <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </Link>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="bg-slate-900 text-slate-300 py-8">
                <div className="container mx-auto px-4 md:px-6 text-center">
                    <div className="flex items-center justify-center gap-2 text-white mb-4">
                        <Briefcase className="h-5 w-5" />
                        <span className="font-bold">HireEase</span>
                    </div>
                    <p className="text-sm">&copy; 2026 HireEase. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
