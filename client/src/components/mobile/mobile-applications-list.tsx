import { useState, useCallback, useEffect, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { RefreshCw, CheckSquare, Square, X } from "lucide-react"
import { ApplicationCard } from "./application-card"
import { apiRequest } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { usePullToRefresh } from "@/hooks/use-touch-gestures"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAuth } from "@/hooks/use-auth"
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
  const { user: currentUser } = useAuth()
  const [currentLimit, setCurrentLimit] = useState(10)
  const [filters, setFilters] = useState<ApplicationFilters>({
    page: 1,
    limit: currentLimit,
    sortBy: "dateApplied",
    sortOrder: "desc",
    ...initialFilters,
  })
  const [selectedApplications, setSelectedApplications] = useState<Set<string>>(new Set())
  const [showBulkStatusDialog, setShowBulkStatusDialog] = useState(false)
  const [bulkStatusTarget, setBulkStatusTarget] = useState<JobApplication["status"] | null>(null)
  
  // Ref to store scroll position before loading more
  const scrollPositionRef = useRef<number>(0)
  const isLoadingMoreRef = useRef<boolean>(false)

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

  const handleLoadMore = useCallback(() => {
    // Store current scroll position before loading more
    scrollPositionRef.current = window.scrollY
    isLoadingMoreRef.current = true
    setCurrentLimit(prev => prev + 10)
  }, [])

  // Restore scroll position after loading more data
  useEffect(() => {
    if (isLoadingMoreRef.current && !isLoading && data) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        window.scrollTo({
          top: scrollPositionRef.current,
          behavior: 'instant'
        })
        isLoadingMoreRef.current = false
      })
    }
  }, [isLoading, data])

  const handleStatusUpdate = (id: string, status: JobApplication["status"]) => {
    updateStatus.mutate({ id, status })
  }

  const updateBulkStatus = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: JobApplication["status"] }) => {
      const res = await apiRequest("PATCH", "/api/applications/bulk", { ids, status })
      return res.json()
    },
    onSuccess: (_, variables) => {
      toast({ title: "Updated", description: `${variables.ids.length} application${variables.ids.length > 1 ? "s" : ""} updated to ${variables.status}` })
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] })
      queryClient.invalidateQueries({ queryKey: ["/api/stats/client"] })
      setSelectedApplications(new Set())
      setShowBulkStatusDialog(false)
      setBulkStatusTarget(null)
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message || "Failed to update status", variant: "destructive" })
      setShowBulkStatusDialog(false)
      setBulkStatusTarget(null)
    }
  })

  const handleSelectApplication = (id: string, selected: boolean) => {
    setSelectedApplications(prev => {
      const newSet = new Set(prev)
      if (selected) {
        newSet.add(id)
      } else {
        newSet.delete(id)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    const selectableApps = data?.applications.filter(app => canUpdate(app)) || []
    if (selectedApplications.size === selectableApps.length) {
      setSelectedApplications(new Set())
    } else {
      const allIds = new Set(selectableApps.map(app => app.id))
      setSelectedApplications(allIds)
    }
  }

  const handleBulkStatusClick = (status: JobApplication["status"]) => {
    setBulkStatusTarget(status)
  }

  const handleBulkStatusConfirm = () => {
    if (bulkStatusTarget && selectedApplications.size > 0) {
      updateBulkStatus.mutate({ ids: Array.from(selectedApplications), status: bulkStatusTarget })
    } else {
      toast({ title: "Error", description: "Please select a status", variant: "destructive" })
    }
  }

  const canShowSelection = !readonly && (currentUser?.role === "ADMIN" || currentUser?.role === "CLIENT" || currentUser?.role === "EMPLOYEE")
  
  const canUpdate = (app: JobApplication) => {
    if (!currentUser) return false
    if (currentUser.role === "EMPLOYEE") return app.employeeId === currentUser.id
    if (currentUser.role === "CLIENT") return app.clientId === currentUser.id
    return currentUser.role === "ADMIN"
  }
  const statusOptions: JobApplication["status"][] = [
    "Applied",
    "Screening",
    "Interview",
    "Offer",
    "Hired",
    "Rejected",
    "On Hold",
  ]

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

      {/* Selection Mode Header */}
      {canShowSelection && (
        <div className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between mb-4">
          <button
            onClick={handleSelectAll}
            className="flex items-center space-x-2 text-sm font-medium text-slate-700"
          >
            {(() => {
              const selectableApps = data?.applications.filter(app => canUpdate(app)) || []
              const allSelected = selectedApplications.size === selectableApps.length && selectableApps.length > 0
              return allSelected ? (
                <CheckSquare className="w-5 h-5 text-blue-600" />
              ) : (
                <Square className="w-5 h-5 text-slate-400" />
              )
            })()}
            <span>
              {(() => {
                const selectableApps = data?.applications.filter(app => canUpdate(app)) || []
                const allSelected = selectedApplications.size === selectableApps.length && selectableApps.length > 0
                return allSelected ? "Deselect All" : "Select All"
              })()}
            </span>
          </button>
          {selectedApplications.size > 0 && (
            <button
              onClick={() => setSelectedApplications(new Set())}
              className="text-sm text-slate-600 flex items-center space-x-1"
            >
              <X className="w-4 h-4" />
              <span>Clear ({selectedApplications.size})</span>
            </button>
          )}
        </div>
      )}

      {/* Applications List */}
      <div className="space-y-4 pb-32">
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
                selected={selectedApplications.has(application.id)}
                onSelect={canShowSelection && canUpdate(application) ? handleSelectApplication : undefined}
                showCheckbox={canShowSelection && canUpdate(application)}
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

      {/* Floating Action Bar for Bulk Operations */}
      {canShowSelection && selectedApplications.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-700">
              {selectedApplications.size} selected
            </span>
            <button
              onClick={() => setSelectedApplications(new Set())}
              className="text-sm text-slate-500"
            >
              Clear
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => handleBulkStatusClick("Rejected")}
              variant="outline"
              className="w-full"
            >
              Mark Rejected
            </Button>
            <Button
              onClick={() => setShowBulkStatusDialog(true)}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Update Status
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Status Update Dialog */}
      <Dialog open={showBulkStatusDialog} onOpenChange={setShowBulkStatusDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Status</DialogTitle>
            <DialogDescription>
              Select a status to update {selectedApplications.size} application{selectedApplications.size > 1 ? "s" : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 py-4">
            {statusOptions.map((status) => (
              <Button
                key={status}
                variant={bulkStatusTarget === status ? "default" : "outline"}
                onClick={() => handleBulkStatusClick(status)}
                className="min-h-[44px]"
              >
                {status}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowBulkStatusDialog(false)
                setBulkStatusTarget(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkStatusConfirm}
              disabled={!bulkStatusTarget || updateBulkStatus.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updateBulkStatus.isPending ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

