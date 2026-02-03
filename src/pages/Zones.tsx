import React, { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { Zone, ZoneType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Pencil, Trash2, Building2, Users, Maximize, ArrowUpDown } from "lucide-react";
import { OccupationBadge } from "@/components/OccupationBadge";
import { ZoneTypeFilter, ZoneFilterType } from "@/components/ZoneTypeFilter";
import { SortSelect, SortOption } from "@/components/SortSelect";

type SortType = "alphabetic" | "taux_asc" | "taux_desc";

const sortOptions: SortOption[] = [
  { value: "alphabetic", label: "Alphabétique" },
  { value: "taux_asc", label: "Taux ↑ (croissant)" },
  { value: "taux_desc", label: "Taux ↓ (décroissant)" },
];

const Zones: React.FC = () => {
  const { zones, addZone, updateZone, deleteZone, getOccupationForZone, dateEtat } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [filter, setFilter] = useState<ZoneFilterType>("all");
  const [sortBy, setSortBy] = useState<SortType>("alphabetic");
  const [formData, setFormData] = useState({
    type: "tertiaire" as ZoneType,
    batiment: "",
    nom_zone: "",
    capacite_max: "",
    image_plan: "",
  });

  // Filtrage et tri des zones
  const filteredAndSortedZones = useMemo(() => {
    let result = filter === "all" 
      ? [...zones] 
      : zones.filter((z) => z.type === filter);

    // Tri
    result.sort((a, b) => {
      if (sortBy === "alphabetic") {
        const batimentCompare = a.batiment.localeCompare(b.batiment, "fr");
        if (batimentCompare !== 0) return batimentCompare;
        return a.nom_zone.localeCompare(b.nom_zone, "fr");
      } else {
        const statsA = getOccupationForZone(a.id, dateEtat);
        const statsB = getOccupationForZone(b.id, dateEtat);
        if (sortBy === "taux_asc") {
          return statsA.taux - statsB.taux;
        } else {
          return statsB.taux - statsA.taux;
        }
      }
    });

    return result;
  }, [zones, filter, sortBy, getOccupationForZone, dateEtat]);

  const resetForm = () => {
    setFormData({
      type: "tertiaire",
      batiment: "",
      nom_zone: "",
      capacite_max: "",
      image_plan: "",
    });
    setEditingZone(null);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) resetForm();
  };

  const handleEdit = (zone: Zone) => {
    setEditingZone(zone);
    setFormData({
      type: zone.type,
      batiment: zone.batiment,
      nom_zone: zone.nom_zone,
      capacite_max: zone.capacite_max.toString(),
      image_plan: zone.image_plan || "",
    });
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const zoneData = {
      type: formData.type,
      batiment: formData.batiment,
      nom_zone: formData.nom_zone,
      capacite_max: parseFloat(formData.capacite_max) || 0,
      image_plan: formData.image_plan || undefined,
    };

    if (editingZone) {
      updateZone({ ...zoneData, id: editingZone.id });
    } else {
      addZone(zoneData);
    }
    handleOpenChange(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image_plan: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestion des Zones</h1>
          <p className="text-muted-foreground">
            Configurez les zones tertiaires et opérationnelles du site
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle zone
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingZone ? "Modifier la zone" : "Nouvelle zone"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type de zone</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v: ZoneType) =>
                      setFormData({ ...formData, type: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tertiaire">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Tertiaire
                        </div>
                      </SelectItem>
                      <SelectItem value="operationnelle">
                        <div className="flex items-center gap-2">
                          <Maximize className="w-4 h-4" />
                          Opérationnelle
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batiment">Bâtiment</Label>
                  <Input
                    id="batiment"
                    value={formData.batiment}
                    onChange={(e) =>
                      setFormData({ ...formData, batiment: e.target.value })
                    }
                    placeholder="Bâtiment A"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nom_zone">
                  {formData.type === "tertiaire" ? "Nom du bureau" : "Numéro de zone"}
                </Label>
                <Input
                  id="nom_zone"
                  value={formData.nom_zone}
                  onChange={(e) =>
                    setFormData({ ...formData, nom_zone: e.target.value })
                  }
                  placeholder={formData.type === "tertiaire" ? "Bureau 101" : "Zone A1"}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacite_max">
                  Capacité maximale{" "}
                  {formData.type === "tertiaire" ? "(personnes)" : "(m²)"}
                </Label>
                <Input
                  id="capacite_max"
                  type="number"
                  min="0"
                  step={formData.type === "operationnelle" ? "0.1" : "1"}
                  value={formData.capacite_max}
                  onChange={(e) =>
                    setFormData({ ...formData, capacite_max: e.target.value })
                  }
                  placeholder={formData.type === "tertiaire" ? "10" : "500"}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="image_plan">Image du plan (optionnel)</Label>
                <Input
                  id="image_plan"
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={handleImageUpload}
                />
                {formData.image_plan && (
                  <img
                    src={formData.image_plan}
                    alt="Preview"
                    className="mt-2 rounded-lg max-h-32 object-cover"
                  />
                )}
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  Annuler
                </Button>
                <Button type="submit">
                  {editingZone ? "Mettre à jour" : "Créer"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtres et tri */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <ZoneTypeFilter value={filter} onChange={setFilter} />
        <div className="sm:ml-auto">
          <SortSelect
            options={sortOptions}
            value={sortBy}
            onChange={(v) => setSortBy(v as SortType)}
          />
        </div>
      </div>

      {filteredAndSortedZones.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {zones.length === 0 
              ? "Aucune zone configurée" 
              : `Aucune zone ${filter === "tertiaire" ? "tertiaire" : "opérationnelle"}`}
          </h3>
          <p className="text-muted-foreground mb-4">
            {zones.length === 0 
              ? "Créez votre première zone pour commencer"
              : "Aucune zone ne correspond à ce filtre"}
          </p>
          {zones.length === 0 && (
            <Button onClick={() => setIsOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Créer une zone
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Bâtiment</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Capacité</TableHead>
                <TableHead>Occupation</TableHead>
                <TableHead>Taux</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedZones.map((zone) => {
                const stats = getOccupationForZone(zone.id, dateEtat);
                return (
                  <TableRow key={zone.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {zone.type === "tertiaire" ? (
                          <Users className="w-4 h-4 text-primary" />
                        ) : (
                          <Maximize className="w-4 h-4 text-accent" />
                        )}
                        <span className="capitalize">{zone.type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{zone.batiment}</TableCell>
                    <TableCell>{zone.nom_zone}</TableCell>
                    <TableCell>
                      {zone.capacite_max} {zone.type === "tertiaire" ? "pers." : "m²"}
                    </TableCell>
                    <TableCell>
                      {stats.occupation} {zone.type === "tertiaire" ? "pers." : "m²"}
                    </TableCell>
                    <TableCell>
                      <OccupationBadge taux={stats.taux} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(zone)}
                        >
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
                              <AlertDialogTitle>Supprimer la zone ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Cette action est irréversible. Toutes les affectations
                                liées à cette zone seront également supprimées.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteZone(zone.id)}
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
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default Zones;
