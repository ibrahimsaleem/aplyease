import { Bell, Briefcase, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLogout } from "@/hooks/use-auth";
import { getInitials, getRoleColor } from "@/lib/auth-utils";
import type { User as UserType } from "@/types";

interface NavigationHeaderProps {
  user: UserType;
}

export function NavigationHeader({ user }: NavigationHeaderProps) {
  const logout = useLogout();

  const handleLogout = () => {
    logout.mutate();
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="bg-primary text-white p-2 rounded-lg mr-3">
              <Briefcase className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">AplyEase Portal</h1>
            <span className={`ml-3 text-xs font-medium px-2.5 py-0.5 rounded-full ${getRoleColor(user.role)}`}>
              {user.role}
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" data-testid="button-notifications">
              <Bell className="w-4 h-4" />
            </Button>
            
            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                user.role === "ADMIN" ? "bg-red-100" : 
                user.role === "CLIENT" ? "bg-green-100" : "bg-blue-100"
              }`}>
                <span className={`text-sm font-medium ${
                  user.role === "ADMIN" ? "text-red-600" : 
                  user.role === "CLIENT" ? "text-green-600" : "text-blue-600"
                }`} data-testid="text-user-initials">
                  {getInitials(user.name)}
                </span>
              </div>
              <span className="text-sm font-medium text-slate-900" data-testid="text-user-name">
                {user.name}
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                disabled={logout.isPending}
                data-testid="button-logout"
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
