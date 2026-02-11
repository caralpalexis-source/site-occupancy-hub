import React, { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { AffectationTertiaire, AffectationOperationnelle } from "@/types";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, UserX, GripVertical, Users, Maximize } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface UnassignedTertiaire {
  nom: string;
  prenom: string;
  service: string;
  /** Most recent affectation for reference, but it's NOT active today */
  lastAffectation?: AffectationTertiaire;
}

export interface UnassignedOperationnelle {
  nom_projet: string;
  surface_necessaire: number;
  lastAffectation?: AffectationOperationnelle;
}

interface DraggableUnassignedTertiaireProps {
  resource: UnassignedTertiaire;
}

const DraggableUnassignedTertiaire: React.FC<DraggableUnassignedTertiaireProps> = ({ resource }) => {
  const dragId = `unassigned-t-${resource.nom}-${resource.prenom}-${resource.service}`;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragId,
    data: { type: "unassigned-tertiaire", resource },
  });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: isDragging ? 999 : undefined }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "p-2 bg-muted/50 rounded-lg text-sm transition-all flex items-center gap-2",
        isDragging && "opacity-50 shadow-lg ring-2 ring-primary/30"
      )}
    >
      <button
        {...listeners}
        {...attributes}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      <Users className="w-3.5 h-3.5 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="font-medium text-foreground">
          {resource.prenom} {resource.nom}
        </span>
        <p className="text-xs text-muted-foreground">{resource.service}</p>
      </div>
      <Badge variant="secondary" className="text-[10px] shrink-0">
        Non affecté
      </Badge>
    </div>
  );
};

interface DraggableUnassignedOperationnelleProps {
  resource: UnassignedOperationnelle;
}

const DraggableUnassignedOperationnelle: React.FC<DraggableUnassignedOperationnelleProps> = ({ resource }) => {
  const dragId = `unassigned-o-${resource.nom_projet}`;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragId,
    data: { type: "unassigned-operationnelle", resource },
  });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: isDragging ? 999 : undefined }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "p-2 bg-muted/50 rounded-lg text-sm transition-all flex items-center gap-2",
        isDragging && "opacity-50 shadow-lg ring-2 ring-primary/30"
      )}
    >
      <button
        {...listeners}
        {...attributes}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      <Maximize className="w-3.5 h-3.5 text-accent shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="font-medium text-foreground">{resource.nom_projet}</span>
        <p className="text-xs text-muted-foreground">{resource.surface_necessaire} m²</p>
      </div>
      <Badge variant="secondary" className="text-[10px] shrink-0">
        Non affecté
      </Badge>
    </div>
  );
};

interface UnassignedResourcesSectionProps {
  tertiaires: UnassignedTertiaire[];
  operationnelles: UnassignedOperationnelle[];
  isOpen: boolean;
  onToggle: () => void;
}

export const UnassignedResourcesSection: React.FC<UnassignedResourcesSectionProps> = ({
  tertiaires,
  operationnelles,
  isOpen,
  onToggle,
}) => {
  const total = tertiaires.length + operationnelles.length;

  if (total === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border hover:bg-accent/50 transition-colors cursor-pointer">
          <ChevronDown
            className={cn(
              "w-5 h-5 text-muted-foreground transition-transform",
              isOpen && "rotate-180"
            )}
          />
          <div className="flex-1 flex items-center gap-3">
            <UserX className="w-5 h-5 text-muted-foreground" />
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Sans Affectation
              </h2>
              <p className="text-xs text-muted-foreground">
                {total} ressource{total > 1 ? "s" : ""} sans affectation active aujourd'hui
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {total}
          </Badge>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pt-3 pl-8 space-y-4">
          {tertiaires.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" /> Tertiaire ({tertiaires.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                {tertiaires.map((r) => (
                  <DraggableUnassignedTertiaire
                    key={`${r.nom}-${r.prenom}-${r.service}`}
                    resource={r}
                  />
                ))}
              </div>
            </div>
          )}
          {operationnelles.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Maximize className="w-4 h-4" /> Opérationnel ({operationnelles.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                {operationnelles.map((r) => (
                  <DraggableUnassignedOperationnelle
                    key={r.nom_projet}
                    resource={r}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
