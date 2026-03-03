import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { FlaskConical, PlusCircle, Trash2, Play, ArrowUpCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "@/components/ui/sonner";

export const ScenarioList: React.FC = () => {
  const {
    scenarios,
    activeScenario,
    createScenario,
    deleteScenario,
    activateScenario,
    promoteScenario,
  } = useApp();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [promoteId, setPromoteId] = useState<string | null>(null);

  const handleCreate = () => {
    if (!newName.trim()) return;
    createScenario(newName.trim());
    setNewName("");
    setShowCreateDialog(false);
    toast.success(`Scénario « ${newName.trim()} » créé et activé`);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    const s = scenarios.find((s) => s.id === deleteId);
    deleteScenario(deleteId);
    setDeleteId(null);
    toast.success(`Scénario « ${s?.nom} » supprimé`);
  };

  const handlePromote = () => {
    if (!promoteId) return;
    const s = scenarios.find((s) => s.id === promoteId);
    promoteScenario(promoteId);
    setPromoteId(null);
    toast.success(`Scénario « ${s?.nom} » promu comme état nominal`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Scénarios enregistrés</h2>
          <p className="text-sm text-muted-foreground">
            Créez des projections pour tester des hypothèses sans impacter les données nominales
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} disabled={!!activeScenario}>
          <PlusCircle className="w-4 h-4 mr-2" />
          Créer un scénario
        </Button>
      </div>

      {activeScenario && (
        <Card className="border-accent/50 bg-accent/5">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              Un scénario est actuellement actif. Quittez-le pour en créer ou ouvrir un autre.
            </p>
          </CardContent>
        </Card>
      )}

      {scenarios.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <FlaskConical className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Aucun scénario enregistré</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Créez un scénario pour simuler des modifications d'affectations
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {scenarios.map((scenario) => (
            <Card key={scenario.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{scenario.nom}</CardTitle>
                    <CardDescription>
                      Créé le {format(new Date(scenario.dateCreation), "dd MMMM yyyy à HH:mm", { locale: fr })}
                      {" · "}
                      {scenario.data.zones.length} zones, {" "}
                      {scenario.data.affectationsTertiaires.length} aff. tertiaires, {" "}
                      {scenario.data.affectationsOperationnelles.length} aff. opérationnelles
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => activateScenario(scenario.id)}
                      disabled={!!activeScenario}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Ouvrir
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPromoteId(scenario.id)}
                      disabled={!!activeScenario}
                    >
                      <ArrowUpCircle className="w-4 h-4 mr-1" />
                      Promouvoir
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteId(scenario.id)}
                      disabled={!!activeScenario}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un nouveau scénario</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Nom du scénario"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <p className="text-sm text-muted-foreground mt-2">
              Une copie complète des données actuelles sera créée. Toutes les modifications
              s'appliqueront uniquement à ce scénario.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>Créer et activer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce scénario ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les données du scénario seront définitivement supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Promote confirmation */}
      <AlertDialog open={!!promoteId} onOpenChange={(open) => !open && setPromoteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Promouvoir comme état nominal ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les données actuelles seront remplacées par celles de ce scénario. L'ancien état nominal sera perdu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handlePromote}>Confirmer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
