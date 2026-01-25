import { Bell, Briefcase, LogOut, User, Users, Settings, Eye, EyeOff } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogout } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { getInitials, getRoleColor } from "@/lib/auth-utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import type { User as UserType } from "@/types";

interface NavigationHeaderProps {
  user: UserType;
}

export function NavigationHeader({ user }: NavigationHeaderProps) {
  const logout = useLogout();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState(user.geminiApiKey || "");
  const [fallbackApiKey, setFallbackApiKey] = useState((user as any).fallbackGeminiApiKey || "");
  const [preferredModel, setPreferredModel] = useState((user as any).preferredGeminiModel || "gemini-2.5-flash");
  const [showApiKey, setShowApiKey] = useState(false);
  const [showFallbackApiKey, setShowFallbackApiKey] = useState(false);

  const saveSettings = useMutation({
    mutationFn: async (data: { apiKey: string; fallbackApiKey?: string; preferredModel?: string }) => {
      const response = await apiRequest("PUT", `/api/users/${user.id}/gemini-key`, data);
      return response.json();
    },
    onSuccess: async () => {
      toast({
        title: "Settings Saved",
        description: "Your Gemini settings have been saved successfully",
      });
      setShowSettings(false);
      // Force refetch the user data
      await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Save",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    },
  });

  const handleSaveSettings = () => {
    if (!apiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter a valid Gemini API key",
        variant: "destructive",
      });
      return;
    }
    saveSettings.mutate({
      apiKey,
      fallbackApiKey: fallbackApiKey.trim() || undefined,
      preferredModel
    });
  };

  const handleLogout = () => {
    logout.mutate();
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          <div className="flex items-center space-x-2 sm:space-x-6">
            <div className="flex items-center">
              <div className="bg-primary text-white p-1.5 sm:p-2 rounded-lg mr-2 sm:mr-3">
                <Briefcase className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <h1 className="text-base sm:text-xl font-bold text-slate-900">HireEase</h1>
              <span className={`ml-2 sm:ml-3 text-xs font-medium px-2 sm:px-2.5 py-0.5 rounded-full ${getRoleColor(user.role)}`}>
                {user.role}
              </span>
            </div>

            {/* Navigation Links - Now visible on mobile */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {user.role === "CLIENT" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation("/profile")}
                  className="text-slate-700 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                  title="Profile"
                >
                  <User className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Profile</span>
                </Button>
              )}

              {(user.role === "EMPLOYEE" || user.role === "ADMIN") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation("/clients")}
                  className="text-slate-700 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                  title="Clients"
                >
                  <Users className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Clients</span>
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-4">
            {(user.role === "EMPLOYEE" || user.role === "ADMIN") && (
              <Dialog open={showSettings} onOpenChange={setShowSettings}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" title="Settings">
                    <Settings className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Settings</DialogTitle>
                    <DialogDescription>
                      Configure your Gemini AI settings for resume generation
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="preferredModel">Preferred AI Model</Label>
                      <Select value={preferredModel} onValueChange={setPreferredModel}>
                        <SelectTrigger id="preferredModel">
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gemini-3-pro-preview">Gemini 3 Pro Preview (Most Powerful)</SelectItem>
                          <SelectItem value="gemini-3-flash-preview">Gemini 3 Flash Preview (Fastest Intelligent)</SelectItem>
                          <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro (Advanced Thinking)</SelectItem>
                          <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash (Best Price-Performance)</SelectItem>
                          <SelectItem value="gemini-2.5-flash-lite">Gemini 2.5 Flash-Lite (Cost-Efficient)</SelectItem>
                          <SelectItem value="gemini-2.0-flash">Gemini 2.0 Flash (Next-Gen Workhorse)</SelectItem>
                          <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro (High Intelligence)</SelectItem>
                          <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash (Balanced)</SelectItem>
                          <SelectItem value="gemini-1.0-pro">Gemini 1.0 Pro (Legacy Stable)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-500">
                        Higher models are more capable but may have stricter rate limits.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="apiKey">Primary Gemini API Key</Label>
                      <div className="relative">
                        <Input
                          id="apiKey"
                          type={showApiKey ? "text" : "password"}
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="Enter your primary API key"
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowApiKey(!showApiKey)}
                        >
                          {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fallbackApiKey">Fallback API Key (Optional)</Label>
                      <div className="relative">
                        <Input
                          id="fallbackApiKey"
                          type={showFallbackApiKey ? "text" : "password"}
                          value={fallbackApiKey}
                          onChange={(e) => setFallbackApiKey(e.target.value)}
                          placeholder="Enter a backup API key"
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowFallbackApiKey(!showFallbackApiKey)}
                        >
                          {showFallbackApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                      <p className="text-xs text-slate-500">
                        Used automatically if your primary key is overloaded or hits a quota limit.
                      </p>
                    </div>

                    <div className="pt-2">
                      <p className="text-sm text-slate-500">
                        Get your API keys from{" "}
                        <a
                          href="https://aistudio.google.com/app/apikey"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Google AI Studio
                        </a>
                      </p>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowSettings(false);
                          setApiKey(user.geminiApiKey || "");
                          setFallbackApiKey((user as any).fallbackGeminiApiKey || "");
                          setPreferredModel((user as any).preferredGeminiModel || "gemini-1.5-flash");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveSettings}
                        disabled={saveSettings.isPending}
                      >
                        {saveSettings.isPending ? "Saving..." : "Save Settings"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            <Button variant="ghost" size="sm" className="hidden sm:flex" data-testid="button-notifications">
              <Bell className="w-4 h-4" />
            </Button>

            <div className="flex items-center space-x-1 sm:space-x-2">
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${user.role === "ADMIN" ? "bg-red-100" :
                user.role === "CLIENT" ? "bg-green-100" : "bg-blue-100"
                }`}>
                <span className={`text-xs sm:text-sm font-medium ${user.role === "ADMIN" ? "text-red-600" :
                  user.role === "CLIENT" ? "text-green-600" : "text-blue-600"
                  }`} data-testid="text-user-initials">
                  {getInitials(user.name)}
                </span>
              </div>
              <span className="hidden sm:inline text-sm font-medium text-slate-900" data-testid="text-user-name">
                {user.name}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                disabled={logout.isPending}
                data-testid="button-logout"
                className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
