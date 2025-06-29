"use client"

import { useState, useEffect } from 'react'
import { Search, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import UserInfo from '@/components/UserInfo'
import SearchModal from '@/components/SearchModal'
import { useRouter } from 'next/navigation'

interface HeaderProps {
  onSelectStock?: (symbol: string, name: string) => void
}

export default function Header({ onSelectStock }: HeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const router = useRouter()

  const handleSelectStock = (symbol: string, name: string) => {
    if (onSelectStock) {
      onSelectStock(symbol, name)
    } else {
      // Default behavior: navigate to stock page
      router.push(`/stock/${symbol}`)
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="28" 
                  height="28" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  className="text-blue-600"
                >
                  <path d="M3 3v18h18"/>
                  <path d="m19 9-5 5-4-4-3 3"/>
                </svg>
                <h1 className="text-xl font-bold text-gray-900 hidden sm:block">
                  Signal
                </h1>
              </div>
            </div>

            {/* Desktop Search Bar */}
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <button
                onClick={() => setIsSearchOpen(true)}
                className="flex w-full items-center gap-3 rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-left text-sm text-gray-500 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Search className="h-4 w-4" />
                <span>Search stocks...</span>
                <kbd className="ml-auto hidden font-sans text-xs text-gray-400 sm:inline-block">
                  ⌘K
                </kbd>
              </button>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              {/* Mobile Search Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSearchOpen(true)}
                className="md:hidden"
              >
                <Search className="h-5 w-5" />
              </Button>

              {/* Desktop User Info */}
              <div className="hidden sm:block">
                <UserInfo />
              </div>

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="sm:hidden"
              >
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="border-t border-gray-200 pb-3 pt-4 sm:hidden">
              <div className="space-y-1">
                <UserInfo />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectStock={handleSelectStock}
      />

      {/* Global Keyboard Shortcut */}
      <div className="sr-only">
        <button
          onClick={() => setIsSearchOpen(true)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
              e.preventDefault()
              setIsSearchOpen(true)
            }
          }}
        />
      </div>
    </>
  )
}

// Hook for global keyboard shortcut
export function useSearchShortcut(onOpen: () => void) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onOpen()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onOpen])
}