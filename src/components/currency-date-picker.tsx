"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface CurrencyDatePickerProps {
  date: Date | undefined
  onDateChange: (date: Date | undefined) => void
  disabled?: boolean
  className?: string
}

export function CurrencyDatePicker({
  date,
  onDateChange,
  disabled = false,
  className,
}: CurrencyDatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  
  // Frankfurter has data from 1999-01-04
  const minDate = new Date('1999-01-04')
  const maxDate = new Date() // Today
  
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }
  
  const isToday = date && date.toDateString() === maxDate.toDateString()
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? (
            <>
              {formatDate(date)}
              {isToday && (
                <span className="ml-2 text-xs text-muted-foreground">(Latest)</span>
              )}
            </>
          ) : (
            <span>Select date for historical rates</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(newDate: Date | undefined) => {
            onDateChange(newDate)
            setIsOpen(false)
          }}
          disabled={(date: Date) => 
            date < minDate || date > maxDate
          }
          initialFocus
          defaultMonth={date || maxDate}
        />
        <div className="border-t p-3 text-xs text-muted-foreground">
          <p>Data available: Jan 4, 1999 - Today</p>
          <p className="mt-1">Note: Rates stored in UTC timezone</p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
