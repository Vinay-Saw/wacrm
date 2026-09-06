'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Package,
  Plus,
  Search,
  Tag,
  Percent,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  Edit2,
  Trash2,
  Loader2,
  Layers,
  Coins,
} from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { formatCurrency } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Product } from '@/types';

export const GST_BRACKETS = [
  { rate: 0, label: '0% (Exempt / Nil)' },
  { rate: 5, label: '5% (Essential Goods/Services)' },
  { rate: 12, label: '12% (Standard Reduced)' },
  { rate: 18, label: '18% (Standard GST)' },
  { rate: 28, label: '28% (Luxury / Demerit)' },
];

export const COMMON_UNITS = [
  'Unit',
  'Pcs',
  'Box',
  'Sq Ft',
  'Sq Meter',
  'Hours',
  'Days',
  'Months',
  'Set',
  'Kg',
  'Liters',
  'Meter',
  'License',
];

export default function ProductsPage() {
  const { defaultCurrency, canManageMembers } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Modals
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [targetProduct, setTargetProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formUnit, setFormUnit] = useState('Unit');
  const [formUnitPrice, setFormUnitPrice] = useState('');
  const [formTaxRate, setFormTaxRate] = useState('18');
  const [formHsnSac, setFormHsnSac] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formDescription, setFormDescription] = useState('');

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Failed to fetch products');
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err) {
      toast.error('Failed to load products');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Compute stats
  const totalProducts = products.length;
  const activeProducts = products.filter((p) => p.is_active).length;
  const categories = Array.from(
    new Set(products.map((p) => p.category).filter(Boolean))
  ) as string[];
  const avgPrice =
    totalProducts > 0
      ? products.reduce((acc, p) => acc + Number(p.unit_price || 0), 0) /
        totalProducts
      : 0;

  // Filtered products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())) ||
      (p.hsn_sac && p.hsn_sac.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'all' || p.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  function openCreateDialog() {
    setEditingProduct(null);
    setFormName('');
    setFormSku('');
    setFormCategory('');
    setFormUnit('Unit');
    setFormUnitPrice('');
    setFormTaxRate('18');
    setFormHsnSac('');
    setFormIsActive(true);
    setFormDescription('');
    setDialogOpen(true);
  }

  function openEditDialog(prod: Product) {
    setEditingProduct(prod);
    setFormName(prod.name);
    setFormSku(prod.sku || '');
    setFormCategory(prod.category || '');
    setFormUnit(prod.unit || 'Unit');
    setFormUnitPrice(String(prod.unit_price || ''));
    setFormTaxRate(String(prod.tax_rate ?? 18));
    setFormHsnSac(prod.hsn_sac || '');
    setFormIsActive(prod.is_active);
    setFormDescription(prod.description || '');
    setDialogOpen(true);
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error('Product name is required');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formName.trim(),
        sku: formSku.trim() || null,
        category: formCategory.trim() || null,
        unit: formUnit.trim() || 'Unit',
        unit_price: parseFloat(formUnitPrice) || 0,
        tax_rate: parseFloat(formTaxRate) || 0,
        hsn_sac: formHsnSac.trim() || null,
        is_active: formIsActive,
        description: formDescription.trim() || null,
      };

      const url = editingProduct
        ? `/api/products/${editingProduct.id}`
        : '/api/products';
      const method = editingProduct ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save product');
      }

      toast.success(
        editingProduct ? 'Product updated successfully' : 'Product created successfully'
      );
      setDialogOpen(false);
      fetchProducts();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteProduct() {
    if (!targetProduct) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/${targetProduct.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete product');
      toast.success('Product deleted successfully');
      setDeleteDialogOpen(false);
      setTargetProduct(null);
      fetchProducts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            Products & Services
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your catalog items, standard Indian GST tax rates, HSN/SAC codes, and pricing.
          </p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Catalog Items</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{totalProducts}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Package className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Active for Sale</p>
              <h3 className="text-2xl font-bold text-emerald-500 mt-1">{activeProducts}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Categories</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{categories.length}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-500">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Average Price</p>
              <h3 className="text-2xl font-bold text-primary mt-1">
                {formatCurrency(avgPrice, defaultCurrency)}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
              <Coins className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name, SKU, or HSN/SAC..."
            className="pl-9 bg-card border-border text-foreground"
          />
        </div>

        {categories.length > 0 && (
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-10 rounded-md border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Categories ({totalProducts})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Products Table */}
      <Card className="bg-card border-border overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-foreground">
            <thead className="bg-muted/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-3 px-4 font-semibold">Item & Description</th>
                <th className="py-3 px-4 font-semibold">SKU / Code</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold">Unit Price</th>
                <th className="py-3 px-4 font-semibold">GST Rate</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                    Loading products...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <Package className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="font-medium text-foreground">No products found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {search ? 'Try adjusting your search criteria' : 'Add your first product to get started'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => (
                  <tr key={prod.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-foreground">{prod.name}</div>
                      {prod.description && (
                        <div className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">
                          {prod.description}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-muted-foreground">
                      {prod.sku || '-'}
                      {prod.hsn_sac && (
                        <span className="block text-[10px] text-muted-foreground/70">
                          HSN: {prod.hsn_sac}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      {prod.category ? (
                        <Badge variant="outline" className="text-muted-foreground font-normal border-border">
                          {prod.category}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-foreground">
                        {formatCurrency(prod.unit_price, defaultCurrency)}
                      </div>
                      <div className="text-[11px] text-muted-foreground">per {prod.unit}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant="secondary"
                        className="bg-primary/10 text-primary hover:bg-primary/15 font-semibold text-xs"
                      >
                        {prod.tax_rate}% GST
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4">
                      {prod.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-500 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-medium">
                          <XCircle className="h-3.5 w-3.5" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" />
                          }
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="text-xs">
                          <DropdownMenuItem onClick={() => openEditDialog(prod)}>
                            <Edit2 className="mr-2 h-3.5 w-3.5" />
                            Edit Product
                          </DropdownMenuItem>
                          {canManageMembers && (
                            <DropdownMenuItem
                              onClick={() => {
                                setTargetProduct(prod);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-red-500 focus:text-red-500"
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              Delete Product
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add / Edit Product Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              {editingProduct ? 'Edit Product / Service' : 'Add New Product or Service'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define the item pricing, Indian GST tax bracket, and billing units.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveProduct} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="p-name" className="text-xs font-semibold">
                Item / Service Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="p-name"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Enterprise Cloud License, Consulting Hour, 3BHK Flat"
                className="bg-muted border-border text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="p-sku" className="text-xs font-semibold">
                  SKU / Item Code
                </Label>
                <Input
                  id="p-sku"
                  value={formSku}
                  onChange={(e) => setFormSku(e.target.value)}
                  placeholder="e.g. PRD-1001"
                  className="bg-muted border-border text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-category" className="text-xs font-semibold">
                  Category
                </Label>
                <Input
                  id="p-category"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  placeholder="e.g. Software, Hardware, Real Estate"
                  className="bg-muted border-border text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="p-price" className="text-xs font-semibold">
                  Unit Price ({defaultCurrency}) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="p-price"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formUnitPrice}
                  onChange={(e) => setFormUnitPrice(e.target.value)}
                  placeholder="0.00"
                  className="bg-muted border-border text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-unit" className="text-xs font-semibold">
                  Unit of Measurement
                </Label>
                <select
                  id="p-unit"
                  value={formUnit}
                  onChange={(e) => setFormUnit(e.target.value)}
                  className="w-full h-9 rounded-md border border-border bg-muted px-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {COMMON_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="p-gst" className="text-xs font-semibold flex items-center gap-1">
                  <Percent className="h-3.5 w-3.5 text-primary" />
                  Indian GST Rate
                </Label>
                <select
                  id="p-gst"
                  value={formTaxRate}
                  onChange={(e) => setFormTaxRate(e.target.value)}
                  className="w-full h-9 rounded-md border border-border bg-muted px-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {GST_BRACKETS.map((b) => (
                    <option key={b.rate} value={b.rate}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-hsn" className="text-xs font-semibold">
                  HSN / SAC Code
                </Label>
                <Input
                  id="p-hsn"
                  value={formHsnSac}
                  onChange={(e) => setFormHsnSac(e.target.value)}
                  placeholder="e.g. 998314 or 8471"
                  className="bg-muted border-border text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-desc" className="text-xs font-semibold">
                Description / Line item default text
              </Label>
              <Textarea
                id="p-desc"
                rows={2}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Optional details printed on estimates and invoices..."
                className="bg-muted border-border text-sm resize-none"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1 text-xs text-foreground select-none">
              <input
                type="checkbox"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary h-4 w-4"
              />
              <span>Available for sales orders and tax invoices</span>
            </label>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="border-border text-muted-foreground"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-primary text-primary-foreground">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingProduct ? 'Update Product' : 'Create Product'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-base text-red-500 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete Product
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to delete <strong>{targetProduct?.name}</strong>? Existing estimates and invoices will keep their historical record.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-border"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={submitting}
              onClick={handleDeleteProduct}
            >
              {submitting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
