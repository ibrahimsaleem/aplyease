import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isProfileComplete } from "@/lib/profile-utils";
import type { ClientProfile } from "@/types";

/**
 * Hook to check if a client user has a complete profile
 */
export function useProfileCheck(userId: string | undefined, enabled: boolean = true) {
  const { data: profile, isLoading, error } = useQuery<ClientProfile | null>({
    queryKey: ["/api/client-profiles", userId],
    queryFn: async () => {
      if (!userId) return null;
      
      try {
        const res = await apiRequest("GET", `/api/client-profiles/${userId}`);
        if (res.status === 404) {
          return null;
        }
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return res.json();
      } catch (error) {
        // If it's a 404 or network error, return null instead of throwing
        if (error instanceof Error && (error.message.includes('404') || error.message.includes('Failed to fetch'))) {
          return null;
        }
        throw error;
      }
    },
    enabled: enabled && !!userId,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    profile,
    isLoading,
    error,
    hasProfile: !!profile,
    isProfileComplete: isProfileComplete(profile),
  };
}
