import { Clock, Mail, ArrowRight, MessageSquare, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLogout } from "@/hooks/use-auth";
import { Link } from "wouter";

export default function PendingVerificationPage() {
    const logout = useLogout();

    return (
        <div className="min-h-screen flex items-start sm:items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 py-10">
            <div className="w-full max-w-md px-4">
                <div className="mb-4 sm:mb-0 sm:-mt-16">
                    <Link href="/">
                        <Button variant="ghost" size="sm" className="text-amber-800 hover:text-amber-900">
                            <ArrowRight className="h-4 w-4 mr-2 rotate-180" /> Back to Home
                        </Button>
                    </Link>
                </div>
                <Card className="w-full shadow-xl">
                <CardHeader className="text-center">
                    <div className="mx-auto bg-amber-100 p-4 rounded-full w-20 h-20 flex items-center justify-center mb-4">
                        <Clock className="w-10 h-10 text-amber-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-amber-700">Pending Verification</CardTitle>
                    <CardDescription className="text-base">
                        Your employee account is awaiting admin approval.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                        <h3 className="font-semibold text-amber-800 mb-2">What happens next?</h3>
                        <ul className="text-sm text-amber-700 space-y-2">
                            <li className="flex items-start gap-2">
                                <span className="font-bold">1.</span>
                                <span>An admin will review your application</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="font-bold">2.</span>
                                <span>Once verified, your account will be activated</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="font-bold">3.</span>
                                <span>Clients will be assigned to you by an admin</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="font-bold">4.</span>
                                <span>You can then start applying on behalf of clients</span>
                            </li>
                        </ul>
                        <p className="text-sm text-amber-700 mt-3">
                            Book a slot below for your verification round.
                        </p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-3 text-slate-700">
                            <Mail className="w-5 h-5 text-slate-500" />
                            <div className="text-sm">
                                <p>Questions? Contact us at:</p>
                                <a href="mailto:support@hireease.me" className="text-primary hover:underline font-medium">
                                    support@hireease.me
                                </a>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <Button
                            className="w-full bg-[#039BE5] hover:bg-[#0288D1] text-white border-none"
                            asChild
                        >
                            <a href="https://calendar.app.google/sdYc2yQeTHJRpk4k8" target="_blank" rel="noopener noreferrer">
                                <Calendar className="mr-2 h-4 w-4" />
                                Schedule verification meeting
                            </a>
                        </Button>
                        <Button
                            className="w-full bg-green-600 hover:bg-green-700 text-white border-none"
                            asChild
                        >
                            <a href="https://wa.me/+17138537974?text=Hi!%20I%20just%20registered%20as%20an%20employee%20and%20need%20verification." target="_blank" rel="noopener noreferrer">
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Chat on WhatsApp for Verification
                            </a>
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => window.location.reload()}
                        >
                            Check Status Again
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full text-slate-600"
                            onClick={() => logout.mutate()}
                            disabled={logout.isPending}
                        >
                            {logout.isPending ? "Logging out..." : "Sign Out"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
            </div>
        </div>
    );
}
