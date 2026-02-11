import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { AffectationOperationnelle, AffectationTertiaire } from "@/types";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, HelpCircle, GripVertical, Maximize, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface DraggableUnknownTertiaireProps {
  affectation: AffectationTertiaire;
}

const DraggableUnknownTertiaire: React.FC<DraggableUnknownTertiaireProps> = ({ affectation }) => {
  const dragId = `unknown-t-${affectation.id}`;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragId,
    data: { type: "unknown-tertiaire", affectationTertiaire: affectation },
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
          {affectation.prenom} {affectation.nom}
        </span>
        <p className="text-xs text-muted-foreground">{affectation.service}</p>
      </div>

      <Badge variant="secondary" className="text-[10px] shrink-0">
        Zone inconnue
      </Badge>
    </div>
  );
};

interface DraggableUnknownOperationnelleProps {
  affectation: AffectationOperationnelle;
}

const DraggableUnknownOperationnelle: React.FC<DraggableUnknownOperationnelleProps> = ({ affectation }) => {
  const dragId = `unknown-o-${affectation.id}`;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragId,
    data: { type: "unknown-operationnelle", affectation },
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
        <span className="font-medium text-foreground">{affectation.nom_projet}</span>
        <p className="text-xs text-muted-foreground">{affectation.surface_necessaire} m²</p>
      </div>

      <Badge variant="secondary" className="text-[10px] shrink-0">
        Zone inconnue
      </Badge>
    </div>
  );
};

interface UnassignedResourcesSectionProps {
  tertiaires: AffectationTertiaire[];
  operationnelles: AffectationOperationnelle[];
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
            <HelpCircle className="w-5 h-5 text-muted-foreground" />
            <div>
              <h2 className="text-sm font-semibold text-foreground">Zone inconnue</h2>
              <p className="text-xs text-muted-foreground">
                {total} affectation{total > 1 ? "s" : ""} active{total > 1 ? "s" : ""} aujourd'hui
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
                {tertiaires.map((a) => (
                  <DraggableUnknownTertiaire key={a.id} affectation={a} />
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
                {operationnelles.map((a) => (
                  <DraggableUnknownOperationnelle key={a.id} affectation={a} />
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
