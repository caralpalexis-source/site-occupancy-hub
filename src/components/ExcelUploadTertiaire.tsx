import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  HelpCircle,
  Check,
  X,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ParsedRow {
  rowNumber: number;
  nom: string;
  prenom: string;
  service: string;
  statut: string;
  zoneName: string;
  date_debut: string;
  date_fin?: string;
  zoneId?: string;
  error?: string;
  isDuplicate?: boolean;
  // Fuzzy match fields
  suggestedZoneId?: string;
  suggestedZoneName?: string;
  needsConfirmation?: boolean;
  userConfirmed?: boolean; // true = accepted, false = refused, undefined = pending
}

interface ImportSummary {
  totalRows: number;
  validRows: ParsedRow[];
  errorRows: ParsedRow[];
  duplicateRows: ParsedRow[];
  fuzzyRows: ParsedRow[];
}

interface FinalReport {
  totalImported: number;
  exactMatches: number;
  fuzzyAccepted: number;
  unknownZone: number;
}

export const ExcelUploadTertiaire: React.FC = () => {
  const { zones, affectationsTertiaires, addAffectationTertiaire } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [fileName, setFileName] = useState("");
  const [finalReport, setFinalReport] = useState<FinalReport | null>(null);

  const zonesTertiaires = zones.filter((z) => z.type === "tertiaire");

  const normalizeString = (s: string) =>
    s.trim().toLowerCase().replace(/[-_/\\]/g, " ").replace(/\s+/g, " ");

  const findZoneExact = (zoneName: string) => {
    const normalizedSearch = normalizeString(zoneName);
    return zonesTertiaires.find((z) => {
      const fullName = normalizeString(`${z.batiment} - ${z.nom_zone}`);
      const justName = normalizeString(z.nom_zone);
      return fullName === normalizedSearch || justName === normalizedSearch;
    });
  };

  const findZoneFuzzy = (zoneName: string) => {
    const normalizedSearch = normalizeString(zoneName);
    if (!normalizedSearch) return undefined;

    // Check if the search term is contained in any zone name, or vice versa
    let bestMatch: { zone: (typeof zonesTertiaires)[0]; score: number } | undefined;

    for (const z of zonesTertiaires) {
      const fullName = normalizeString(`${z.batiment} - ${z.nom_zone}`);
      const justName = normalizeString(z.nom_zone);

      let score = 0;

      // Check if search term is contained in zone name
      if (justName.includes(normalizedSearch)) {
        score = normalizedSearch.length / justName.length;
      } else if (fullName.includes(normalizedSearch)) {
        score = normalizedSearch.length / fullName.length * 0.9;
      }
      // Check if zone name parts contain the search term
      else {
        const zoneParts = justName.split(/[\s/\\-]+/);
        const searchParts = normalizedSearch.split(/[\s/\\-]+/);
        
        for (const sp of searchParts) {
          if (sp.length >= 2) {
            for (const zp of zoneParts) {
              if (zp.includes(sp) || sp.includes(zp)) {
                score = Math.max(score, Math.min(sp.length, zp.length) / Math.max(sp.length, zp.length) * 0.7);
              }
            }
          }
        }
      }

      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { zone: z, score };
      }
    }

    return bestMatch?.zone;
  };

  const parseExcelDate = (value: unknown): string | undefined => {
    if (!value) return undefined;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) return date.toISOString().split("T")[0];
      return undefined;
    }
    if (typeof value === "number") {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
      return date.toISOString().split("T")[0];
    }
    if (value instanceof Date) return value.toISOString().split("T")[0];
    return undefined;
  };

  const isDuplicateAffectation = (row: ParsedRow, zoneId: string): boolean => {
    return affectationsTertiaires.some((existing) => {
      const samePerson =
        existing.nom.toLowerCase() === row.nom.toLowerCase() &&
        existing.prenom.toLowerCase() === row.prenom.toLowerCase();
      const sameZone = existing.zone_id === zoneId;
      const sameDates =
        existing.date_debut === row.date_debut &&
        (existing.date_fin || "") === (row.date_fin || "");
      return samePerson && sameZone && sameDates;
    });
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setFileName(file.name);
    setFinalReport(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array", cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { raw: false, defval: "" });

      const parsedRows: ParsedRow[] = [];

      jsonData.forEach((row, index) => {
        const rowNumber = index + 2;
        const nom = String(row["Nom"] || row["nom"] || "").trim();
        const prenom = String(row["Prénom"] || row["Prenom"] || row["prenom"] || "").trim();
        const service = String(row["Service"] || row["service"] || "").trim();
        const rawStatut = String(row["Statut"] || row["statut"] || "").trim();
        const validStatuts = ["Titulaire", "Prestataire", "Intérimaire", "Alternant"];
        const statut = validStatuts.includes(rawStatut) ? rawStatut : "Titulaire";
        const zoneName = String(row["Zone"] || row["zone"] || "").trim();
        const dateDebutRaw = row["Date_debut"] || row["date_debut"] || row["Date debut"] || "";
        const dateFinRaw = row["Date_fin"] || row["date_fin"] || row["Date fin"] || "";

        const date_debut = parseExcelDate(dateDebutRaw);
        const date_fin = parseExcelDate(dateFinRaw);

        const parsedRow: ParsedRow = {
          rowNumber,
          nom,
          prenom,
          service,
          statut,
          zoneName,
          date_debut: date_debut || "",
          date_fin,
        };

        // Validate required fields (nom, prenom, service, date_debut)
        if (!nom) {
          parsedRow.error = "Nom manquant";
        } else if (!prenom) {
          parsedRow.error = "Prénom manquant";
        } else if (!service) {
          parsedRow.error = "Service manquant";
        } else if (!date_debut) {
          parsedRow.error = "Date de début invalide ou manquante";
        } else {
          // Zone resolution: exact → fuzzy → NULL (zone inconnue)
          if (zoneName) {
            const exactZone = findZoneExact(zoneName);
            if (exactZone) {
              parsedRow.zoneId = exactZone.id;
              parsedRow.isDuplicate = isDuplicateAffectation(parsedRow, exactZone.id);
            } else {
              const fuzzyZone = findZoneFuzzy(zoneName);
              if (fuzzyZone) {
                // Mark for user confirmation
                parsedRow.needsConfirmation = true;
                parsedRow.suggestedZoneId = fuzzyZone.id;
                parsedRow.suggestedZoneName = `${fuzzyZone.batiment} - ${fuzzyZone.nom_zone}`;
                // Default: not yet decided
                parsedRow.userConfirmed = undefined;
              } else {
              // No match at all → zone inconnue (NULL)
                parsedRow.zoneId = undefined;
              }
            }
          } else {
            // No zone specified → zone inconnue (NULL)
            parsedRow.zoneId = undefined;
          }
        }

        parsedRows.push(parsedRow);
      });

      const validRows = parsedRows.filter((r) => !r.error && !r.isDuplicate && !r.needsConfirmation);
      const errorRows = parsedRows.filter((r) => r.error);
      const duplicateRows = parsedRows.filter((r) => !r.error && r.isDuplicate);
      const fuzzyRows = parsedRows.filter((r) => !r.error && r.needsConfirmation);

      setImportSummary({ totalRows: parsedRows.length, validRows, errorRows, duplicateRows, fuzzyRows });
      setIsDialogOpen(true);
    } catch (error) {
      console.error("Error processing Excel file:", error);
      toast({
        title: "Erreur de lecture",
        description: "Impossible de lire le fichier Excel. Vérifiez le format du fichier.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
  };

  const handleFuzzyDecision = (rowNumber: number, accepted: boolean) => {
    if (!importSummary) return;

    setImportSummary((prev) => {
      if (!prev) return prev;
      const updatedFuzzy = prev.fuzzyRows.map((r) => {
        if (r.rowNumber === rowNumber) {
          return { ...r, userConfirmed: accepted };
        }
        return r;
      });
      return { ...prev, fuzzyRows: updatedFuzzy };
    });
  };

  const allFuzzyDecided = importSummary?.fuzzyRows.every((r) => r.userConfirmed !== undefined) ?? true;

  const handleConfirmImport = () => {
    if (!importSummary) return;

    let importedCount = 0;
    let exactMatches = 0;
    let fuzzyAccepted = 0;
    let unknownZone = 0;

    // Import valid rows (exact matches + unknown zones)
    importSummary.validRows.forEach((row) => {
      addAffectationTertiaire({
        nom: row.nom,
        prenom: row.prenom,
        service: row.service,
        statut: row.statut as any || "Titulaire",
        zone_id: row.zoneId || undefined,
        date_debut: row.date_debut,
        date_fin: row.date_fin,
      });
      importedCount++;
      if (!row.zoneId) {
        unknownZone++;
      } else {
        exactMatches++;
      }
    });

    // Import fuzzy rows based on user decisions
    importSummary.fuzzyRows.forEach((row) => {
      if (row.userConfirmed === true && row.suggestedZoneId) {
        // User accepted the suggestion
        addAffectationTertiaire({
          nom: row.nom,
          prenom: row.prenom,
          service: row.service,
          statut: row.statut as any || "Titulaire",
          zone_id: row.suggestedZoneId,
          date_debut: row.date_debut,
          date_fin: row.date_fin,
        });
        importedCount++;
        fuzzyAccepted++;
      } else if (row.userConfirmed === false) {
        // User refused → zone inconnue (NULL)
        addAffectationTertiaire({
          nom: row.nom,
          prenom: row.prenom,
          service: row.service,
          statut: row.statut as any || "Titulaire",
          zone_id: undefined,
          date_debut: row.date_debut,
          date_fin: row.date_fin,
        });
        importedCount++;
        unknownZone++;
      }
    });

    setFinalReport({ totalImported: importedCount, exactMatches, fuzzyAccepted, unknownZone });
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    setImportSummary(null);
    setFinalReport(null);
  };

  const importableCount =
    (importSummary?.validRows.length ?? 0) +
    (importSummary?.fuzzyRows.filter((r) => r.userConfirmed !== undefined).length ?? 0);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileChange}
        className="hidden"
      />

      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Upload className="w-4 h-4 mr-2" />
        )}
        Import Excel
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[900px] max-w-[95vw] h-[80vh] flex flex-col p-0 gap-0">
          {/* HEADER - fixed */}
          <div className="p-6 pb-4 border-b flex-shrink-0">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                Import des affectations tertiaires
              </DialogTitle>
              <DialogDescription>Fichier : {fileName}</DialogDescription>
            </DialogHeader>
            {/* Fuzzy counter in header */}
            {importSummary && !finalReport && importSummary.fuzzyRows.length > 0 && (
              <div className="mt-3 text-sm font-medium">
                Décisions prises : {importSummary.fuzzyRows.filter((r) => r.userConfirmed !== undefined).length} / {importSummary.fuzzyRows.length}
              </div>
            )}
          </div>

          {/* CONTENT - scrollable */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Final report */}
            {finalReport && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary">
                  <CheckCircle2 className="w-6 h-6" />
                  <h3 className="text-lg font-semibold">Import terminé</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{finalReport.totalImported}</div>
                    <div className="text-sm text-muted-foreground">affectations importées</div>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{finalReport.exactMatches}</div>
                    <div className="text-sm text-muted-foreground">correspondances exactes</div>
                  </div>
                  <div className="p-3 bg-accent rounded-lg">
                    <div className="text-2xl font-bold text-accent-foreground">{finalReport.fuzzyAccepted}</div>
                    <div className="text-sm text-muted-foreground">zones proposées acceptées</div>
                  </div>
                  <div className="p-3 bg-secondary rounded-lg">
                    <div className="text-2xl font-bold text-secondary-foreground">{finalReport.unknownZone}</div>
                    <div className="text-sm text-muted-foreground">zones inconnues</div>
                  </div>
                </div>
              </div>
            )}

            {/* Pre-import summary */}
            {importSummary && !finalReport && (
              <div className="space-y-4">
                {/* Summary stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <div className="text-2xl font-bold">{importSummary.totalRows}</div>
                    <div className="text-xs text-muted-foreground">lignes</div>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-lg text-center">
                    <CheckCircle2 className="w-4 h-4 text-primary mx-auto mb-1" />
                    <div className="text-2xl font-bold text-primary">{importSummary.validRows.length}</div>
                    <div className="text-xs text-muted-foreground">valides</div>
                  </div>
                  <div className="p-3 bg-accent rounded-lg text-center">
                    <HelpCircle className="w-4 h-4 text-accent-foreground mx-auto mb-1" />
                    <div className="text-2xl font-bold text-accent-foreground">{importSummary.fuzzyRows.length}</div>
                    <div className="text-xs text-muted-foreground">à confirmer</div>
                  </div>
                  <div className="p-3 bg-destructive/10 rounded-lg text-center">
                    <XCircle className="w-4 h-4 text-destructive mx-auto mb-1" />
                    <div className="text-2xl font-bold text-destructive">{importSummary.errorRows.length}</div>
                    <div className="text-xs text-muted-foreground">erreurs</div>
                  </div>
                </div>

                {/* Duplicates warning */}
                {importSummary.duplicateRows.length > 0 && (
                  <div className="flex items-start gap-2 p-3 bg-accent border border-border rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-accent-foreground mt-0.5 shrink-0" />
                    <div>
                      <div className="font-medium text-accent-foreground">
                        {importSummary.duplicateRows.length} doublon(s) ignoré(s)
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Ces affectations existent déjà (même personne, zone et période).
                      </div>
                    </div>
                  </div>
                )}

                {/* Fuzzy match rows requiring confirmation */}
                {importSummary.fuzzyRows.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-accent-foreground flex items-center gap-2">
                      <HelpCircle className="w-4 h-4" />
                      Zones à confirmer ({importSummary.fuzzyRows.length})
                    </h4>
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">Ligne</TableHead>
                            <TableHead>Personne</TableHead>
                            <TableHead>Zone Excel</TableHead>
                            <TableHead>Zone proposée</TableHead>
                            <TableHead className="w-24 text-center">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importSummary.fuzzyRows.map((row) => (
                            <TableRow key={row.rowNumber}>
                              <TableCell className="font-mono text-sm">{row.rowNumber}</TableCell>
                              <TableCell className="text-sm">{row.prenom} {row.nom}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="font-mono text-xs">
                                  {row.zoneName}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="text-xs">
                                  {row.suggestedZoneName}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center gap-1">
                                  {row.userConfirmed === undefined ? (
                                    <>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                                        onClick={() => handleFuzzyDecision(row.rowNumber, true)}
                                        title="Accepter la zone proposée"
                                      >
                                        <Check className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => handleFuzzyDecision(row.rowNumber, false)}
                                        title="Refuser → zone inconnue"
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </>
                                  ) : row.userConfirmed ? (
                                    <Badge className="bg-primary/10 text-primary border-0 text-xs cursor-pointer" onClick={() => handleFuzzyDecision(row.rowNumber, false)}>
                                      ✓ Accepté
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-secondary text-secondary-foreground border-0 text-xs cursor-pointer" onClick={() => handleFuzzyDecision(row.rowNumber, true)}>
                                      Zone inconnue
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Error details */}
                {importSummary.errorRows.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-destructive flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      Lignes en erreur ({importSummary.errorRows.length})
                    </h4>
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">Ligne</TableHead>
                            <TableHead>Données</TableHead>
                            <TableHead>Erreur</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importSummary.errorRows.map((row) => (
                            <TableRow key={row.rowNumber}>
                              <TableCell className="font-mono text-sm">{row.rowNumber}</TableCell>
                              <TableCell className="text-sm">
                                {row.prenom} {row.nom} - {row.zoneName || "(vide)"}
                              </TableCell>
                              <TableCell className="text-destructive text-sm">{row.error}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Valid rows preview */}
                {importSummary.validRows.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-primary flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Affectations prêtes ({importSummary.validRows.length})
                    </h4>
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nom</TableHead>
                            <TableHead>Service</TableHead>
                            <TableHead>Zone</TableHead>
                            <TableHead>Période</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importSummary.validRows.map((row) => (
                            <TableRow key={row.rowNumber}>
                              <TableCell>{row.prenom} {row.nom}</TableCell>
                              <TableCell>{row.service}</TableCell>
                              <TableCell>
                                {!row.zoneId ? (
                                  <Badge variant="outline" className="text-xs">Zone inconnue</Badge>
                                ) : (
                                  row.zoneName
                                )}
                              </TableCell>
                              <TableCell className="text-sm">
                                {row.date_debut}
                                {row.date_fin && ` → ${row.date_fin}`}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* FOOTER - fixed */}
          <div className="p-4 border-t flex-shrink-0 flex justify-end gap-2">
            {finalReport ? (
              <Button onClick={handleClose}>Fermer</Button>
            ) : importSummary ? (
              <>
                <Button variant="outline" onClick={handleClose}>
                  Annuler
                </Button>
                <Button
                  onClick={handleConfirmImport}
                  disabled={importableCount === 0 || !allFuzzyDecided}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirmer l'import ({importableCount})
                </Button>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
