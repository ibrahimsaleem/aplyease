import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Briefcase, Eye, EyeOff, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useLogin } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/auth-utils";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { FuturisticBackground } from "@/components/ui/futuristic-background";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().default(false),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { toast } = useToast();
  const login = useLogin();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmit = (data: LoginFormData) => {
    login.mutate(
      { email: data.email, password: data.password },
      {
        onError: (error) => {
          if (isUnauthorizedError(error)) {
            toast({
              title: "Login Failed",
              description: "Invalid email or password",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Error",
              description: error.message || "An unexpected error occurred",
              variant: "destructive",
            });
          }
        },
      }
    );
  };

  const glassCardClass = "bg-white/80 backdrop-blur-md border-white/40 shadow-xl";

  return (
    <FuturisticBackground className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full mx-4 relative">
        <Link href="/">
          <Button variant="ghost" size="sm" className="absolute -top-16 left-0 text-slate-600 hover:text-slate-900">
            <ArrowRight className="h-4 w-4 mr-2 rotate-180" /> Back to Home
          </Button>
        </Link>
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <Link href="/">
            <div className="bg-primary text-white p-4 rounded-2xl w-16 h-16 mx-auto mb-4 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity">
              <Briefcase className="w-8 h-8" />
            </div>
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">HireEase</h1>
          <p className="text-slate-600">AI-Powered Job Application Platform</p>
        </div>

        {/* Login Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className={`shadow-xl ${glassCardClass}`}>
            <CardContent className="p-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="you@example.com"
                            {...field}
                            data-testid="input-email"
                            className="bg-white/50 border-slate-200 focus:bg-white transition-colors"
                          />
                        </FormControl>
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
                              data-testid="input-password"
                              className="bg-white/50 border-slate-200 focus:bg-white transition-colors"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                              data-testid="button-toggle-password"
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
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center justify-between">
                    <FormField
                      control={form.control}
                      name="rememberMe"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-remember"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm text-slate-600">
                              Remember me
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <Button variant="link" className="px-0 text-sm" data-testid="link-forgot-password">
                      Forgot password?
                    </Button>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-primary to-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg"
                    disabled={login.isPending}
                    data-testid="button-sign-in"
                  >
                    {login.isPending ? "Signing in..." : "Sign In"}
                  </Button>

                  <div className="text-center text-sm text-slate-600">
                    Don't have an account?{" "}
                    <Link href="/signup" className="text-primary hover:underline font-medium">
                      Sign up
                    </Link>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </FuturisticBackground>
  );
}
