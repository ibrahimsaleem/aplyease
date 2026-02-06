import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Briefcase, Eye, EyeOff, CheckCircle, Users, User, ArrowRight, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FuturisticBackground } from "@/components/ui/futuristic-background";
import { motion } from "framer-motion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";

const PACKAGE_OPTIONS: Array<{
    value: string;
    label: string;
    price: number;
    applications: number;
}> = [
        { value: "basic", label: "Basic", price: 125, applications: 250 },
        { value: "standard", label: "Standard", price: 299, applications: 500 },
        { value: "premium", label: "Premium", price: 350, applications: 1000 },
        { value: "ultimate", label: "Ultimate Bundle", price: 599, applications: 1000 },
    ];

// Schema for client registration (requires package)
const clientRegisterSchema = z.object({
    name: z.string().min(2, "Name is required"),
    email: z.string().email("Invalid email address"),
    packageTier: z.string().min(1, "Please select a package"),
    includePortfolioWebsite: z.boolean().optional().default(false),
    includeLinkedInOptimization: z.boolean().optional().default(false),
    password: z.string().min(6, "Password must be at least 6 characters").regex(/^(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one uppercase letter and one number"),
    confirmPassword: z.string(),
    confirmPassword2: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
}).refine((data) => data.password === data.confirmPassword2, {
    message: "Passwords don't match",
    path: ["confirmPassword2"],
});

// Schema for employee registration (no package required)
const employeeRegisterSchema = z.object({
    name: z.string().min(2, "Name is required"),
    email: z.string().email("Invalid email address"),
    whatsappNumber: z.string().min(10, "WhatsApp number is required (include country code)"),
    password: z.string().min(6, "Password must be at least 6 characters").regex(/^(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one uppercase letter and one number"),
    confirmPassword: z.string(),
    confirmPassword2: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
}).refine((data) => data.password === data.confirmPassword2, {
    message: "Passwords don't match",
    path: ["confirmPassword2"],
});

type ClientRegisterFormData = z.infer<typeof clientRegisterSchema>;
type EmployeeRegisterFormData = z.infer<typeof employeeRegisterSchema>;

export default function RegisterPage() {
    const { toast } = useToast();
    const [location] = useLocation();
    const [showPassword, setShowPassword] = useState(false);
    const [registeredUserId, setRegisteredUserId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedRole, setSelectedRole] = useState<"CLIENT" | "EMPLOYEE" | null>(null);
    const [couponCode, setCouponCode] = useState("");
    const [showCoupon, setShowCoupon] = useState(false);
    const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
    const [discountPct, setDiscountPct] = useState<number | null>(null);
    const [previewTotal, setPreviewTotal] = useState<number | null>(null);

    // Parse query params for role and package
    const getParamsFromUrl = () => {
        const searchParams = new URLSearchParams(window.location.search);
        return {
            role: searchParams.get("role")?.toUpperCase() as "CLIENT" | "EMPLOYEE" | null,
            package: searchParams.get("package") || "basic",
        };
    };

    // Initialize role from URL
    useEffect(() => {
        const { role } = getParamsFromUrl();
        if (role === "CLIENT" || role === "EMPLOYEE") {
            setSelectedRole(role);
        }
    }, []);

    const clientForm = useForm<ClientRegisterFormData>({
        resolver: zodResolver(clientRegisterSchema),
        defaultValues: {
            name: "",
            email: "",
            packageTier: getParamsFromUrl().package,
            includePortfolioWebsite: false,
            includeLinkedInOptimization: false,
            password: "",
            confirmPassword: "",
            confirmPassword2: "",
        },
    });

    const employeeForm = useForm<EmployeeRegisterFormData>({
        resolver: zodResolver(employeeRegisterSchema),
        defaultValues: {
            name: "",
            email: "",
            whatsappNumber: "",
            password: "",
            confirmPassword: "",
            confirmPassword2: "",
        },
    });

    const onClientSubmit = async (data: ClientRegisterFormData) => {
        setIsLoading(true);
        try {
            const response = await fetch("/api/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...data,
                    role: "CLIENT",
                    couponCode: couponCode.trim() ? couponCode.trim() : undefined,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Registration failed");
            }

            setRegisteredUserId(result.userId);
            toast({
                title: "Registration Successful",
                description: "Your account has been created successfully.",
            });
        } catch (error) {
            toast({
                title: "Registration Failed",
                description: error instanceof Error ? error.message : "An error occurred",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleApplyCoupon = async () => {
        try {
            const packageTier = clientForm.getValues("packageTier");
            if (!packageTier) {
                toast({
                    title: "Select a package first",
                    description: "Please choose a package before applying a coupon.",
                    variant: "destructive",
                });
                return;
            }

            const response = await fetch("/api/register/preview-total", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    packageTier,
                    couponCode: couponCode.trim() || undefined,
                    includePortfolioWebsite: clientForm.getValues("includePortfolioWebsite"),
                    includeLinkedInOptimization: clientForm.getValues("includeLinkedInOptimization"),
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Failed to apply coupon");
            }

            setAppliedCoupon(couponCode.trim() || null);
            setDiscountPct(result.discountPct ?? null);
            setPreviewTotal(typeof result.totalCents === "number" ? Math.round(result.totalCents / 100) : null);

            toast({
                title: "Coupon applied",
                description: "Your discount has been applied to the total price.",
            });
        } catch (error) {
            setAppliedCoupon(null);
            setDiscountPct(null);
            setPreviewTotal(null);
            toast({
                title: "Coupon error",
                description: error instanceof Error ? error.message : "Failed to apply coupon",
                variant: "destructive",
            });
        }
    };

    const onEmployeeSubmit = async (data: EmployeeRegisterFormData) => {
        setIsLoading(true);
        try {
            const response = await fetch("/api/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: data.name,
                    email: data.email,
                    password: data.password,
                    whatsappNumber: data.whatsappNumber,
                    role: "EMPLOYEE",
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Registration failed");
            }

            setRegisteredUserId(result.userId);
            toast({
                title: "Registration Successful",
                description: "Your employee account has been created successfully.",
            });
        } catch (error) {
            toast({
                title: "Registration Failed",
                description: error instanceof Error ? error.message : "An error occurred",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Success screen
    if (registeredUserId) {
        const isEmployee = selectedRole === "EMPLOYEE";
        return (
            <FuturisticBackground className="min-h-screen flex items-start sm:items-center justify-center py-10">
                <Card className="max-w-md w-full mx-4 shadow-xl">
                    <CardHeader className="text-center">
                        <div className={`mx-auto p-3 rounded-full w-16 h-16 flex items-center justify-center mb-4 ${isEmployee ? 'bg-amber-100' : 'bg-green-100'}`}>
                            <CheckCircle className={`w-8 h-8 ${isEmployee ? 'text-amber-600' : 'text-green-600'}`} />
                        </div>
                        <CardTitle className={`text-2xl font-bold ${isEmployee ? 'text-amber-700' : 'text-green-700'}`}>
                            Registration Successful!
                        </CardTitle>
                        <CardDescription>
                            {isEmployee
                                ? "Your employee account has been created and is pending admin verification."
                                : "Your account has been created."
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-center">
                            <p className="text-sm text-slate-500 mb-1">Your User ID</p>
                            <p className="text-xl font-mono font-bold text-slate-900 select-all">{registeredUserId}</p>
                        </div>
                        {isEmployee && (
                            <>
                                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                                    <p className="text-sm text-amber-800 font-medium mb-2">What happens next?</p>
                                    <ul className="text-sm text-amber-700 space-y-1">
                                        <li>• An admin will review and verify your account</li>
                                        <li>• Once verified, clients will be assigned to you</li>
                                        <li>• You can then start applying on behalf of clients</li>
                                    </ul>
                                    <p className="text-sm text-amber-700 mt-2">Book a slot for your verification round.</p>
                                </div>
                                <Button className="w-full bg-[#039BE5] hover:bg-[#0288D1] text-white border-none" asChild>
                                    <a href="https://calendar.app.google/sdYc2yQeTHJRpk4k8" target="_blank" rel="noopener noreferrer">
                                        <Calendar className="mr-2 h-4 w-4" />
                                        Schedule verification meeting
                                    </a>
                                </Button>
                            </>
                        )}
                        <div className="text-center text-sm text-slate-600">
                            Please save this ID for your records.
                        </div>
                        <Button className="w-full" asChild>
                            <Link href="/login">Proceed to Login</Link>
                        </Button>
                    </CardContent>
                </Card>
            </FuturisticBackground>
        );
    }

    // Role selection screen
    if (!selectedRole) {
        return (
            <FuturisticBackground className="min-h-screen flex items-start sm:items-center justify-center py-10">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="max-w-lg w-full mx-4 relative"
                >
                    <div className="mb-4 sm:mb-0 sm:absolute sm:-top-16 sm:left-0">
                        <Link href="/">
                            <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900">
                                <ArrowRight className="h-4 w-4 mr-2 rotate-180" /> Back to Home
                            </Button>
                        </Link>
                    </div>
                    <div className="text-center mb-8">
                        <Link href="/">
                            <div className="bg-primary text-white p-4 rounded-2xl w-16 h-16 mx-auto mb-4 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity shadow-lg shadow-blue-500/20">
                                <Briefcase className="w-8 h-8" />
                            </div>
                        </Link>
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">Join HireEase</h1>
                        <p className="text-slate-600">Choose how you'd like to use HireEase</p>
                    </div>

                    <div className="space-y-4">
                        <Card
                            className="cursor-pointer border-2 hover:border-primary transition-all duration-300 bg-white/80 backdrop-blur-md shadow-xl hover:shadow-2xl group"
                            onClick={() => setSelectedRole("CLIENT")}
                        >
                            <CardContent className="p-6 flex items-center gap-4">
                                <div className="bg-green-100 p-3 rounded-xl group-hover:bg-green-200 transition-colors">
                                    <User className="w-8 h-8 text-green-600" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-lg text-slate-900">I'm a Client</h3>
                                    <p className="text-sm text-slate-600">I want applications done for me</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card
                            className="cursor-pointer border-2 hover:border-primary transition-all duration-300 bg-white/80 backdrop-blur-md shadow-xl hover:shadow-2xl group"
                            onClick={() => setSelectedRole("EMPLOYEE")}
                        >
                            <CardContent className="p-6 flex items-center gap-4">
                                <div className="bg-blue-100 p-3 rounded-xl group-hover:bg-blue-200 transition-colors">
                                    <Users className="w-8 h-8 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-lg text-slate-900">I'm an Employee</h3>
                                    <p className="text-sm text-slate-600">I want to apply on behalf of clients</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="text-center text-sm text-slate-600 mt-6">
                        Already have an account?{" "}
                        <Link href="/login" className="text-primary hover:underline font-medium">
                            Sign in
                        </Link>
                    </div>
                </motion.div>
            </FuturisticBackground>
        );
    }

    // Client registration form
    if (selectedRole === "CLIENT") {
        const selectedPackageValue = clientForm.watch("packageTier");
        const includePortfolioWebsite = clientForm.watch("includePortfolioWebsite");
        const includeLinkedInOptimization = clientForm.watch("includeLinkedInOptimization");

        const selectedPackage = PACKAGE_OPTIONS.find((pkg) => pkg.value === selectedPackageValue);
        const basePrice = selectedPackage?.price ?? 0;
        const addOnTotal = (includePortfolioWebsite ? 149 : 0) + (includeLinkedInOptimization ? 149 : 0);
        const estimatedTotal = basePrice + addOnTotal;

        return (
            <FuturisticBackground className="min-h-screen flex items-start justify-center py-8 sm:py-12">
                <div className="w-full max-w-4xl px-4">
                    <div className="flex items-center justify-between mb-6 sm:mb-8">
                        <div className="flex items-center gap-3">
                            <Link href="/">
                                <div className="bg-primary text-white p-3 rounded-2xl w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity shadow-lg shadow-blue-500/20">
                                    <Briefcase className="w-6 h-6 sm:w-7 sm:h-7" />
                                </div>
                            </Link>
                            <div className="hidden sm:block">
                                <p className="text-xs uppercase tracking-wide text-primary font-semibold mb-1">Get started — Client</p>
                                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Create your HireEase account</h1>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-slate-600 hover:text-slate-900"
                                onClick={() => setSelectedRole(null)}
                            >
                                Switch role
                            </Button>
                            <Link href="/">
                                <Button variant="outline" size="sm" className="hidden sm:inline-flex">
                                    <ArrowRight className="h-4 w-4 mr-2 rotate-180" /> Back
                                </Button>
                            </Link>
                        </div>
                    </div>

                    <div className="mb-6 sm:mb-8 sm:hidden">
                        <h1 className="text-2xl font-bold text-slate-900 mb-1">Create your HireEase account</h1>
                        <p className="text-sm text-slate-600">
                            Choose a package, add optional LinkedIn & portfolio services, and lock your spot.
                        </p>
                    </div>

                    <div className="grid gap-6 lg:gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-start">
                        <Card className="shadow-xl bg-white/90 backdrop-blur">
                            <CardContent className="p-5 sm:p-7">
                            <Form {...clientForm}>
                                <form onSubmit={clientForm.handleSubmit(onClientSubmit)} className="space-y-6">
                                    <FormField
                                        control={clientForm.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Full Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="John Doe" {...field} className="h-11 text-sm sm:text-base" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={clientForm.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Email Address</FormLabel>
                                                <FormControl>
                                                    <Input type="email" placeholder="you@example.com" {...field} className="h-11 text-sm sm:text-base" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={clientForm.control}
                                        name="packageTier"
                                        render={({ field }) => (
                                            <FormItem>
                                                <div className="flex items-center justify-between gap-2">
                                                    <FormLabel>Selected Package</FormLabel>
                                                    {selectedPackage && (
                                                        <span className="text-xs font-medium text-slate-500">
                                                            {selectedPackage.applications} applications included
                                                        </span>
                                                    )}
                                                </div>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-11 text-sm sm:text-base">
                                                            <SelectValue placeholder="Select a package" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {PACKAGE_OPTIONS.map((pkg) => (
                                                            <SelectItem key={pkg.value} value={pkg.value}>
                                                                {pkg.label} (${pkg.price}) — {pkg.applications} applications
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Add-on services */}
                                    <div className="space-y-3 rounded-lg border border-slate-200 p-4 bg-slate-50">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-sm font-medium text-slate-800">Optional Add-ons</p>
                                            <p className="text-[11px] uppercase tracking-wide text-slate-500">
                                                Make your profile stand out
                                            </p>
                                        </div>

                                        <FormField
                                            control={clientForm.control}
                                            name="includePortfolioWebsite"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                    <div className="space-y-1 leading-none">
                                        <FormLabel className="text-sm font-semibold text-slate-800">
                                                            Portfolio Website — $149
                                                        </FormLabel>
                                                        <p className="text-xs text-slate-600">
                                                            Custom, responsive portfolio with domain, SSL, and up to five project showcases.
                                                        </p>
                                                    </div>
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={clientForm.control}
                                            name="includeLinkedInOptimization"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                    <div className="space-y-1 leading-none">
                                                        <FormLabel className="text-sm font-semibold text-slate-800">
                                                            LinkedIn Optimization — $149
                                                        </FormLabel>
                                                        <p className="text-xs text-slate-600">
                                                            Complete LinkedIn makeover plus 10 project and 10 industry insight posts.
                                                        </p>
                                                    </div>
                                                </FormItem>
                                            )}
                                        />

                                        <div className="mt-2 space-y-1 text-xs text-slate-700">
                                            <div className="flex justify-between">
                                                <span>Package price</span>
                                                <span>${basePrice}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Add-ons total</span>
                                                <span>${addOnTotal}</span>
                                            </div>
                                            <div className="flex justify-between font-semibold text-slate-900">
                                                <span>Estimated total (before coupon)</span>
                                                <span>${estimatedTotal}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Coupon code (optional) */}
                                    <Collapsible open={showCoupon} onOpenChange={setShowCoupon}>
                                        <CollapsibleTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="w-full justify-between"
                                            >
                                                <span>Have a coupon?</span>
                                                <span className="text-xs text-slate-500">
                                                    {showCoupon ? "Hide" : "Enter code"}
                                                </span>
                                            </Button>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                            <div className="mt-3 space-y-2">
                                                <FormItem>
                                                    <FormLabel>Coupon Code</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            value={couponCode}
                                                            onChange={(e) => setCouponCode(e.target.value)}
                                                            placeholder="Enter coupon code"
                                                            autoCapitalize="characters"
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    className="w-full"
                                                    onClick={handleApplyCoupon}
                                                >
                                                    Apply Coupon
                                                </Button>
                                                {appliedCoupon && previewTotal !== null && (
                                                    <div className="mt-2 rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800">
                                                        <p className="font-semibold">
                                                            Coupon {appliedCoupon.toUpperCase()} applied
                                                            {discountPct ? ` (${discountPct}% off)` : ""}
                                                        </p>
                                                        <p>New total after discount: ${previewTotal}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </CollapsibleContent>
                                    </Collapsible>

                                    <FormField
                                        control={clientForm.control}
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Password</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Input
                                                            type={showPassword ? "text" : "password"}
                                                            placeholder="••••••••"
                                                            {...field}
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                            onClick={() => setShowPassword(!showPassword)}
                                                        >
                                                            {showPassword ? (
                                                                <EyeOff className="h-4 w-4" />
                                                            ) : (
                                                                <Eye className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                                <p className="text-xs text-slate-500 mt-1">
                                                    Password must contain at least 6 characters, 1 uppercase letter, and 1 number.
                                                </p>
                                            </FormItem>
                                        )}
                                    />

                                    <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                                        <p className="text-sm font-medium text-slate-700">Verify Password (2 times)</p>
                                        <p className="text-xs text-slate-500 mb-2">To ensure you remember your password, please type it two more times.</p>

                                        <FormField
                                            control={clientForm.control}
                                            name="confirmPassword"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input
                                                            type={showPassword ? "text" : "password"}
                                                            placeholder="Confirm Password (1/2)"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={clientForm.control}
                                            name="confirmPassword2"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input
                                                            type={showPassword ? "text" : "password"}
                                                            placeholder="Confirm Password (2/2)"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <div className="space-y-3 pt-2">
                                        <Button type="submit" className="w-full h-11 text-sm sm:text-base" disabled={isLoading}>
                                            {isLoading ? "Creating Account..." : "Create Account"}
                                        </Button>
                                        <p className="text-[11px] text-slate-500 text-center">
                                            By continuing you agree to our standard service terms. No automatic charges.
                                        </p>
                                    </div>

                                    <div className="text-center text-sm text-slate-600">
                                        Already have an account?{" "}
                                        <Link href="/login" className="text-primary hover:underline font-medium">
                                            Sign in
                                        </Link>
                                    </div>
                                </form>
                            </Form>
                        </CardContent>
                        </Card>

                        {/* Right side / summary */}
                        <div className="space-y-4">
                            <Card className="border-slate-200 bg-slate-900 text-slate-50 overflow-hidden">
                                <CardContent className="p-5 sm:p-6">
                                    <p className="text-xs uppercase tracking-wide text-emerald-300 font-semibold mb-2">
                                        Your plan summary
                                    </p>
                                    <h2 className="text-lg sm:text-xl font-semibold mb-4">
                                        {selectedPackage ? selectedPackage.label : "Choose a package"}
                                    </h2>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-300">Package</span>
                                            <span className="font-medium">
                                                ${basePrice}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-300">Add-ons</span>
                                            <span className="font-medium">
                                                ${addOnTotal}
                                            </span>
                                        </div>
                                        <div className="border-t border-slate-700 my-3" />
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs uppercase tracking-wide text-slate-400">
                                                Total before coupon
                                            </span>
                                            <span className="text-xl font-bold text-emerald-300">
                                                ${estimatedTotal}
                                            </span>
                                        </div>
                                        {previewTotal !== null && (
                                            <div className="mt-3 rounded-md bg-emerald-800/40 border border-emerald-500 px-3 py-2 text-xs">
                                                <p className="font-semibold text-emerald-200">
                                                    After coupon: ${previewTotal}
                                                </p>
                                                {discountPct ? (
                                                    <p className="text-emerald-100">
                                                        You’re saving {discountPct}% today.
                                                    </p>
                                                ) : null}
                                            </div>
                                        )}
                                    </div>
                                    <p className="mt-4 text-[11px] text-slate-400">
                                        You’ll see detailed payment instructions on your dashboard. Nothing is charged
                                        automatically.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </FuturisticBackground>
        );
    }

    // Employee registration form
    return (
        <FuturisticBackground className="min-h-screen flex items-start sm:items-center justify-center py-10">
            <div className="max-w-md w-full px-4 relative">
                <div className="mb-4 sm:mb-0 sm:absolute sm:-top-16 sm:left-0">
                    <Link href="/">
                        <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900">
                            <ArrowRight className="h-4 w-4 mr-2 rotate-180" /> Back to Home
                        </Button>
                    </Link>
                </div>
                <div className="text-center mb-8">
                    <Link href="/">
                        <div className="bg-primary text-white p-4 rounded-2xl w-16 h-16 mx-auto mb-4 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity">
                            <Briefcase className="w-8 h-8" />
                        </div>
                    </Link>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Join as Employee</h1>
                    <p className="text-slate-600">Start helping clients land their dream jobs</p>
                    <Button variant="link" className="mt-1 p-0 h-auto text-sm" onClick={() => setSelectedRole(null)}>
                        ← Change role
                    </Button>
                </div>

                <Card className="shadow-xl">
                    <CardContent className="p-6 sm:p-8">
                        <Form {...employeeForm}>
                            <form onSubmit={employeeForm.handleSubmit(onEmployeeSubmit)} className="space-y-6">
                                <FormField
                                    control={employeeForm.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Full Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="John Doe" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={employeeForm.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email Address</FormLabel>
                                            <FormControl>
                                                <Input type="email" placeholder="you@example.com" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={employeeForm.control}
                                    name="whatsappNumber"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>WhatsApp Number</FormLabel>
                                            <FormControl>
                                                <Input type="tel" placeholder="+91 98765 43210" {...field} />
                                            </FormControl>
                                            <p className="text-xs text-slate-500 mt-1">
                                                Include country code. Clients will use this to contact you.
                                            </p>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={employeeForm.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Password</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input
                                                        type={showPassword ? "text" : "password"}
                                                        placeholder="••••••••"
                                                        {...field}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                    >
                                                        {showPassword ? (
                                                            <EyeOff className="h-4 w-4" />
                                                        ) : (
                                                            <Eye className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                            <p className="text-xs text-slate-500 mt-1">
                                                Password must contain at least 6 characters, 1 uppercase letter, and 1 number.
                                            </p>
                                        </FormItem>
                                    )}
                                />

                                <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                                    <p className="text-sm font-medium text-slate-700">Verify Password (2 times)</p>
                                    <p className="text-xs text-slate-500 mb-2">To ensure you remember your password, please type it two more times.</p>

                                    <FormField
                                        control={employeeForm.control}
                                        name="confirmPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input
                                                        type={showPassword ? "text" : "password"}
                                                        placeholder="Confirm Password (1/2)"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={employeeForm.control}
                                        name="confirmPassword2"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input
                                                        type={showPassword ? "text" : "password"}
                                                        placeholder="Confirm Password (2/2)"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading ? "Creating Account..." : "Create Employee Account"}
                                </Button>

                                <div className="text-center text-sm text-slate-600">
                                    Already have an account?{" "}
                                    <Link href="/login" className="text-primary hover:underline font-medium">
                                        Sign in
                                    </Link>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
        </FuturisticBackground>
    );
}
