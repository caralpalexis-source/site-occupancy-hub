import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { FlaskConical, Save, X, ArrowUpCircle, GitCompareArrows } from "lucide-react";
import { ScenarioDiffPanel } from "./ScenarioDiffPanel";

export const ScenarioBanner: React.FC = () => {
  const { activeScenario, saveActiveScenario, discardActiveScenario, promoteActiveScenario } = useApp();
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showDiffPanel, setShowDiffPanel] = useState(false);

  if (!activeScenario) return null;

  const handleSave = () => {
    saveActiveScenario();
    setShowExitDialog(false);
  };

  const handleDiscard = () => {
    discardActiveScenario();
    setShowExitDialog(false);
    toast.info("Modifications annulées — le scénario enregistré reste inchangé.");
  };

  const handlePromote = () => {
    promoteActiveScenario();
    setShowExitDialog(false);
  };

  return (
    <>
      <div className="bg-accent/15 border-b border-accent/30 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FlaskConical className="w-5 h-5 text-accent" />
          <span className="font-semibold text-foreground">
            Mode scénario : {activeScenario.nom}
          </span>
          <span className="text-xs text-muted-foreground">
            Les modifications ne s'appliquent qu'à ce scénario
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDiffPanel(true)}
            className="gap-1"
          >
            <GitCompareArrows className="w-4 h-4" />
            Comparer au nominal
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExitDialog(true)}
          >
            Quitter le scénario
          </Button>
        </div>
      </div>

      <ScenarioDiffPanel open={showDiffPanel} onOpenChange={setShowDiffPanel} />

      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quitter le scénario « {activeScenario.nom} »</AlertDialogTitle>
            <AlertDialogDescription>
              Choisissez comment traiter les modifications effectuées dans ce scénario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Button onClick={handleSave} className="justify-start gap-2">
              <Save className="w-4 h-4" />
              Sauvegarder le scénario
            </Button>
            <Button onClick={handlePromote} variant="secondary" className="justify-start gap-2">
              <ArrowUpCircle className="w-4 h-4" />
              Définir comme nouvel état nominal
            </Button>
            <Button onClick={handleDiscard} variant="destructive" className="justify-start gap-2">
              <X className="w-4 h-4" />
              Abandonner (ne rien enregistrer)
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
