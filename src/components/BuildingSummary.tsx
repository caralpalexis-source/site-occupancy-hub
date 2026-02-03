import React from "react";
import { Users, Maximize, TrendingUp, Building2 } from "lucide-react";

interface BuildingSummaryProps {
  batiment: string;
  zonesCount: number;
  occupationTertiaire: { current: number; max: number };
  occupationOperationnelle: { current: number; max: number };
  tauxMoyen: number;
}

export const BuildingSummary: React.FC<BuildingSummaryProps> = ({
  batiment,
  zonesCount,
  occupationTertiaire,
  occupationOperationnelle,
  tauxMoyen,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-4 text-sm">
      <div className="flex items-center gap-2">
        <Building2 className="w-4 h-4 text-primary" />
        <span className="font-medium">{batiment}</span>
        <span className="text-muted-foreground">
          ({zonesCount} zone{zonesCount > 1 ? "s" : ""})
        </span>
      </div>
      
      <div className="flex items-center gap-4 ml-auto">
        {occupationTertiaire.max > 0 && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            <span>
              {occupationTertiaire.current}/{occupationTertiaire.max} pers.
            </span>
          </div>
        )}
        
        {occupationOperationnelle.max > 0 && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Maximize className="w-3.5 h-3.5" />
            <span>
              {occupationOperationnelle.current}/{occupationOperationnelle.max} m²
            </span>
          </div>
        )}
        
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5" />
          <span className={
            tauxMoyen > 80 
              ? "text-warning font-medium" 
              : tauxMoyen > 50 
                ? "text-foreground" 
                : "text-success font-medium"
          }>
            {Math.round(tauxMoyen)}%
          </span>
        </div>
      </div>
    </div>
  );
};
