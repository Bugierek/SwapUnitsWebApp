"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useIsMobile } from "@/hooks/use-mobile"

export interface DatePickerProps {
  date?: Date
  onDateChange: (date: Date | undefined) => void
  minDate?: Date
  maxDate?: Date
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function DatePicker({
  date,
  onDateChange,
  minDate,
  maxDate,
  placeholder = "Pick a date",
  className,
  disabled,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const isMobile = useIsMobile()

  const handleSelect = (selectedDate: Date | undefined) => {
    // Normalize the date to UTC midnight to avoid timezone issues
    if (selectedDate) {
      const normalizedDate = new Date(Date.UTC(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate()
      ))
      onDateChange(normalizedDate)
      setOpen(false)
    } else {
      onDateChange(undefined)
    }
  }

  const handleToday = () => {
    onDateChange(undefined)
    setOpen(false)
  }

  const triggerButton = (
    <Button
      variant="outline"
      disabled={disabled}
      className={cn(
        "justify-start text-left font-normal h-8 px-2 gap-2",
        !date && "text-muted-foreground",
        className
      )}
    >
      <CalendarIcon className="h-4 w-4" />
      {date ? format(date, "PP") : <span>{placeholder}</span>}
    </Button>
  )

  const calendarContent = (
    <>
      <Calendar
        mode="single"
        selected={date}
        onSelect={handleSelect}
        disabled={(day) => {
          if (minDate && day < minDate) return true
          if (maxDate && day > maxDate) return true
          return false
        }}
        defaultMonth={date}
        initialFocus
      />
      <div className="border-t p-3">
        <Button
          variant="outline"
          className="w-full"
          onClick={handleToday}
        >
          Today
        </Button>
      </div>
    </>
  )

  // Use Dialog on mobile, Popover on desktop
  if (isMobile) {
    return (
      <>
        <Button
          variant="outline"
          disabled={disabled}
          onClick={() => setOpen(true)}
          className={cn(
            "justify-start text-left font-normal h-8 px-2 gap-2",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="h-4 w-4" />
          {date ? format(date, "PP") : <span>{placeholder}</span>}
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-[calc(100vw-2rem)] p-0">
            <DialogHeader className="px-4 pt-4 pb-0 text-center">
              <DialogTitle>Select date</DialogTitle>
            </DialogHeader>
            <div className="w-full flex justify-center px-4 pb-4">
              <div className="w-fit">
                {calendarContent}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {triggerButton}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {calendarContent}
      </PopoverContent>
    </Popover>
  )
}
