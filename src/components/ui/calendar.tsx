"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, DayPickerProps, CaptionProps, useNavigation } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type CalendarProps = DayPickerProps

interface CustomCaptionProps extends CaptionProps {
  fromYear: number
  toYear: number
}

function CustomCaption(props: CustomCaptionProps) {
  const { goToMonth, nextMonth, previousMonth } = useNavigation()
  const { fromYear, toYear, calendarMonth } = props
  
  const currentMonth = calendarMonth.date
  
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]
  
  const years = Array.from(
    { length: toYear - fromYear + 1 },
    (_, i) => fromYear + i
  )

  return (
    <div className="flex items-center justify-center gap-2 pt-1 mb-2">
      {/* Previous arrow */}
      <Button
        variant="outline"
        className="h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        disabled={!previousMonth}
        onClick={() => previousMonth && goToMonth(previousMonth)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      {/* Month dropdown */}
      <Select
        value={currentMonth.getMonth().toString()}
        onValueChange={(value) => {
          const newDate = new Date(currentMonth)
          newDate.setMonth(parseInt(value))
          goToMonth(newDate)
        }}
      >
        <SelectTrigger className="h-7 w-[110px] text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper">
          {months.map((month, i) => (
            <SelectItem key={i} value={i.toString()}>
              {month}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {/* Year dropdown */}
      <Select
        value={currentMonth.getFullYear().toString()}
        onValueChange={(value) => {
          const newDate = new Date(currentMonth)
          newDate.setFullYear(parseInt(value))
          goToMonth(newDate)
        }}
      >
        <SelectTrigger className="h-7 w-[80px] text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper">
          {years.map((year) => (
            <SelectItem key={year} value={year.toString()}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {/* Next arrow */}
      <Button
        variant="outline"
        className="h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        disabled={!nextMonth}
        onClick={() => nextMonth && goToMonth(nextMonth)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const fromYear = 1999
  const toYear = new Date().getFullYear()
  
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      fixedWeeks
      fromYear={fromYear}
      toYear={toYear}
      className={cn("p-3", className)}
      components={{
        MonthCaption: (captionProps) => <CustomCaption {...captionProps} fromYear={fromYear} toYear={toYear} />,
      }}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        month_caption: "invisible",
        caption_label: "invisible",
        nav: "hidden",
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex",
        weekday:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        week: "flex w-full mt-2",
        day: "h-9 w-9 text-center text-sm p-0 relative",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 cursor-pointer"
        ),
        range_end: "day-range-end",
        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        today: "bg-accent text-accent-foreground",
        outside:
          "day-outside text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        disabled: "text-muted-foreground opacity-50",
        range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
