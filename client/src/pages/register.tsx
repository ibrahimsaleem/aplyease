import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Briefcase, Eye, EyeOff, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const registerSchema = z.object({
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

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
    const { toast } = useToast();
    const [location] = useLocation();
    const [showPassword, setShowPassword] = useState(false);
    const [registeredUserId, setRegisteredUserId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Parse query params for package
    const getPackageFromUrl = () => {
        const searchParams = new URLSearchParams(window.location.search);
        return searchParams.get("package") || "basic";
    };

    const form = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            name: "",
            email: "",
            packageTier: getPackageFromUrl(),
            password: "",
            confirmPassword: "",
            confirmPassword2: "",
        },
    });

    // Update form value if URL changes (though usually it won't without reload)
    useEffect(() => {
        const pkg = getPackageFromUrl();
        if (pkg) {
            form.setValue("packageTier", pkg);
        }
    }, []);

    const onSubmit = async (data: RegisterFormData) => {
        setIsLoading(true);
        try {
            const response = await fetch("/api/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
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

    if (registeredUserId) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                <Card className="max-w-md w-full mx-4 shadow-xl">
                    <CardHeader className="text-center">
                        <div className="mx-auto bg-green-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-green-700">Registration Successful!</CardTitle>
                        <CardDescription>
                            Your account has been created.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-center">
                            <p className="text-sm text-slate-500 mb-1">Your User ID</p>
                            <p className="text-xl font-mono font-bold text-slate-900 select-all">{registeredUserId}</p>
                        </div>
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

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
            <div className="max-w-md w-full mx-4">
                {/* Logo and Branding */}
                <div className="text-center mb-8">
                    <Link href="/">
                        <div className="bg-primary text-white p-4 rounded-2xl w-16 h-16 mx-auto mb-4 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity">
                            <Briefcase className="w-8 h-8" />
                        </div>
                    </Link>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Join AplyEase</h1>
                    <p className="text-slate-600">Start your career journey today</p>
                </div>

                {/* Register Form */}
                <Card className="shadow-xl">
                    <CardContent className="p-8">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <FormField
                                    control={form.control}
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
                                    control={form.control}
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
                                    control={form.control}
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
                                                    <SelectItem value="basic">Basic ($125)</SelectItem>
                                                    <SelectItem value="standard">Standard ($299)</SelectItem>
                                                    <SelectItem value="premium">Premium ($350)</SelectItem>
                                                    <SelectItem value="ultimate">Ultimate Bundle ($599)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
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
                                        control={form.control}
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
                                        control={form.control}
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
