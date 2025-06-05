"use client"

import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { ModeToggle } from "./mode-toggle"
import { UserNav } from "./user-nav"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import { useRouter } from "next/navigation"
import { useState, useEffect, useRef } from "react"

interface HeaderProps {
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
  } | null
}

export function Header({ user }: HeaderProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmed = query.trim()
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`)
      setQuery("")
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex justify-between h-14 items-center gap-4 px-6">
          {/* Sidebar Trigger */}
          <SidebarTrigger />

          {/* Search Bar */}
          <form onSubmit={handleSubmit} className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="search"
                placeholder="Search..."
                className="pl-10 pr-16 w-full"
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                Ctrl + K
              </kbd>
            </div>
          </form>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {user && <NotificationBell />}
            <ModeToggle />
            <UserNav user={user} />
          </div>
        </div>
    </header>
  )
}
