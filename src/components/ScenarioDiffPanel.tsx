import React, { useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { computeDiff, Diff } from "@/lib/scenarioDiff";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Check, Undo2, Plus, Minus, Pencil, MapPin, User, Briefcase } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { AffectationTertiaire } from "@/types";

interface ScenarioDiffPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const fieldLabels: Record<string, string> = {
  nom_zone: "Nom de zone",
  batiment: "Bâtiment",
  capacite_max: "Capacité max",
  type: "Type",
  nom: "Nom",
  prenom: "Prénom",
  service: "Service",
  statut: "Statut",
  zone_id: "Zone",
  date_debut: "Date début",
  date_fin: "Date fin",
  change_reason: "Motif",
  nom_projet: "Projet",
  surface_necessaire: "Surface",
};

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  return String(v);
}

function DiffIcon({ type }: { type: Diff["type"] }) {
  switch (type) {
    case "zone_added":
    case "affectation_added":
      return <Plus className="w-4 h-4 text-primary" />;
    case "zone_removed":
    case "affectation_removed":
      return <Minus className="w-4 h-4 text-destructive" />;
    case "zone_updated":
      return <MapPin className="w-4 h-4 text-primary" />;
    case "affectation_updated":
      return <Pencil className="w-4 h-4 text-primary" />;
  }
}

function DiffTypeBadge({ diff }: { diff: Diff }) {
  const labels: Record<Diff["type"], string> = {
    zone_added: "Zone ajoutée",
    zone_removed: "Zone supprimée",
    zone_updated: "Zone modifiée",
    affectation_added: "Affectation ajoutée",
    affectation_removed: "Affectation supprimée",
    affectation_updated: "Affectation modifiée",
  };
  const variant = diff.type.includes("added")
    ? "default"
    : diff.type.includes("removed")
    ? "destructive"
    : "secondary";
  return <Badge variant={variant} className="text-[10px]">{labels[diff.type]}</Badge>;
}

function DiffTitle({ diff }: { diff: Diff }) {
  switch (diff.type) {
    case "zone_added":
      return <span>{diff.data.nom_zone} ({diff.data.batiment})</span>;
    case "zone_removed":
      return <span>{diff.data.nom_zone} ({diff.data.batiment})</span>;
    case "zone_updated":
      return <span>{diff.zoneName} — {fieldLabels[diff.field] || diff.field}</span>;
    case "affectation_added":
    case "affectation_removed": {
      const d = diff.data;
      const label = "nom" in d ? `${(d as AffectationTertiaire).prenom} ${(d as AffectationTertiaire).nom}` : d.nom_projet;
      return (
        <span className="flex items-center gap-1">
          {diff.entity === "tertiaire" ? <User className="w-3 h-3" /> : <Briefcase className="w-3 h-3" />}
          {label}
        </span>
      );
    }
    case "affectation_updated":
      return (
        <span className="flex items-center gap-1">
          {diff.entity === "tertiaire" ? <User className="w-3 h-3" /> : <Briefcase className="w-3 h-3" />}
          {diff.label} — {fieldLabels[diff.field] || diff.field}
        </span>
      );
  }
}

function DiffDetail({ diff }: { diff: Diff }) {
  if (diff.type === "zone_updated" || diff.type === "affectation_updated") {
    return (
      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
        <span className="line-through text-destructive/70">{formatValue(diff.from)}</span>
        <span>→</span>
        <span className="text-foreground font-medium">{formatValue(diff.to)}</span>
      </div>
    );
  }
  return null;
}

export const ScenarioDiffPanel: React.FC<ScenarioDiffPanelProps> = ({ open, onOpenChange }) => {
  const { applyDiffToNominal, revertDiff, getDiffs } = useApp();

  const diffs = useMemo(() => getDiffs(), [getDiffs]);

  const handleApply = (diff: Diff) => {
    applyDiffToNominal(diff);
    toast.success("Modification appliquée au nominal");
  };

  const handleRevert = (diff: Diff) => {
    revertDiff(diff);
    toast.info("Modification annulée dans le scénario");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Comparaison scénario / nominal</SheetTitle>
          <SheetDescription>
            {diffs.length === 0
              ? "Aucune différence détectée."
              : `${diffs.length} différence${diffs.length > 1 ? "s" : ""} détectée${diffs.length > 1 ? "s" : ""}.`}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-8rem)] mt-4 pr-2">
          {diffs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Check className="w-10 h-10 mb-2" />
              <p>Le scénario est identique au nominal.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {diffs.map((diff, i) => (
                <div
                  key={i}
                  className="border border-border rounded-lg p-3 bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <DiffIcon type={diff.type} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <DiffTypeBadge diff={diff} />
                          <span className="text-sm font-medium truncate">
                            <DiffTitle diff={diff} />
                          </span>
                        </div>
                        <DiffDetail diff={diff} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={() => handleApply(diff)}
                        title="Appliquer au nominal"
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Appliquer
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => handleRevert(diff)}
                        title="Revenir au nominal"
                      >
                        <Undo2 className="w-3 h-3 mr-1" />
                        Annuler
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
