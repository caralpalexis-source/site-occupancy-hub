import { useEffect, useState } from "react";
import { getBuildingPlan } from "@/lib/buildingPlanDB";

/**
 * Returns an object URL for a building plan image stored in IndexedDB.
 * Automatically revokes the URL on cleanup.
 * @param batiment - building name
 * @param revision - bump this number to force reload after upload
 */
export function useBuildingPlanUrl(batiment: string, revision: number): string | undefined {
  const [url, setUrl] = useState<string | undefined>();

  useEffect(() => {
    let objectUrl: string | undefined;
    let cancelled = false;

    getBuildingPlan(batiment).then((blob) => {
      if (cancelled) return;
      if (blob) {
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } else {
        setUrl(undefined);
      }
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [batiment, revision]);

  return url;
}
