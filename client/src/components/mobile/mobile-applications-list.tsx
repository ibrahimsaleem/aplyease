import { useState, useCallback, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { RefreshCw } from "lucide-react"
import { ApplicationCard } from "./application-card"
import { apiRequest } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { usePullToRefresh } from "@/hooks/use-touch-gestures"
import type { JobApplication, ApplicationFilters } from "@/types"

interface MobileApplicationsListProps {
  filters?: ApplicationFilters
  readonly?: boolean
}

export function MobileApplicationsList({ 
  filters: initialFilters = {},
  readonly = true 
}: MobileApplicationsListProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [currentLimit, setCurrentLimit] = useState(10)
  const [filters, setFilters] = useState<ApplicationFilters>({
    page: 1,
    limit: currentLimit,
    sortBy: "dateApplied",
    sortOrder: "desc",
    ...initialFilters,
  })

  // Update filters when initialFilters change
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      ...initialFilters,
      limit: currentLimit,
    }))
  }, [initialFilters, currentLimit])

  const { data, isLoading, refetch } = useQuery<{
    applications: JobApplication[]
    total: number
  }>({
    queryKey: ["/api/applications", filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          params.append(key, value.toString())
        }
      })
      const res = await apiRequest("GET", `/api/applications?${params.toString()}`)
      return res.json()
    },
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: JobApplication["status"] }) => {
      const res = await apiRequest("PATCH", `/api/applications/${id}`, { status })
      return res.json()
    },
    onSuccess: () => {
      toast({ title: "Updated", description: "Application status updated" })
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] })
      queryClient.invalidateQueries({ queryKey: ["/api/stats/client"] })
    },
    onError: (e: any) => {
      toast({ 
        title: "Error", 
        description: e.message || "Failed to update status", 
        variant: "destructive" 
      })
    }
  })

  const handleRefresh = useCallback(async () => {
    await refetch()
    toast({ title: "Refreshed", description: "Applications updated" })
  }, [refetch, toast])

  const { isPulling, pullDistance } = usePullToRefresh(handleRefresh)

  const handleLoadMore = () => {
    setCurrentLimit(prev => prev + 10)
  }

  const handleStatusUpdate = (id: string, status: JobApplication["status"]) => {
    updateStatus.mutate({ id, status })
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
            <div className="h-6 bg-slate-200 rounded w-3/4 mb-3"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-slate-200 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Pull to Refresh Indicator */}
      {isPulling && (
        <div 
          className="fixed top-0 left-0 right-0 flex justify-center items-center z-50 transition-all"
          style={{ 
            transform: `translateY(${Math.min(pullDistance, 60)}px)`,
            opacity: Math.min(pullDistance / 60, 1)
          }}
        >
          <div className="bg-white rounded-full p-3 shadow-lg">
            <RefreshCw 
              className={`w-5 h-5 text-primary ${pullDistance > 60 ? 'animate-spin' : ''}`}
              style={{ transform: `rotate(${pullDistance * 3}deg)` }}
            />
          </div>
        </div>
      )}

      {/* Applications List */}
      <div className="space-y-4 pb-24">
        {data?.applications.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500 text-sm">No applications found</p>
            <p className="text-slate-400 text-xs mt-1">Pull down to refresh</p>
          </div>
        ) : (
          <>
            {data?.applications.map((application) => (
              <ApplicationCard
                key={application.id}
                application={application}
                onStatusUpdate={!readonly ? handleStatusUpdate : undefined}
                readonly={readonly}
              />
            ))}

            {/* Load More Button */}
            {(data?.applications.length || 0) < (data?.total || 0) && (
              <div className="flex justify-center py-4">
                <button
                  onClick={handleLoadMore}
                  className="px-6 py-3 min-h-[44px] bg-white border-2 border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                  Load More Applications
                </button>
              </div>
            )}

            {/* Results Info */}
            <div className="text-center py-4 text-sm text-slate-500">
              Showing {data?.applications.length || 0} of {data?.total || 0} applications
            </div>
          </>
        )}
      </div>
    </div>
  )
}

