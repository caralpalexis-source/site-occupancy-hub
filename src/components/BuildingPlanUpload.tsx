import React, { useRef, useState } from "react";
import { ImagePlus, Image, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useBuildingPlanUrl } from "@/hooks/useBuildingPlanUrl";
import { useApp } from "@/context/AppContext";
import { toast } from "@/hooks/use-toast";

interface BuildingPlanUploadProps {
  batiment: string;
}

export const BuildingPlanUpload: React.FC<BuildingPlanUploadProps> = ({
  batiment,
}) => {
  const { buildingPlanKeys, planRevision, uploadBuildingPlan } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);

  const hasPlan = buildingPlanKeys.has(batiment);
  const planUrl = useBuildingPlanUrl(batiment, planRevision);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    try {
      await uploadBuildingPlan(batiment, file);
      toast({ title: "Plan mis à jour", description: `Image du bâtiment ${batiment} enregistrée.` });
    } catch (err: any) {
      if (err?.message === "IMAGE_TOO_LARGE") {
        toast({
          title: "Image trop volumineuse",
          description: "Taille maximale autorisée : 180 Ko après compression.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Erreur", description: "Impossible de traiter l'image.", variant: "destructive" });
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFullscreenOpen(true);
  };

  const buttonContent = (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "h-7 w-7 shrink-0",
        hasPlan ? "text-primary" : "text-muted-foreground"
      )}
      onClick={handleClick}
    >
      {hasPlan ? (
        <Image className="w-4 h-4" />
      ) : (
        <ImagePlus className="w-4 h-4" />
      )}
    </Button>
  );

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
      {hasPlan && planUrl ? (
        <>
          <HoverCard openDelay={200} closeDelay={100}>
            <HoverCardTrigger asChild>{buttonContent}</HoverCardTrigger>
            <HoverCardContent
              side="right"
              align="start"
              className="w-[32rem] p-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">
                    Plan du bâtiment {batiment}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleOpenFullscreen}
                  >
                    <Maximize2 className="w-4 h-4" />
                  </Button>
                </div>
                <img
                  src={planUrl}
                  alt={`Plan ${batiment}`}
                  className="w-full h-auto rounded-md border border-border cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={handleOpenFullscreen}
                />
                <p className="text-xs text-muted-foreground">
                  Cliquer sur l'image pour agrandir • Icône pour remplacer
                </p>
              </div>
            </HoverCardContent>
          </HoverCard>

          <Dialog open={isFullscreenOpen} onOpenChange={setIsFullscreenOpen}>
            <DialogContent 
              className="max-w-[95vw] max-h-[95vh] w-auto h-auto p-0 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <DialogHeader className="absolute top-0 left-0 right-0 z-10 flex flex-row items-center justify-between p-4 bg-gradient-to-b from-background/90 to-transparent">
                <DialogTitle className="text-lg font-semibold">
                  Plan du bâtiment {batiment}
                </DialogTitle>
              </DialogHeader>
              <div className="flex items-center justify-center p-4 pt-16 max-h-[95vh] overflow-auto">
                <img
                  src={planUrl}
                  alt={`Plan ${batiment}`}
                  className="max-w-full max-h-[85vh] object-contain rounded-md"
                />
              </div>
            </DialogContent>
          </Dialog>
        </>
      ) : (
        buttonContent
      )}
    </>
  );
};
