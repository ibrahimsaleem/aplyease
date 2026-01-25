import { Briefcase, Clock, Mail, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLogout } from "@/hooks/use-auth";
import { Link } from "wouter";

export default function PendingVerificationPage() {
    const logout = useLogout();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100">
            <Card className="max-w-md w-full mx-4 shadow-xl">
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
    );
}
