import React from "react";
import { cn } from "@/lib/utils";

interface OccupationBadgeProps {
  taux: number;
  showPercentage?: boolean;
  size?: "sm" | "md";
}

export const OccupationBadge: React.FC<OccupationBadgeProps> = ({
  taux,
  showPercentage = true,
  size = "md",
}) => {
  const getLevel = () => {
    if (taux < 50) return "low";
    if (taux < 80) return "medium";
    return "high";
  };

  const level = getLevel();

  return (
    <span
      className={cn(
        "occupation-badge",
        level === "low" && "occupation-low",
        level === "medium" && "occupation-medium",
        level === "high" && "occupation-high",
        size === "sm" && "text-[10px] px-2 py-0.5"
      )}
    >
      {showPercentage ? `${Math.round(taux)}%` : level === "low" ? "Disponible" : level === "medium" ? "Partiel" : "Occupé"}
    </span>
  );
};
