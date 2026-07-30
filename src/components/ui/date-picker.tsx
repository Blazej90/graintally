"use client"

import * as React from "react"
import { format, parseISO, isValid } from "date-fns"
import { pl } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { pl as dayPickerPl } from "react-day-picker/locale"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

function toISODate(date: Date | undefined): string {
  if (!date || !isValid(date)) return ""
  return format(date, "yyyy-MM-dd")
}

function fromISODate(value: string): Date | undefined {
  if (!value) return undefined
  const parsed = parseISO(value)
  return isValid(parsed) ? parsed : undefined
}

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Wybierz datę",
  disabled,
  className,
  id,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const date = fromISODate(value)
  const display = date ? format(date, "dd.MM.yyyy", { locale: pl }) : placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 size-4 shrink-0" />
          {display}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(selected) => {
            onChange(toISODate(selected))
            setOpen(false)
          }}
          locale={dayPickerPl}
        />
      </PopoverContent>
    </Popover>
  )
}

interface DateRangePickerProps {
  from: string
  to: string
  onChange: (range: { from: string; to: string }) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DateRangePicker({
  from,
  to,
  onChange,
  placeholder = "Wybierz zakres",
  disabled,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  const fromDate = fromISODate(from)
  const toDate = fromISODate(to)
  const selectedRange =
    fromDate && toDate
      ? { from: fromDate, to: toDate }
      : fromDate
        ? { from: fromDate, to: fromDate }
        : undefined

  const display =
    fromDate && toDate
      ? `${format(fromDate, "dd.MM.yyyy", { locale: pl })} - ${format(toDate, "dd.MM.yyyy", { locale: pl })}`
      : fromDate
        ? `${format(fromDate, "dd.MM.yyyy", { locale: pl })} - ...`
        : placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !from && !to && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 size-4 shrink-0" />
          <span className="truncate">{display}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={selectedRange}
          onSelect={(range) => {
            onChange({
              from: toISODate(range?.from),
              to: toISODate(range?.to),
            })
            if (range?.from && range?.to) {
              setOpen(false)
            }
          }}
          locale={dayPickerPl}
        />
      </PopoverContent>
    </Popover>
  )
}
