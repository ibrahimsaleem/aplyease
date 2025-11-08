import { Search, Filter, RefreshCw, Download, User } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BottomNavigationProps {
  onSearchClick: () => void
  onFilterClick: () => void
  onRefreshClick: () => void
  onExportClick?: () => void
  onProfileClick?: () => void
  showExport?: boolean
  showProfile?: boolean
}

export function BottomNavigation({
  onSearchClick,
  onFilterClick,
  onRefreshClick,
  onExportClick,
  onProfileClick,
  showExport = false,
  showProfile = false,
}: BottomNavigationProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-40 safe-area-bottom">
      <div className="grid grid-cols-4 gap-1 p-2">
        <Button
          variant="ghost"
          onClick={onSearchClick}
          className="flex flex-col items-center justify-center h-16 space-y-1 hover:bg-slate-100"
        >
          <Search className="w-5 h-5" />
          <span className="text-xs">Search</span>
        </Button>

        <Button
          variant="ghost"
          onClick={onFilterClick}
          className="flex flex-col items-center justify-center h-16 space-y-1 hover:bg-slate-100"
        >
          <Filter className="w-5 h-5" />
          <span className="text-xs">Filter</span>
        </Button>

        <Button
          variant="ghost"
          onClick={onRefreshClick}
          className="flex flex-col items-center justify-center h-16 space-y-1 hover:bg-slate-100"
        >
          <RefreshCw className="w-5 h-5" />
          <span className="text-xs">Refresh</span>
        </Button>

        {showProfile && onProfileClick ? (
          <Button
            variant="ghost"
            onClick={onProfileClick}
            className="flex flex-col items-center justify-center h-16 space-y-1 hover:bg-slate-100"
          >
            <User className="w-5 h-5" />
            <span className="text-xs">Profile</span>
          </Button>
        ) : showExport && onExportClick ? (
          <Button
            variant="ghost"
            onClick={onExportClick}
            className="flex flex-col items-center justify-center h-16 space-y-1 hover:bg-slate-100"
          >
            <Download className="w-5 h-5" />
            <span className="text-xs">Export</span>
          </Button>
        ) : null}
      </div>
    </div>
  )
}

