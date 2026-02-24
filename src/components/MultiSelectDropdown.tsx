import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectDropdownProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder: string;
  allLabel: string;
  emptyLabel?: string;
  className?: string;
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  options,
  selected,
  onChange,
  placeholder,
  allLabel,
  emptyLabel = "Aucune option",
  className,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const allSelected = options.length > 0 && selected.length === options.length;
  const noneSelected = selected.length === 0;

  const toggleAll = () => {
    onChange(allSelected ? [] : options.map((o) => o.value));
  };

  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    );
  };

  const label = noneSelected
    ? placeholder
    : allSelected
      ? allLabel
      : `${selected.length} sélectionné${selected.length > 1 ? "s" : ""}`;

  return (
    <div ref={ref} className={cn("relative", className)}>
      <Button
        variant="outline"
        size="sm"
        role="combobox"
        aria-expanded={open}
        className="w-full justify-between text-xs h-9 min-w-[180px]"
        onClick={() => setOpen(!open)}
      >
        <span className="truncate">{label}</span>
        <div className="flex items-center gap-1 ml-1">
          {!noneSelected && !allSelected && (
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px] rounded-full">
              {selected.length}
            </Badge>
          )}
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </div>
      </Button>

      {open && (
        <div className="absolute z-[100] mt-1 w-full min-w-[200px] rounded-md border bg-popover p-1 shadow-md animate-in fade-in-0 zoom-in-95">
          <div className="max-h-[220px] overflow-y-auto">
            {/* Select all */}
            <label className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-accent cursor-pointer text-xs font-medium">
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleAll}
              />
              {allLabel}
            </label>

            <div className="h-px bg-border my-1" />

            {options.length === 0 ? (
              <p className="text-xs text-muted-foreground px-2 py-1.5">{emptyLabel}</p>
            ) : (
              options.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-accent cursor-pointer text-xs"
                >
                  <Checkbox
                    checked={selected.includes(opt.value)}
                    onCheckedChange={() => toggle(opt.value)}
                  />
                  {opt.label}
                </label>
              ))
            )}
          </div>

          {!noneSelected && (
            <>
              <div className="h-px bg-border my-1" />
              <button
                className="flex items-center gap-1 px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground w-full"
                onClick={() => { onChange([]); }}
              >
                <X className="h-3 w-3" /> Tout désélectionner
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
