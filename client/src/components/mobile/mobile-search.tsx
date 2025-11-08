import { useState, useEffect, useRef } from "react"
import { X, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface MobileSearchProps {
  isOpen: boolean
  onClose: () => void
  onSearch: (query: string) => void
  initialValue?: string
}

export function MobileSearch({ 
  isOpen, 
  onClose, 
  onSearch, 
  initialValue = "" 
}: MobileSearchProps) {
  const [searchQuery, setSearchQuery] = useState(initialValue)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSearch = () => {
    onSearch(searchQuery)
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    } else if (e.key === "Escape") {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-slate-200">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="mr-2 min-h-[44px] min-w-[44px]"
        >
          <X className="w-5 h-5" />
        </Button>
        <h2 className="text-lg font-semibold">Search Applications</h2>
      </div>

      {/* Search Input */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search jobs, companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10 h-12 text-base"
          />
        </div>

        {/* Search Button */}
        <Button
          onClick={handleSearch}
          className="w-full mt-4 h-12 text-base"
        >
          <Search className="w-5 h-5 mr-2" />
          Search
        </Button>

        {/* Clear Button */}
        {searchQuery && (
          <Button
            variant="outline"
            onClick={() => setSearchQuery("")}
            className="w-full mt-2 h-12 text-base"
          >
            Clear Search
          </Button>
        )}
      </div>

      {/* Search Tips */}
      <div className="p-4 text-sm text-slate-600">
        <p className="font-medium mb-2">Search Tips:</p>
        <ul className="space-y-1 text-slate-500">
          <li>• Search by job title or company name</li>
          <li>• Use specific keywords for better results</li>
          <li>• Search is case-insensitive</li>
        </ul>
      </div>
    </div>
  )
}

