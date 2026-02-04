import React, { useState } from "react";
import { Zone, OccupationStats, AffectationTertiaire, AffectationOperationnelle } from "@/types";
import { OccupationBadge } from "./OccupationBadge";
import { Building2, Users, Maximize, ChevronDown } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface ZoneCardExpandableProps {
  zone: Zone;
  stats: OccupationStats;
  affectationsTertiaires: AffectationTertiaire[];
  affectationsOperationnelles: AffectationOperationnelle[];
}

const formatPeriod = (dateDebut: string, dateFin?: string): string => {
  const debut = format(new Date(dateDebut), "dd/MM/yyyy", { locale: fr });
  const fin = dateFin
    ? format(new Date(dateFin), "dd/MM/yyyy", { locale: fr })
    : "En cours";
  return `${debut} → ${fin}`;
};

export const ZoneCardExpandable: React.FC<ZoneCardExpandableProps> = ({
  zone,
  stats,
  affectationsTertiaires,
  affectationsOperationnelles,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const isOperationnelle = zone.type === "operationnelle";

  const affectations = isOperationnelle
    ? affectationsOperationnelles
    : affectationsTertiaires;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="zone-card group">
        <CollapsibleTrigger className="w-full text-left">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isOperationnelle ? "bg-accent/10" : "bg-primary/10"
                }`}
              >
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
            <div className="flex items-center gap-2">
              <OccupationBadge taux={stats.taux} size="sm" />
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform",
                  isOpen && "rotate-180"
                )}
              />
            </div>
          </div>
        </CollapsibleTrigger>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Occupation</span>
            <span className="font-medium">
              {stats.occupation} / {stats.capacite_max}{" "}
              {isOperationnelle ? "m²" : "pers."}
            </span>
          </div>
          <Progress value={stats.taux} className="h-2" />
        </div>

        <CollapsibleContent>
          <div className="mt-4 pt-4 border-t border-border">
            {affectations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">
                Aucune affectation active
              </p>
            ) : (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Affectations actives ({affectations.length})
                </h4>
                {isOperationnelle
                  ? (affectationsOperationnelles as AffectationOperationnelle[]).map(
                      (aff) => (
                        <div
                          key={aff.id}
                          className="p-2 bg-muted/50 rounded-lg text-sm"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-medium text-foreground">
                                {aff.nom_projet}
                              </span>
                              <p className="text-xs text-muted-foreground">
                                {aff.surface_necessaire} m²
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatPeriod(aff.date_debut, aff.date_fin)}
                            </span>
                          </div>
                        </div>
                      )
                    )
                  : (affectationsTertiaires as AffectationTertiaire[]).map(
                      (aff) => (
                        <div
                          key={aff.id}
                          className="p-2 bg-muted/50 rounded-lg text-sm"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-medium text-foreground">
                                {aff.prenom} {aff.nom}
                              </span>
                              <p className="text-xs text-muted-foreground">
                                {aff.service}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatPeriod(aff.date_debut, aff.date_fin)}
                            </span>
                          </div>
                        </div>
                      )
                    )}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};
