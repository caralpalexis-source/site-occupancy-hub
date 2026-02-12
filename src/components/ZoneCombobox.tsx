import React, { useState, useMemo } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Zone } from "@/types";

interface ZoneComboboxProps {
  zones: Zone[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  formatLabel?: (zone: Zone) => string;
}

export const ZoneCombobox: React.FC<ZoneComboboxProps> = ({
  zones,
  value,
  onChange,
  placeholder = "Sélectionner une zone",
  formatLabel,
}) => {
  const [open, setOpen] = useState(false);

  const sortedZones = useMemo(() => {
    return [...zones].sort((a, b) => {
      const labelA = formatLabel ? formatLabel(a) : `${a.batiment} - ${a.nom_zone}`;
      const labelB = formatLabel ? formatLabel(b) : `${b.batiment} - ${b.nom_zone}`;
      return labelA.localeCompare(labelB, "fr", { numeric: true, sensitivity: "base" });
    });
  }, [zones, formatLabel]);

  const getLabel = (zone: Zone) =>
    formatLabel ? formatLabel(zone) : `${zone.batiment} - ${zone.nom_zone}`;

  const selectedZone = zones.find((z) => z.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selectedZone ? getLabel(selectedZone) : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Rechercher une zone..." />
          <CommandList>
            <CommandEmpty>Aucune zone trouvée.</CommandEmpty>
            <CommandGroup>
              {sortedZones.map((zone) => (
                <CommandItem
                  key={zone.id}
                  value={getLabel(zone)}
                  onSelect={() => {
                    onChange(zone.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === zone.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {getLabel(zone)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
