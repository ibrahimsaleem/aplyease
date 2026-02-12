import { useState } from "react"
import { ExternalLink, FileText, ChevronDown, ChevronUp, Calendar, Building2, MapPin, Globe, Mail } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { getStatusColor, getInitials } from "@/lib/auth-utils"
import type { JobApplication } from "@/types"
import { useTouchGestures } from "@/hooks/use-touch-gestures"

interface ApplicationCardProps {
  application: JobApplication
  onStatusUpdate?: (id: string, status: JobApplication["status"]) => void
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  readonly?: boolean
  selected?: boolean
  onSelect?: (id: string, selected: boolean) => void
  showCheckbox?: boolean
}

export function ApplicationCard({ 
  application, 
  onStatusUpdate,
  onSwipeLeft,
  onSwipeRight,
  readonly = true,
  selected = false,
  onSelect,
  showCheckbox = false
}: ApplicationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showStatusMenu, setShowStatusMenu] = useState(false)

  const { touchHandlers, isSwiping } = useTouchGestures({
    onSwipeLeft,
    onSwipeRight,
    swipeThreshold: 75,
  })

  const statusOptions: JobApplication["status"][] = [
    "Applied",
    "Screening",
    "Interview",
    "Offer",
    "Hired",
    "Rejected",
    "On Hold",
  ]

  const handleStatusChange = (newStatus: JobApplication["status"]) => {
    if (onStatusUpdate) {
      onStatusUpdate(application.id, newStatus)
    }
    setShowStatusMenu(false)
  }

  return (
    <Card 
      className={`mb-4 transition-all duration-200 ${isSwiping ? 'scale-95' : 'scale-100'} ${selected ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
      {...touchHandlers}
    >
      <CardContent className="p-4">
        {/* Header Section - Always Visible */}
        <div className="space-y-3">
          {/* Selection Checkbox */}
          {showCheckbox && onSelect && (
            <div className="flex items-center mb-2">
              <Checkbox
                checked={selected}
                onCheckedChange={(checked) => onSelect(application.id, checked as boolean)}
                className="h-5 w-5"
              />
              <span className="ml-2 text-sm text-slate-600">Select this application</span>
            </div>
          )}
          
          {/* Job Title & Company */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              {application.jobTitle}
            </h3>
            <div className="flex items-center text-slate-600">
              <Building2 className="w-4 h-4 mr-1.5" />
              <span className="text-sm font-medium">{application.companyName}</span>
            </div>
          </div>

          {/* Status & Date Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-600">
                {new Date(application.dateApplied).toLocaleDateString()}
              </span>
            </div>
            
            {!readonly && onStatusUpdate ? (
              <div className="flex flex-col items-end">
                <button
                  onClick={() => setShowStatusMenu(!showStatusMenu)}
                  className="min-h-[44px] px-3 py-2"
                >
                  <Badge className={getStatusColor(application.status)}>
                    {application.status}
                  </Badge>
                </button>
                <span className="text-xs text-blue-600 mt-0.5">Tap to update</span>
              </div>
            ) : (
              <Badge className={getStatusColor(application.status)}>
                {application.status}
              </Badge>
            )}
          </div>

          {/* Status Change Menu */}
          {showStatusMenu && !readonly && (
            <div className="grid grid-cols-2 gap-2 p-2 bg-slate-50 rounded-lg">
              {statusOptions.map((status) => (
                <Button
                  key={status}
                  variant={application.status === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleStatusChange(status)}
                  className="min-h-[44px] text-sm"
                >
                  {status}
                </Button>
              ))}
            </div>
          )}

          {/* Employee Info */}
          <div className="flex items-center space-x-2 py-2 border-t border-slate-100">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 text-xs font-medium">
                {getInitials(application.employee.name)}
              </span>
            </div>
            <div>
              <p className="text-xs text-slate-500">Applied by</p>
              <p className="text-sm font-medium text-slate-700">{application.employee.name}</p>
            </div>
            {application.mailSent && (
              <Badge className="ml-auto bg-green-100 text-green-800 text-xs">
                <Mail className="w-3 h-3 mr-1" />
                Sent
              </Badge>
            )}
          </div>

          {/* Quick Links */}
          {(application.jobLink || application.jobPage || application.resumeUrl || application.additionalLink) && (
            <div className="flex flex-wrap gap-2 pt-2">
              {application.jobLink && (
                <a
                  href={application.jobLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center px-3 py-2 min-h-[44px] bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 mr-1.5" />
                  Job Link
                </a>
              )}
              {application.resumeUrl && (
                <a
                  href={application.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center px-3 py-2 min-h-[44px] bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
                >
                  <FileText className="w-4 h-4 mr-1.5" />
                  Resume
                </a>
              )}
            </div>
          )}

          {/* Expand/Collapse Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-center py-2 min-h-[44px] text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            {isExpanded ? (
              <>
                <span className="mr-2">Show Less</span>
                <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                <span className="mr-2">Show More Details</span>
                <ChevronDown className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Expanded Details Section */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
            {/* Location */}
            {application.location && (
              <div className="flex items-start">
                <MapPin className="w-4 h-4 mr-2 mt-0.5 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Location</p>
                  <p className="text-sm text-slate-700">{application.location}</p>
                </div>
              </div>
            )}

            {/* Portal */}
            {application.portalName && (
              <div className="flex items-start">
                <Globe className="w-4 h-4 mr-2 mt-0.5 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Portal</p>
                  <p className="text-sm text-slate-700">{application.portalName}</p>
                </div>
              </div>
            )}

            {/* Additional Links */}
            {application.jobPage && (
              <div className="pt-2">
                <a
                  href={application.jobPage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center px-3 py-2 min-h-[44px] bg-slate-50 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors"
                >
                  <FileText className="w-4 h-4 mr-1.5" />
                  Job Page
                </a>
              </div>
            )}

            {application.additionalLink && (
              <div>
                <a
                  href={application.additionalLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center px-3 py-2 min-h-[44px] bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 mr-1.5" />
                  Additional Link
                </a>
              </div>
            )}

            {/* Notes */}
            {application.notes && (
              <div className="pt-2">
                <p className="text-xs text-slate-500 mb-1">Notes</p>
                <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg">
                  {application.notes}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

