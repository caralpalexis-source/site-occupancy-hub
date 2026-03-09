import React, { useState } from "react";
import { AffectationTertiaire, STATUTS_TERTIAIRE, CHANGE_REASONS, Zone } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ZoneCombobox } from "@/components/ZoneCombobox";
import { FormDatePicker } from "@/components/FormDatePicker";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Calendar } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ChangeAffectationDialogProps {
  affectation: AffectationTertiaire;
  zones: Zone[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (params: {
    currentAff: AffectationTertiaire;
    changeDate: string;
    newService: string;
    newStatut: string;
    newZoneId?: string;
    newDateFin?: string;
    changeReason?: string;
  }) => void;
  getZoneName: (zoneId?: string) => string;
}

export const ChangeAffectationDialog: React.FC<ChangeAffectationDialogProps> = ({
  affectation,
  zones,
  open,
  onOpenChange,
  onConfirm,
  getZoneName,
}) => {
  const [changeDate, setChangeDate] = useState("");
  const [newService, setNewService] = useState(affectation.service);
  const [newStatut, setNewStatut] = useState(affectation.statut || "Titulaire");
  const [newZoneId, setNewZoneId] = useState(affectation.zone_id || "");
  const [newDateFin, setNewDateFin] = useState(affectation.date_fin || "");
  const [changeReason, setChangeReason] = useState("");
  const [error, setError] = useState("");

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      // Reset form
      setChangeDate("");
      setNewService(affectation.service);
      setNewStatut(affectation.statut || "Titulaire");
      setNewZoneId(affectation.zone_id || "");
      setNewDateFin(affectation.date_fin || "");
      setChangeReason("");
      setError("");
    }
    onOpenChange(o);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!changeDate) {
      setError("La date de changement est obligatoire.");
      return;
    }

    const changeDateObj = new Date(changeDate);
    const debutObj = new Date(affectation.date_debut);

    if (changeDateObj <= debutObj) {
      setError("La date de changement doit être postérieure à la date de début de l'affectation actuelle.");
      return;
    }

    if (newDateFin) {
      const finObj = new Date(newDateFin);
      if (finObj < changeDateObj) {
        setError("La date de fin ne peut pas être antérieure à la date de changement.");
        return;
      }
    }

    onConfirm({
      currentAff: affectation,
      changeDate,
      newService,
      newStatut,
      newZoneId: newZoneId || undefined,
      newDateFin: newDateFin || undefined,
      changeReason: changeReason || undefined,
    });
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Changer l'affectation</DialogTitle>
        </DialogHeader>

        {/* Current assignment summary */}
        <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Affectation actuelle</p>
          <p className="text-sm font-semibold text-foreground">
            {affectation.prenom} {affectation.nom}
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>{affectation.service}</span>
            <span>·</span>
            <span>{getZoneName(affectation.zone_id)}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(affectation.date_debut), "d MMM yyyy", { locale: fr })}
              {affectation.date_fin && ` → ${format(new Date(affectation.date_fin), "d MMM yyyy", { locale: fr })}`}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <ArrowRight className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium text-primary ml-1">Nouvelle affectation</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Date de changement <span className="text-destructive">*</span></Label>
            <FormDatePicker
              value={changeDate}
              onChange={setChangeDate}
              placeholder="Date effective du changement"
              required
            />
            <p className="text-xs text-muted-foreground">
              L'affectation actuelle sera clôturée la veille de cette date.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Service</Label>
            <Input
              value={newService}
              onChange={(e) => setNewService(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Statut</Label>
            <Select value={newStatut} onValueChange={setNewStatut}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUTS_TERTIAIRE.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Zone</Label>
            <ZoneCombobox
              zones={zones}
              value={newZoneId}
              onChange={setNewZoneId}
            />
          </div>

          <div className="space-y-2">
            <Label>Date de fin (optionnel)</Label>
            <FormDatePicker
              value={newDateFin}
              onChange={setNewDateFin}
              placeholder="Date de fin"
            />
          </div>

          <div className="space-y-2">
            <Label>Motif du changement</Label>
            <Select value={changeReason} onValueChange={setChangeReason}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un motif (optionnel)" />
              </SelectTrigger>
              <SelectContent>
                {CHANGE_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-sm text-destructive font-medium">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit">
              Confirmer le changement
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
