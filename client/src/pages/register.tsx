import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Briefcase, Eye, EyeOff, CheckCircle, Users, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
    whatsappNumber: z.string().min(10, "WhatsApp number is required (include country code, e.g., +1234567890)"),
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
            <div className={`min-h-screen flex items-center justify-center ${isEmployee ? 'bg-gradient-to-br from-amber-50 to-orange-100' : 'bg-gradient-to-br from-blue-50 to-indigo-100'}`}>
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
                            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                                <p className="text-sm text-amber-800 font-medium mb-2">What happens next?</p>
                                <ul className="text-sm text-amber-700 space-y-1">
                                    <li>• An admin will review and verify your account</li>
                                    <li>• Once verified, clients will be assigned to you</li>
                                    <li>• You can then start applying on behalf of clients</li>
                                </ul>
                            </div>
                        )}
                        <div className="text-center text-sm text-slate-600">
                            Please save this ID for your records.
                        </div>
                        <Button className="w-full" asChild>
                            <Link href="/login">Proceed to Login</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Role selection screen
    if (!selectedRole) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
                <div className="max-w-lg w-full mx-4">
                    <div className="text-center mb-8">
                        <Link href="/">
                            <div className="bg-primary text-white p-4 rounded-2xl w-16 h-16 mx-auto mb-4 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity">
                                <Briefcase className="w-8 h-8" />
                            </div>
                        </Link>
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">Join AplyEase</h1>
                        <p className="text-slate-600">Choose how you'd like to use AplyEase</p>
                    </div>

                    <div className="space-y-4">
                        <Card
                            className="cursor-pointer border-2 hover:border-primary transition-colors"
                            onClick={() => setSelectedRole("CLIENT")}
                        >
                            <CardContent className="p-6 flex items-center gap-4">
                                <div className="bg-green-100 p-3 rounded-xl">
                                    <User className="w-8 h-8 text-green-600" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-lg text-slate-900">I'm a Client</h3>
                                    <p className="text-sm text-slate-600">I want applications done for me</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card
                            className="cursor-pointer border-2 hover:border-primary transition-colors"
                            onClick={() => setSelectedRole("EMPLOYEE")}
                        >
                            <CardContent className="p-6 flex items-center gap-4">
                                <div className="bg-blue-100 p-3 rounded-xl">
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
                </div>
            </div>
        );
    }

    // Client registration form
    if (selectedRole === "CLIENT") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
                <div className="max-w-md w-full mx-4">
                    <div className="text-center mb-8">
                        <Link href="/">
                            <div className="bg-primary text-white p-4 rounded-2xl w-16 h-16 mx-auto mb-4 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity">
                                <Briefcase className="w-8 h-8" />
                            </div>
                        </Link>
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">Join as Client</h1>
                        <p className="text-slate-600">Start your career journey today</p>
                        <Button variant="link" className="mt-1 p-0 h-auto text-sm" onClick={() => setSelectedRole(null)}>
                            ← Change role
                        </Button>
                    </div>

                    <Card className="shadow-xl">
                        <CardContent className="p-8">
                            <Form {...clientForm}>
                                <form onSubmit={clientForm.handleSubmit(onClientSubmit)} className="space-y-6">
                                    <FormField
                                        control={clientForm.control}
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
                                        control={clientForm.control}
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
                                        control={clientForm.control}
                                        name="packageTier"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Selected Package</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
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

                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                        {isLoading ? "Creating Account..." : "Create Account"}
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
            </div>
        );
    }

    // Employee registration form
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
            <div className="max-w-md w-full mx-4">
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
                    <CardContent className="p-8">
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
                                                <Input type="tel" placeholder="+1 234 567 8900" {...field} />
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
        </div>
    );
}
