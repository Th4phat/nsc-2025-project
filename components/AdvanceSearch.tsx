"use client";

import React from "react";
import { Search, Check, ChevronsUpDown, Calendar as CalendarIcon } from "lucide-react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "./ui/popover";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "./ui/select";
import {
  Command,
  CommandList,
  CommandInput,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "./ui/command";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";
import { Calendar } from "./ui/calendar";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import type { DateRange } from "react-day-picker";
import { th } from "date-fns/locale";
import { SheetTrigger, SheetContent,Sheet } from "./ui/sheet";
type MatchMode = "exact" | "loosely";

type Option = {
  value: string;
  label: string;
};

function toLocalYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fromYMD(ymd: string | null): Date | undefined {
  if (!ymd) return undefined;
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

/**
 * Calculate similarity between two strings as a value between 0 and 1.
 * Uses a normalized Levenshtein distance: 1 - (distance / maxLen).
 *
 * Returns:
 *  - 1.0 for identical strings
 *  - 0.0 for completely different strings
 */
function calculateTextSimilarity(a: string, b: string): number {
  const s1 = a ?? "";
  const s2 = b ?? "";
  if (s1 === s2) return 1;
  const len1 = s1.length;
  const len2 = s2.length;
  if (len1 === 0 || len2 === 0) return 0;

  // Levenshtein distance (iterative, O(len1 * len2) time, O(len2) space)
  const prevRow: number[] = new Array(len2 + 1);
  for (let j = 0; j <= len2; j++) prevRow[j] = j;

  for (let i = 1; i <= len1; i++) {
    let currRow: number[] = new Array(len2 + 1);
    currRow[0] = i;
    for (let j = 1; j <= len2; j++) {
      const cost = s1.charAt(i - 1) === s2.charAt(j - 1) ? 0 : 1;
      currRow[j] = Math.min(
        prevRow[j] + 1,      // deletion
        currRow[j - 1] + 1,  // insertion
        prevRow[j - 1] + cost // substitution
      );
    }
    // copy currRow to prevRow for next iteration
    for (let j = 0; j <= len2; j++) prevRow[j] = currRow[j];
  }

  const distance = prevRow[len2];
  const maxLen = Math.max(len1, len2);
  return Math.max(0, 1 - distance / maxLen);
}

function SelectedBadges({
  selected,
  options,
  max = 3,
}: {
  selected: string[];
  options: Option[];
  max?: number;
}) {
  if (!selected.length) return <span className="text-muted-foreground">ทั้งหมด</span>;
  const byValue = new Map(options.map((o) => [o.value, o.label]));
  const labels = selected.map((v) => byValue.get(v) ?? v);
  const shown = labels.slice(0, max);
  const more = labels.length - shown.length;
  return (
    <div className="flex gap-1 flex-wrap">
      {shown.map((l, i) => (
        <Badge key={i} variant="secondary" className="text-xs">
          {l}
        </Badge>
      ))}
      {more > 0 && (
        <Badge variant="outline" className="text-xs">
          +{more}
        </Badge>
      )}
    </div>
  );
}

function MultiSelectCombobox({
  value,
  onChange,
  options,
  placeholder = "เลือกตัวเลือก",
  emptyText = "ไม่มีตัวเลือก",
  searchPlaceholder = "ค้นหา...",
  buttonClassName,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  options: Option[];
  placeholder?: string;
  emptyText?: string;
  searchPlaceholder?: string;
  buttonClassName?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 640px)");
    const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    if ("addEventListener" in mq) {
      mq.addEventListener("change", listener);
    } else {
      // Safari fallback
      // @ts-ignore
      mq.addListener(listener);
    }
    return () => {
      if ("removeEventListener" in mq) {
        mq.removeEventListener("change", listener);
      } else {
        // @ts-ignore
        mq.removeListener(listener);
      }
    };
  }, []);

  const toggle = (v: string) => {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };

  const listNode = (
    <Command>
      <CommandInput placeholder={searchPlaceholder} />
      <CommandList>
        <CommandEmpty>{emptyText}</CommandEmpty>
        <CommandGroup>
          {options.map((opt) => {
            const checked = value.includes(opt.value);
            return (
              <CommandItem
                key={opt.value}
                value={opt.label}
                onSelect={() => toggle(opt.value)}
                className="gap-2"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggle(opt.value)}
                  aria-label={opt.label}
                />
                <span className="flex-1">{opt.label}</span>
                {checked ? (
                  <Check className="h-4 w-4 opacity-100" />
                ) : (
                  <Check className="h-4 w-4 opacity-0" />
                )}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </Command>
  );

  // Use a bottom Sheet on small screens for better mobile usability,
  // and a Popover on larger screens.
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={buttonClassName ?? "w-full justify-between"}
          >
            <div className="truncate flex-1 text-left">
              <SelectedBadges selected={value} options={options} />
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </SheetTrigger>

        <SheetContent side="bottom" className="p-0 max-h-[80vh]">
          <div className="p-3">
            <div className="mb-2">
              <Input placeholder={searchPlaceholder} onChange={() => {}} />
            </div>
            <div className="h-[48vh] overflow-y-auto">
              {listNode}
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                ปิด
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={buttonClassName ?? "w-full justify-between"}
        >
          <div className="truncate flex-1 text-left">
            <SelectedBadges selected={value} options={options} />
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full sm:w-[320px] p-0" align="start">
        {listNode}
      </PopoverContent>
    </Popover>
  );
}

export function AdvancedSearchBar({
  // basic search
  searchTerm,
  setSearchTerm,
  // collapse
  isAdvancedOpen,
  setIsAdvancedOpen,
  // filters
  availableAuthors,
  availableCategories,
  authorFilter,
  setAuthorFilter,
  categoryFilter,
  setCategoryFilter,
  mimeTypesFilter,
  setMimeTypesFilter,
  fileTypeOptions,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  matchMode,
  setMatchMode,
  onClear,
  // labels
  labels,
}: {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  isAdvancedOpen: boolean;
  setIsAdvancedOpen: (v: boolean) => void;
  availableAuthors: string[];
  availableCategories: string[];
  authorFilter: string | null;
  setAuthorFilter: (v: string | null) => void;
  categoryFilter: string | null;
  setCategoryFilter: (v: string | null) => void;
  mimeTypesFilter: string[];
  setMimeTypesFilter: (v: string[]) => void;
  fileTypeOptions: Option[];
  dateFrom: string | null;
  setDateFrom: (v: string | null) => void;
  dateTo: string | null;
  setDateTo: (v: string | null) => void;
  matchMode: MatchMode;
  setMatchMode: (v: MatchMode) => void;
  onClear: () => void;
  labels?: Partial<{
    searchPlaceholder: string;
    advanced: string;
    author: string;
    any: string;
    category: string;
    fileType: string;
    dateRange: string;
    matchMode: string;
    clear: string;
    dateAny: string;
  }>;
}) {
  const L = {
    searchPlaceholder: "ค้นหาเอกสารด้วยคำสำคัญ...",
    advanced: "ขั้นสูง",
    author: "ผู้เขียน",
    any: "ทั้งหมด",
    category: "หมวดหมู่",
    fileType: "ประเภทไฟล์",
    dateRange: "ช่วงวันที่",
    matchMode: "โหมดการค้นหา",
    clear: "ล้างตัวกรอง",
    dateAny: "ทุกวันที่",
    ...labels,
  };

  const [range, setRange] = React.useState<DateRange | undefined>(() => {
    const from = fromYMD(dateFrom ?? null);
    const to = fromYMD(dateTo ?? null);
    return from || to ? { from: from, to: to } : undefined;
  });

  React.useEffect(() => {
    const from = fromYMD(dateFrom ?? null);
    const to = fromYMD(dateTo ?? null);
    setRange(from || to ? { from, to } : undefined);
  }, [dateFrom, dateTo]);

  const applyRange = (r?: DateRange) => {
    setRange(r);
    setDateFrom(r?.from ? toLocalYMD(r.from) : null);
    setDateTo(r?.to ? toLocalYMD(r.to) : null);
  };

  const goClear = () => {
    onClear();
  };

  const matchModeItems: { value: MatchMode; label: string }[] = [
    { value: "exact", label: "ตรงทั้งหมด" },
    { value: "loosely", label: "ใกล้เคียง" },
  ];

  return (
    <div className="w-full max-w-xl">
      <Label htmlFor="search" className="sr-only">
        {L.searchPlaceholder}
      </Label>

      <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
        <div className="flex gap-2 items-center">
          <div className="relative w-full">
            <Input
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={L.searchPlaceholder}
              className="pl-10 h-10"
            />
            <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
          </div>

          <CollapsibleTrigger asChild>
            <Button
              variant="outline"
              size="default"
              className="whitespace-nowrap"
              aria-expanded={isAdvancedOpen}
            >
              {L.advanced}
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <div className="mt-4 p-3 bg-white dark:bg-slate-900 border rounded-md shadow-sm max-h-[70vh] overflow-y-auto pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">{L.author}</Label>
                <Select
                  value={authorFilter ?? "__ALL__"}
                  onValueChange={(v) => setAuthorFilter(v === "__ALL__" ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={L.any} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ALL__">{L.any}</SelectItem>
                    {availableAuthors.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a.slice(0, 8)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-sm">{L.category}</Label>
                <Select
                  value={categoryFilter ?? "__ALL__"}
                  onValueChange={(v) => setCategoryFilter(v === "__ALL__" ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={L.any} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ALL__">{L.any}</SelectItem>
                    {availableCategories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-sm">{L.fileType}</Label>
                <MultiSelectCombobox
                  value={mimeTypesFilter}
                  onChange={setMimeTypesFilter}
                  options={fileTypeOptions}
                  placeholder={L.any}
                  emptyText="ไม่มีประเภทไฟล์"
                  searchPlaceholder="กรองประเภทไฟล์..."
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm">{L.dateRange}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {range?.from ? (
                        range.to ? (
                          <>
                            {toLocalYMD(range.from)} – {toLocalYMD(range.to)}
                          </>
                        ) : (
                          toLocalYMD(range.from)
                        )
                      ) : (
                        <span className="text-muted-foreground">
                          {L.dateAny}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-fit" align="start">
                    <div className="p-2">
                      <Calendar
                        mode="range"
                        locale={th}
                        selected={range}
                        onSelect={applyRange}
                        numberOfMonths={2}
                      />
                      <div className="flex justify-between gap-2 pt-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => applyRange(undefined)}
                        >
                          ล้าง
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            // Close popover by focusing away; user can also click outside.
                            // You can lift popover open state if you want explicit control.
                          }}
                        >
                          นำไปใช้
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1 md:col-span-2">
                <Label className="text-sm">{L.matchMode}</Label>
                <RadioGroup
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2"
                  value={matchMode}
                  onValueChange={(v) => setMatchMode(v as MatchMode)}
                >
                  {matchModeItems.map((it) => (
                    <div
                      key={it.value}
                      className="flex items-center gap-2 border rounded-md p-2"
                    >
                      <RadioGroupItem
                        id={`mm-${it.value}`}
                        value={it.value}
                      />
                      <Label htmlFor={`mm-${it.value}`} className="text-sm">
                        {it.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <Button variant="ghost" size="sm" onClick={goClear}>
                {L.clear}
              </Button>
              <div className="flex-1" />
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsAdvancedOpen(false)}
              >
                ใช้
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}