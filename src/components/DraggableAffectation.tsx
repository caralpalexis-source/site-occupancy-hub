import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { AffectationOperationnelle, AffectationTertiaire } from "@/types";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface DraggableAffectationOperationnelleProps {
  affectation: AffectationOperationnelle;
  formatPeriod: (dateDebut: string, dateFin?: string) => string;
}

export const DraggableAffectation: React.FC<DraggableAffectationOperationnelleProps> = ({
  affectation,
  formatPeriod,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: affectation.id,
    data: { affectation, type: "operationnelle" },
  });

  const style = transform
    ? {
        transform: `translate(${transform.x}px, ${transform.y}px)`,
        zIndex: isDragging ? 999 : undefined,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "p-2 bg-muted/50 rounded-lg text-sm transition-all",
        isDragging && "opacity-50 shadow-lg ring-2 ring-primary/30"
      )}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-1.5">
          <button
            {...listeners}
            {...attributes}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
          <div>
            <span className="font-medium text-foreground">
              {affectation.nom_projet}
            </span>
            <p className="text-xs text-muted-foreground">
              {affectation.surface_necessaire} m²
            </p>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">
          {formatPeriod(affectation.date_debut, affectation.date_fin)}
        </span>
      </div>
    </div>
  );
};

interface DraggableAffectationTertiaireProps {
  affectation: AffectationTertiaire;
  formatPeriod: (dateDebut: string, dateFin?: string) => string;
}

export const DraggableAffectationTertiaire: React.FC<DraggableAffectationTertiaireProps> = ({
  affectation,
  formatPeriod,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `tertiaire-${affectation.id}`,
    data: { affectationTertiaire: affectation, type: "tertiaire" },
  });

  const style = transform
    ? {
        transform: `translate(${transform.x}px, ${transform.y}px)`,
        zIndex: isDragging ? 999 : undefined,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "p-2 bg-muted/50 rounded-lg text-sm transition-all",
        isDragging && "opacity-50 shadow-lg ring-2 ring-primary/30"
      )}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-1.5">
          <button
            {...listeners}
            {...attributes}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
          <div>
            <span className="font-medium text-foreground">
              {affectation.prenom} {affectation.nom}
            </span>
            <p className="text-xs text-muted-foreground">
              {affectation.service}
            </p>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">
          {formatPeriod(affectation.date_debut, affectation.date_fin)}
        </span>
      </div>
    </div>
  );
};
