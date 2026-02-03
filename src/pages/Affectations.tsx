import React, { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { AffectationTertiaire, AffectationOperationnelle } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Users, Maximize, Calendar } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { SortSelect, SortOption } from "@/components/SortSelect";

type SortTertiaire = "personne" | "service" | "zone" | "periode_asc" | "periode_desc";
type SortOperationnelle = "projet" | "surface_asc" | "surface_desc" | "zone" | "periode_asc" | "periode_desc";

const sortOptionsTertiaire: SortOption[] = [
  { value: "personne", label: "Personne (A-Z)" },
  { value: "service", label: "Service (A-Z)" },
  { value: "zone", label: "Zone (A-Z)" },
  { value: "periode_desc", label: "Période (récent → ancien)" },
  { value: "periode_asc", label: "Période (ancien → récent)" },
];

const sortOptionsOperationnelle: SortOption[] = [
  { value: "projet", label: "Projet (A-Z)" },
  { value: "surface_desc", label: "Surface ↓ (décroissant)" },
  { value: "surface_asc", label: "Surface ↑ (croissant)" },
  { value: "zone", label: "Zone (A-Z)" },
  { value: "periode_desc", label: "Période (récent → ancien)" },
  { value: "periode_asc", label: "Période (ancien → récent)" },
];

const Affectations: React.FC = () => {
  const {
    zones,
    affectationsTertiaires,
    affectationsOperationnelles,
    addAffectationTertiaire,
    updateAffectationTertiaire,
    deleteAffectationTertiaire,
    addAffectationOperationnelle,
    updateAffectationOperationnelle,
    deleteAffectationOperationnelle,
  } = useApp();

  const zonesTertiaires = zones.filter((z) => z.type === "tertiaire");
  const zonesOperationnelles = zones.filter((z) => z.type === "operationnelle");

  // Sort state
  const [sortTertiaire, setSortTertiaire] = useState<SortTertiaire>("personne");
  const [sortOperationnelle, setSortOperationnelle] = useState<SortOperationnelle>("projet");

  // Tertiaire form state
  const [isTertiaireOpen, setIsTertiaireOpen] = useState(false);
  const [editingTertiaire, setEditingTertiaire] = useState<AffectationTertiaire | null>(null);
  const [tertiaireForm, setTertiaireForm] = useState({
    nom: "",
    prenom: "",
    service: "",
    zone_id: "",
    date_debut: "",
    date_fin: "",
  });

  // Operationnelle form state
  const [isOperationnelleOpen, setIsOperationnelleOpen] = useState(false);
  const [editingOperationnelle, setEditingOperationnelle] = useState<AffectationOperationnelle | null>(null);
  const [operationnelleForm, setOperationnelleForm] = useState({
    nom_projet: "",
    surface_necessaire: "",
    zone_id: "",
    date_debut: "",
    date_fin: "",
  });

  const getZoneName = (zoneId: string) => {
    const zone = zones.find((z) => z.id === zoneId);
    return zone ? `${zone.batiment} - ${zone.nom_zone}` : "Zone inconnue";
  };

  // Sorted affectations tertiaires
  const sortedAffectationsTertiaires = useMemo(() => {
    const sorted = [...affectationsTertiaires];
    
    sorted.sort((a, b) => {
      switch (sortTertiaire) {
        case "personne":
          const nameA = `${a.nom} ${a.prenom}`.toLowerCase();
          const nameB = `${b.nom} ${b.prenom}`.toLowerCase();
          return nameA.localeCompare(nameB, "fr");
        case "service":
          return a.service.localeCompare(b.service, "fr");
        case "zone":
          return getZoneName(a.zone_id).localeCompare(getZoneName(b.zone_id), "fr");
        case "periode_asc":
          return new Date(a.date_debut).getTime() - new Date(b.date_debut).getTime();
        case "periode_desc":
          return new Date(b.date_debut).getTime() - new Date(a.date_debut).getTime();
        default:
          return 0;
      }
    });
    
    return sorted;
  }, [affectationsTertiaires, sortTertiaire, zones]);

  // Sorted affectations operationnelles
  const sortedAffectationsOperationnelles = useMemo(() => {
    const sorted = [...affectationsOperationnelles];
    
    sorted.sort((a, b) => {
      switch (sortOperationnelle) {
        case "projet":
          return a.nom_projet.localeCompare(b.nom_projet, "fr");
        case "surface_asc":
          return a.surface_necessaire - b.surface_necessaire;
        case "surface_desc":
          return b.surface_necessaire - a.surface_necessaire;
        case "zone":
          return getZoneName(a.zone_id).localeCompare(getZoneName(b.zone_id), "fr");
        case "periode_asc":
          return new Date(a.date_debut).getTime() - new Date(b.date_debut).getTime();
        case "periode_desc":
          return new Date(b.date_debut).getTime() - new Date(a.date_debut).getTime();
        default:
          return 0;
      }
    });
    
    return sorted;
  }, [affectationsOperationnelles, sortOperationnelle, zones]);

  // Tertiaire handlers
  const resetTertiaireForm = () => {
    setTertiaireForm({
      nom: "",
      prenom: "",
      service: "",
      zone_id: "",
      date_debut: "",
      date_fin: "",
    });
    setEditingTertiaire(null);
  };

  const handleTertiaireOpenChange = (open: boolean) => {
    setIsTertiaireOpen(open);
    if (!open) resetTertiaireForm();
  };

  const handleEditTertiaire = (aff: AffectationTertiaire) => {
    setEditingTertiaire(aff);
    setTertiaireForm({
      nom: aff.nom,
      prenom: aff.prenom,
      service: aff.service,
      zone_id: aff.zone_id,
      date_debut: aff.date_debut,
      date_fin: aff.date_fin || "",
    });
    setIsTertiaireOpen(true);
  };

  const handleTertiaireSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      nom: tertiaireForm.nom,
      prenom: tertiaireForm.prenom,
      service: tertiaireForm.service,
      zone_id: tertiaireForm.zone_id,
      date_debut: tertiaireForm.date_debut,
      date_fin: tertiaireForm.date_fin || undefined,
    };

    if (editingTertiaire) {
      updateAffectationTertiaire({ ...data, id: editingTertiaire.id });
    } else {
      addAffectationTertiaire(data);
    }
    handleTertiaireOpenChange(false);
  };

  // Operationnelle handlers
  const resetOperationnelleForm = () => {
    setOperationnelleForm({
      nom_projet: "",
      surface_necessaire: "",
      zone_id: "",
      date_debut: "",
      date_fin: "",
    });
    setEditingOperationnelle(null);
  };

  const handleOperationnelleOpenChange = (open: boolean) => {
    setIsOperationnelleOpen(open);
    if (!open) resetOperationnelleForm();
  };

  const handleEditOperationnelle = (aff: AffectationOperationnelle) => {
    setEditingOperationnelle(aff);
    setOperationnelleForm({
      nom_projet: aff.nom_projet,
      surface_necessaire: aff.surface_necessaire.toString(),
      zone_id: aff.zone_id,
      date_debut: aff.date_debut,
      date_fin: aff.date_fin || "",
    });
    setIsOperationnelleOpen(true);
  };

  const handleOperationnelleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      nom_projet: operationnelleForm.nom_projet,
      surface_necessaire: parseFloat(operationnelleForm.surface_necessaire) || 0,
      zone_id: operationnelleForm.zone_id,
      date_debut: operationnelleForm.date_debut,
      date_fin: operationnelleForm.date_fin || undefined,
    };

    if (editingOperationnelle) {
      updateAffectationOperationnelle({ ...data, id: editingOperationnelle.id });
    } else {
      addAffectationOperationnelle(data);
    }
    handleOperationnelleOpenChange(false);
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "d MMM yyyy", { locale: fr });
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Gestion des Affectations</h1>
        <p className="text-muted-foreground">
          Gérez les affectations de personnes et projets aux zones
        </p>
      </div>

      <Tabs defaultValue="tertiaire" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="tertiaire" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Tertiaire ({affectationsTertiaires.length})
          </TabsTrigger>
          <TabsTrigger value="operationnelle" className="flex items-center gap-2">
            <Maximize className="w-4 h-4" />
            Opérationnelle ({affectationsOperationnelles.length})
          </TabsTrigger>
        </TabsList>

        {/* Tertiaire Tab */}
        <TabsContent value="tertiaire" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <SortSelect
              options={sortOptionsTertiaire}
              value={sortTertiaire}
              onChange={(v) => setSortTertiaire(v as SortTertiaire)}
            />
            <div className="sm:ml-auto">
              <Dialog open={isTertiaireOpen} onOpenChange={handleTertiaireOpenChange}>
                <DialogTrigger asChild>
                  <Button disabled={zonesTertiaires.length === 0}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nouvelle affectation
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>
                      {editingTertiaire ? "Modifier l'affectation" : "Nouvelle affectation tertiaire"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleTertiaireSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="nom">Nom</Label>
                        <Input
                          id="nom"
                          value={tertiaireForm.nom}
                          onChange={(e) => setTertiaireForm({ ...tertiaireForm, nom: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="prenom">Prénom</Label>
                        <Input
                          id="prenom"
                          value={tertiaireForm.prenom}
                          onChange={(e) => setTertiaireForm({ ...tertiaireForm, prenom: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="service">Service</Label>
                      <Input
                        id="service"
                        value={tertiaireForm.service}
                        onChange={(e) => setTertiaireForm({ ...tertiaireForm, service: e.target.value })}
                        placeholder="Direction, RH, IT..."
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zone">Zone</Label>
                      <Select
                        value={tertiaireForm.zone_id}
                        onValueChange={(v) => setTertiaireForm({ ...tertiaireForm, zone_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une zone" />
                        </SelectTrigger>
                        <SelectContent>
                          {zonesTertiaires.map((zone) => (
                            <SelectItem key={zone.id} value={zone.id}>
                              {zone.batiment} - {zone.nom_zone}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="date_debut">Date de début</Label>
                        <Input
                          id="date_debut"
                          type="date"
                          value={tertiaireForm.date_debut}
                          onChange={(e) => setTertiaireForm({ ...tertiaireForm, date_debut: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="date_fin">Date de fin (optionnel)</Label>
                        <Input
                          id="date_fin"
                          type="date"
                          value={tertiaireForm.date_fin}
                          onChange={(e) => setTertiaireForm({ ...tertiaireForm, date_fin: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => handleTertiaireOpenChange(false)}>
                        Annuler
                      </Button>
                      <Button type="submit">
                        {editingTertiaire ? "Mettre à jour" : "Créer"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {zonesTertiaires.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-xl border border-border">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Aucune zone tertiaire
              </h3>
              <p className="text-muted-foreground">
                Créez d'abord des zones tertiaires dans la section "Zones"
              </p>
            </div>
          ) : affectationsTertiaires.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-xl border border-border">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Aucune affectation tertiaire
              </h3>
              <p className="text-muted-foreground">
                Ajoutez des personnes aux zones tertiaires
              </p>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Personne</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead>Période</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAffectationsTertiaires.map((aff) => (
                    <TableRow key={aff.id}>
                      <TableCell className="font-medium">
                        {aff.prenom} {aff.nom}
                      </TableCell>
                      <TableCell>{aff.service}</TableCell>
                      <TableCell>{getZoneName(aff.zone_id)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="w-3 h-3" />
                          {formatDate(aff.date_debut)}
                          {aff.date_fin && ` → ${formatDate(aff.date_fin)}`}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleEditTertiaire(aff)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost">
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer l'affectation ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Cette action est irréversible.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteAffectationTertiaire(aff.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Supprimer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Operationnelle Tab */}
        <TabsContent value="operationnelle" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <SortSelect
              options={sortOptionsOperationnelle}
              value={sortOperationnelle}
              onChange={(v) => setSortOperationnelle(v as SortOperationnelle)}
            />
            <div className="sm:ml-auto">
              <Dialog open={isOperationnelleOpen} onOpenChange={handleOperationnelleOpenChange}>
                <DialogTrigger asChild>
                  <Button disabled={zonesOperationnelles.length === 0}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nouvelle affectation
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>
                      {editingOperationnelle ? "Modifier l'affectation" : "Nouvelle affectation opérationnelle"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleOperationnelleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="nom_projet">Nom du projet</Label>
                      <Input
                        id="nom_projet"
                        value={operationnelleForm.nom_projet}
                        onChange={(e) => setOperationnelleForm({ ...operationnelleForm, nom_projet: e.target.value })}
                        placeholder="Projet XYZ"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="surface">Surface nécessaire (m²)</Label>
                      <Input
                        id="surface"
                        type="number"
                        min="0"
                        step="0.1"
                        value={operationnelleForm.surface_necessaire}
                        onChange={(e) => setOperationnelleForm({ ...operationnelleForm, surface_necessaire: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zone_op">Zone</Label>
                      <Select
                        value={operationnelleForm.zone_id}
                        onValueChange={(v) => setOperationnelleForm({ ...operationnelleForm, zone_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une zone" />
                        </SelectTrigger>
                        <SelectContent>
                          {zonesOperationnelles.map((zone) => (
                            <SelectItem key={zone.id} value={zone.id}>
                              {zone.batiment} - {zone.nom_zone} ({zone.capacite_max} m²)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="date_debut_op">Date de début</Label>
                        <Input
                          id="date_debut_op"
                          type="date"
                          value={operationnelleForm.date_debut}
                          onChange={(e) => setOperationnelleForm({ ...operationnelleForm, date_debut: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="date_fin_op">Date de fin (optionnel)</Label>
                        <Input
                          id="date_fin_op"
                          type="date"
                          value={operationnelleForm.date_fin}
                          onChange={(e) => setOperationnelleForm({ ...operationnelleForm, date_fin: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => handleOperationnelleOpenChange(false)}>
                        Annuler
                      </Button>
                      <Button type="submit">
                        {editingOperationnelle ? "Mettre à jour" : "Créer"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {zonesOperationnelles.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-xl border border-border">
              <Maximize className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Aucune zone opérationnelle
              </h3>
              <p className="text-muted-foreground">
                Créez d'abord des zones opérationnelles dans la section "Zones"
              </p>
            </div>
          ) : affectationsOperationnelles.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-xl border border-border">
              <Maximize className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Aucune affectation opérationnelle
              </h3>
              <p className="text-muted-foreground">
                Ajoutez des projets aux zones opérationnelles
              </p>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Projet</TableHead>
                    <TableHead>Surface</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead>Période</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAffectationsOperationnelles.map((aff) => (
                    <TableRow key={aff.id}>
                      <TableCell className="font-medium">{aff.nom_projet}</TableCell>
                      <TableCell>{aff.surface_necessaire} m²</TableCell>
                      <TableCell>{getZoneName(aff.zone_id)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="w-3 h-3" />
                          {formatDate(aff.date_debut)}
                          {aff.date_fin && ` → ${formatDate(aff.date_fin)}`}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleEditOperationnelle(aff)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost">
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer l'affectation ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Cette action est irréversible.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteAffectationOperationnelle(aff.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Supprimer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Affectations;
