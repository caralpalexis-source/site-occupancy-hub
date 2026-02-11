import React from "react";
import { AffectationOperationnelle, AffectationTertiaire } from "@/types";
import { Maximize, Users } from "lucide-react";

interface DragOverlayContentProps {
  affectation?: AffectationOperationnelle | null;
  affectationTertiaire?: AffectationTertiaire | null;
}

export const DragOverlayContent: React.FC<DragOverlayContentProps> = ({
  affectation,
  affectationTertiaire,
}) => {
  if (affectationTertiaire) {
    return (
      <div className="p-3 bg-card rounded-xl shadow-2xl border-2 border-primary/30 text-sm min-w-[200px] animate-scale-in">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
            <Users className="w-3 h-3 text-primary" />
          </div>
          <div>
            <span className="font-semibold text-foreground">
              {affectationTertiaire.prenom} {affectationTertiaire.nom}
            </span>
            <p className="text-xs text-muted-foreground">{affectationTertiaire.service}</p>
          </div>
        </div>
      </div>
    );
  }

  if (affectation) {
    return (
      <div className="p-3 bg-card rounded-xl shadow-2xl border-2 border-primary/30 text-sm min-w-[200px] animate-scale-in">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-accent/10 flex items-center justify-center">
            <Maximize className="w-3 h-3 text-accent" />
          </div>
          <div>
            <span className="font-semibold text-foreground">{affectation.nom_projet}</span>
            <p className="text-xs text-muted-foreground">{affectation.surface_necessaire} m²</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

