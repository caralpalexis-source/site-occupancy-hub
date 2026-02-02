import React from "react";
import { Zone, OccupationStats } from "@/types";
import { OccupationBadge } from "./OccupationBadge";
import { Building2, Users, Maximize } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ZoneCardProps {
  zone: Zone;
  stats: OccupationStats;
  onClick?: () => void;
}

export const ZoneCard: React.FC<ZoneCardProps> = ({ zone, stats, onClick }) => {
  const isOperationnelle = zone.type === "operationnelle";

  return (
    <div className="zone-card group" onClick={onClick}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isOperationnelle ? 'bg-accent/10' : 'bg-primary/10'}`}>
            {isOperationnelle ? (
              <Maximize className="w-4 h-4 text-accent" />
            ) : (
              <Users className="w-4 h-4 text-primary" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{zone.nom_zone}</h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {zone.batiment}
            </p>
          </div>
        </div>
        <OccupationBadge taux={stats.taux} size="sm" />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Occupation</span>
          <span className="font-medium">
            {stats.occupation} / {stats.capacite_max} {isOperationnelle ? "m²" : "pers."}
          </span>
        </div>
        <Progress value={stats.taux} className="h-2" />
      </div>

      {zone.image_plan && (
        <div className="mt-3 rounded-lg overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity">
          <img
            src={zone.image_plan}
            alt={`Plan ${zone.nom_zone}`}
            className="w-full h-24 object-cover"
          />
        </div>
      )}
    </div>
  );
};
