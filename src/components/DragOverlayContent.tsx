import React from "react";
import { AffectationOperationnelle } from "@/types";
import { Maximize } from "lucide-react";

interface DragOverlayContentProps {
  affectation: AffectationOperationnelle;
}

export const DragOverlayContent: React.FC<DragOverlayContentProps> = ({ affectation }) => {
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
};
