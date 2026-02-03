import React from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Users, Maximize, Layers } from "lucide-react";

export type ZoneFilterType = "all" | "tertiaire" | "operationnelle";

interface ZoneTypeFilterProps {
  value: ZoneFilterType;
  onChange: (value: ZoneFilterType) => void;
}

export const ZoneTypeFilter: React.FC<ZoneTypeFilterProps> = ({ value, onChange }) => {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as ZoneFilterType)}
      className="bg-muted p-1 rounded-lg"
    >
      <ToggleGroupItem
        value="all"
        aria-label="Afficher tout"
        className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-3"
      >
        <Layers className="w-4 h-4 mr-2" />
        Tout
      </ToggleGroupItem>
      <ToggleGroupItem
        value="tertiaire"
        aria-label="Tertiaire uniquement"
        className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-3"
      >
        <Users className="w-4 h-4 mr-2" />
        Tertiaire
      </ToggleGroupItem>
      <ToggleGroupItem
        value="operationnelle"
        aria-label="Opérationnel uniquement"
        className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-3"
      >
        <Maximize className="w-4 h-4 mr-2" />
        Opérationnel
      </ToggleGroupItem>
    </ToggleGroup>
  );
};
