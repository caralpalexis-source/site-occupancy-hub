import React, { useRef } from "react";
import { ImagePlus, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";

interface BuildingPlanUploadProps {
  batiment: string;
  planImage: string | undefined;
  onUpload: (batiment: string, imageData: string) => void;
}

export const BuildingPlanUpload: React.FC<BuildingPlanUploadProps> = ({
  batiment,
  planImage,
  onUpload,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return;
    }

    // Read and convert to base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = event.target?.result as string;
      onUpload(batiment, imageData);
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const buttonContent = (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "h-7 w-7 shrink-0",
        planImage ? "text-primary" : "text-muted-foreground"
      )}
      onClick={handleClick}
    >
      {planImage ? (
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
        accept="image/png,image/jpeg,image/jpg"
        className="hidden"
        onChange={handleFileChange}
      />
      {planImage ? (
        <HoverCard openDelay={200} closeDelay={100}>
          <HoverCardTrigger asChild>{buttonContent}</HoverCardTrigger>
          <HoverCardContent
            side="right"
            align="start"
            className="w-80 p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Plan du bâtiment {batiment}
              </p>
              <img
                src={planImage}
                alt={`Plan ${batiment}`}
                className="w-full h-auto rounded-md border border-border"
              />
              <p className="text-xs text-muted-foreground">
                Cliquer sur l'icône pour remplacer
              </p>
            </div>
          </HoverCardContent>
        </HoverCard>
      ) : (
        buttonContent
      )}
    </>
  );
};
