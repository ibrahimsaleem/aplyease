import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { ApplicationFilters } from "@/types"

interface MobileFilterProps {
  isOpen: boolean
  onClose: () => void
  onApplyFilters: (filters: Partial<ApplicationFilters>) => void
  currentFilters?: Partial<ApplicationFilters>
  showEmployeeFilter?: boolean
}

export function MobileFilter({ 
  isOpen, 
  onClose, 
  onApplyFilters,
  currentFilters = {},
  showEmployeeFilter = false
}: MobileFilterProps) {
  const [status, setStatus] = useState<string>(currentFilters.status || "all")
  const [sortBy, setSortBy] = useState<string>(currentFilters.sortBy || "dateApplied")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(currentFilters.sortOrder || "desc")

  useEffect(() => {
    if (isOpen) {
      setStatus(currentFilters.status || "all")
      setSortBy(currentFilters.sortBy || "dateApplied")
      setSortOrder(currentFilters.sortOrder || "desc")
    }
  }, [isOpen, currentFilters])

  const handleApply = () => {
    onApplyFilters({
      status: status === "all" ? undefined : status,
      sortBy,
      sortOrder,
    })
    onClose()
  }

  const handleReset = () => {
    setStatus("all")
    setSortBy("dateApplied")
    setSortOrder("desc")
    onApplyFilters({
      status: undefined,
      sortBy: "dateApplied",
      sortOrder: "desc",
    })
    onClose()
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="text-left">Filter Applications</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Status Filter */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Status
            </label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Applied">Applied</SelectItem>
                <SelectItem value="Screening">Screening</SelectItem>
                <SelectItem value="Interview">Interview</SelectItem>
                <SelectItem value="Offer">Offer</SelectItem>
                <SelectItem value="Hired">Hired</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
                <SelectItem value="On Hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort By */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Sort By
            </label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dateApplied">Date Applied</SelectItem>
                <SelectItem value="jobTitle">Job Title</SelectItem>
                <SelectItem value="companyName">Company Name</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort Order */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Order
            </label>
            <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as "asc" | "desc")}>
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Newest First</SelectItem>
                <SelectItem value="asc">Oldest First</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4">
            <Button
              onClick={handleApply}
              className="w-full h-12 text-base"
            >
              Apply Filters
            </Button>
            <Button
              variant="outline"
              onClick={handleReset}
              className="w-full h-12 text-base"
            >
              Reset Filters
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

