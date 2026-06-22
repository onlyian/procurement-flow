import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { SidebarLayout } from "@/components/layout-sidebar";
import {
  useListInventoryItems,
  getListInventoryItemsQueryKey,
  useCreateInventoryItem,
  useUpdateInventoryItem,
  useDeleteInventoryItem,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Search, Package } from "lucide-react";
import { toast } from "sonner";

type ItemForm = {
  name: string;
  sku: string;
  stockLevel: string;
  unitPrice: string;
  category: string;
  lowStockThreshold: string;
};

const emptyForm: ItemForm = {
  name: "",
  sku: "",
  stockLevel: "0",
  unitPrice: "0",
  category: "",
  lowStockThreshold: "10",
};

export default function InventoryPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ItemForm>(emptyForm);

  const { data: items, isLoading } = useListInventoryItems(
    categoryFilter ? { category: categoryFilter } : {},
  );
  const createMutation = useCreateInventoryItem();
  const updateMutation = useUpdateInventoryItem();
  const deleteMutation = useDeleteInventoryItem();

  const filtered = items?.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.sku.toLowerCase().includes(search.toLowerCase()),
  ) ?? [];

  const categories = [...new Set(items?.map((i) => i.category) ?? [])].sort();

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(item: NonNullable<typeof items>[number]) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      sku: item.sku,
      stockLevel: String(item.stockLevel),
      unitPrice: String(item.unitPrice),
      category: item.category,
      lowStockThreshold: String(item.lowStockThreshold),
    });
    setDialogOpen(true);
  }

  function invalidate() {
    qc.invalidateQueries({ queryKey: getListInventoryItemsQueryKey() });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name,
      sku: form.sku,
      stockLevel: parseInt(form.stockLevel, 10),
      unitPrice: parseFloat(form.unitPrice),
      category: form.category,
      lowStockThreshold: parseInt(form.lowStockThreshold, 10),
    };

    if (editingId !== null) {
      updateMutation.mutate(
        { id: editingId, data: payload },
        {
          onSuccess: () => {
            toast.success("Item updated");
            setDialogOpen(false);
            invalidate();
          },
          onError: () => toast.error("Failed to update item"),
        },
      );
    } else {
      createMutation.mutate(
        { data: payload },
        {
          onSuccess: () => {
            toast.success("Item created");
            setDialogOpen(false);
            invalidate();
          },
          onError: () => toast.error("Failed to create item"),
        },
      );
    }
  }

  function handleDelete(id: number) {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("Item deleted");
          setDeleteId(null);
          invalidate();
        },
        onError: () => toast.error("Failed to delete item"),
      },
    );
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <SidebarLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Inventory</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage stock items and levels</p>
          </div>
          <Button onClick={openCreate} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Add item
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Item</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">SKU</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Category</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Stock</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Unit Price</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="px-4 py-3" colSpan={6}>
                        <Skeleton className="h-4 w-full" />
                      </td>
                    </tr>
                  ))
                : filtered.length === 0
                ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No items found</p>
                    </td>
                  </tr>
                )
                : filtered.map((item) => {
                    const isLow = item.stockLevel <= item.lowStockThreshold;
                    return (
                      <tr key={item.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-medium">{item.name}</td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{item.sku}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs">{item.category}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-medium ${isLow ? "text-amber-600" : "text-foreground"}`}>
                            {item.stockLevel}
                          </span>
                          {isLow && (
                            <span className="ml-1 text-xs text-amber-500">(low)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          ${(item.unitPrice as number).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(item.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId !== null ? "Edit item" : "Add inventory item"}</DialogTitle>
            <DialogDescription>
              {editingId !== null ? "Update the details for this item." : "Add a new item to your inventory."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sku">SKU</Label>
                <Input id="sku" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category">Category</Label>
                <Input id="category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stock">Stock Level</Label>
                <Input id="stock" type="number" min="0" value={form.stockLevel} onChange={(e) => setForm({ ...form, stockLevel: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="price">Unit Price ($)</Label>
                <Input id="price" type="number" min="0" step="0.01" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="threshold">Low Stock Threshold</Label>
                <Input id="threshold" type="number" min="0" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })} required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : editingId !== null ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete inventory item?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The item will be permanently removed from your inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId !== null && handleDelete(deleteId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarLayout>
  );
}
