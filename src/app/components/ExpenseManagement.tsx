import { DollarSign } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Expense } from "../types/business";
import { useLanguage } from "../contexts/LanguageContext";

interface ExpenseManagementProps {
  expenses: Expense[];
}

export function ExpenseManagement({
  expenses,
}: ExpenseManagementProps) {
  const { t } = useLanguage();

  // ── Handlers ──────────────────────────────────────────────────────────────
  const getTotalExpenses = () => expenses.reduce((s, e) => s + e.totalCost, 0);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Summary - Total Expenses Only */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t.expenses.title}</CardTitle>
              <CardDescription>Track your business expenses from stock top-ups</CardDescription>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">{t.expenses.totalExpenses}</p>
              <p className="text-2xl font-medium text-primary">RM {getTotalExpenses().toFixed(2)}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
            <DollarSign className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" />
            <div>
              <strong>Expenses are now managed in Stock Management</strong>
              <p className="text-xs mt-1 text-blue-700">
                All stock top-ups automatically create expense records. Product management has been moved to the Stock tab for a unified inventory experience.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Note: Product Grid and Recent Expenses sections removed - now in Stock Management */}

    </div>
  );
}
      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.expenses.addExpense}</DialogTitle>
            <DialogDescription>{t.expenses.addExpenseDesc}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t.expenses.product}</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger><SelectValue placeholder={t.expenses.product} /></SelectTrigger>
                <SelectContent>
                  {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t.common.quantity}</Label>
                <Input type="number" min="0" step="0.01" value={quantity}
                  onChange={e => setQuantity(parseFloat(e.target.value) || 0)} />
              </div>
              <div className="grid gap-2">
                <Label>{t.common.unit}</Label>
                <Select value={unit} onValueChange={v => setUnit(v as UnitType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unit">{t.units.unit}</SelectItem>
                    <SelectItem value="kg">{t.units.kg}</SelectItem>
                    <SelectItem value="gram">{t.units.gram}</SelectItem>
                    <SelectItem value="liter">{t.units.liter}</SelectItem>
                    <SelectItem value="ml">{t.units.ml}</SelectItem>
                    <SelectItem value="piece">{t.units.piece}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{t.expenses.costPerUnit}</Label>
              <Input type="number" min="0" step="0.01" value={costPerUnit}
                onChange={e => setCostPerUnit(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="grid gap-2">
              <Label className="flex items-center gap-1.5">
                Stock Expiry Date
                <span className="text-xs font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                type="date"
                value={expiryDate}
                onChange={e => setExpiryDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
              {expiryDate && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  ⏱ Expiry will be set on the stock item automatically
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label>{t.common.notes}</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder={t.common.notes} rows={2} />
            </div>
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span>{t.expenses.totalCost}:</span>
              <span className="text-xl font-medium">RM {(quantity * costPerUnit).toFixed(2)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpenseDialogOpen(false)}>{t.common.cancel}</Button>
            <Button onClick={handleAddExpense}>{t.expenses.addExpense}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Product Dialog ─────────────────────────────────────────────── */}
      <Dialog open={productDialogOpen} onOpenChange={(v) => { setProductDialogOpen(v); if (!v) { setNewProductError(""); setNewProduct({ ...BLANK_PRODUCT }); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.expenses.addProductTitle}</DialogTitle>
            <DialogDescription>{t.expenses.addProductDesc}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t.expenses.productName}</Label>
              <Input value={newProduct.name}
                onChange={e => { setNewProduct(p => ({ ...p, name: e.target.value })); setNewProductError(""); }}
                placeholder={t.expenses.productNamePlaceholder}
                className={newProductError ? "border-red-400 focus:ring-red-200" : ""} />
              {newProductError && (
                <p className="text-xs text-red-500">{newProductError}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label>{t.expenses.category}</Label>
              <Input value={newProduct.category}
                onChange={e => setNewProduct(p => ({ ...p, category: e.target.value }))}
                placeholder={t.expenses.categoryPlaceholder} />
            </div>
            {/* Show in Orders toggle */}
            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
              <div>
                <p className="text-sm font-medium">{t.expenses.showInOrders}</p>
                <p className="text-xs text-muted-foreground">{t.expenses.showInOrdersDesc}</p>
              </div>
              <button
                type="button"
                onClick={() => setNewProduct(p => ({ ...p, showInOrders: !p.showInOrders }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${newProduct.showInOrders ? "bg-primary" : "bg-muted-foreground/30"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${newProduct.showInOrders ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
            <div className="grid gap-2">
              <Label>{t.expenses.productImage}</Label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1"
                    onClick={() => document.getElementById("new-product-image-upload")?.click()}>
                    {t.expenses.uploadImage}
                  </Button>
                  <input id="new-product-image-upload" type="file" accept="image/*" className="hidden"
                    onChange={e => handleImageUpload(e, false)} />
                </div>
                <div className="text-xs text-muted-foreground text-center">{t.common.or}</div>
                <Input
                  value={newProduct.imageUrl.startsWith("data:") ? "" : newProduct.imageUrl}
                  onChange={e => setNewProduct(p => ({ ...p, imageUrl: e.target.value }))}
                  placeholder={t.expenses.pasteImageUrl} />
              </div>
              {newProduct.imageUrl && (
                <div className="mt-2 relative">
                  <div className="aspect-square w-32 bg-muted rounded-lg overflow-hidden mx-auto">
                    <img src={newProduct.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="absolute top-0 right-0"
                    onClick={() => setNewProduct(p => ({ ...p, imageUrl: "" }))}>{t.common.remove}</Button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t.expenses.sellingPrice}</Label>
                <Input type="number" min="0" step="0.01" value={newProduct.price}
                  onChange={e => setNewProduct(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="grid gap-2">
                <Label>{t.expenses.costPerUnit}</Label>
                <Input type="number" min="0" step="0.01" value={newProduct.cost}
                  onChange={e => setNewProduct(p => ({ ...p, cost: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t.expenses.unitType}</Label>
                <Select value={newProduct.unit} onValueChange={v => setNewProduct(p => ({ ...p, unit: v as UnitType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unit">{t.units.unit}</SelectItem>
                    <SelectItem value="kg">{t.units.kg}</SelectItem>
                    <SelectItem value="gram">{t.units.gram}</SelectItem>
                    <SelectItem value="liter">{t.units.liter}</SelectItem>
                    <SelectItem value="ml">{t.units.ml}</SelectItem>
                    <SelectItem value="piece">{t.units.piece}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t.expenses.initialStock}</Label>
                <Input type="number" min="0" value={newProduct.stock}
                  onChange={e => setNewProduct(p => ({ ...p, stock: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductDialogOpen(false)}>{t.common.cancel}</Button>
            <Button onClick={handleAddProduct}>{t.expenses.addProduct}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Product Dialog ────────────────────────────────────────────── */}
      <Dialog open={editProductDialogOpen} onOpenChange={setEditProductDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.expenses.editProduct}</DialogTitle>
            <DialogDescription>{t.expenses.editProductDesc}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t.expenses.productName}</Label>
              <Input value={editProduct.name}
                onChange={e => setEditProduct(p => ({ ...p, name: e.target.value }))}
                placeholder={t.expenses.productNamePlaceholder} />
            </div>
            <div className="grid gap-2">
              <Label>{t.expenses.category}</Label>
              <Input value={editProduct.category}
                onChange={e => setEditProduct(p => ({ ...p, category: e.target.value }))}
                placeholder={t.expenses.categoryPlaceholder} />
            </div>
            {/* Show in Orders toggle */}
            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
              <div>
                <p className="text-sm font-medium">{t.expenses.showInOrders}</p>
                <p className="text-xs text-muted-foreground">{t.expenses.showInOrdersDesc}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditProduct(p => ({ ...p, showInOrders: !p.showInOrders }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${editProduct.showInOrders ? "bg-primary" : "bg-muted-foreground/30"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${editProduct.showInOrders ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
            <div className="grid gap-2">
              <Label>{t.expenses.productImage}</Label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1"
                    onClick={() => document.getElementById("edit-product-image-upload")?.click()}>
                    {t.expenses.uploadImage}
                  </Button>
                  <input id="edit-product-image-upload" type="file" accept="image/*" className="hidden"
                    onChange={e => handleImageUpload(e, true)} />
                </div>
              </div>
              {editProduct.imageUrl && (
                <div className="mt-2 relative">
                  <div className="aspect-square w-32 bg-muted rounded-lg overflow-hidden mx-auto">
                    <img src={editProduct.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="absolute top-0 right-0"
                    onClick={() => setEditProduct(p => ({ ...p, imageUrl: "" }))}>{t.common.remove}</Button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t.expenses.sellingPrice}</Label>
                <Input type="number" min="0" step="0.01" value={editProduct.price}
                  onChange={e => setEditProduct(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="grid gap-2">
                <Label>{t.expenses.costPerUnit}</Label>
                <Input type="number" min="0" step="0.01" value={editProduct.cost}
                  onChange={e => setEditProduct(p => ({ ...p, cost: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t.expenses.unitType}</Label>
                <Select value={editProduct.unit} onValueChange={v => setEditProduct(p => ({ ...p, unit: v as UnitType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unit">{t.units.unit}</SelectItem>
                    <SelectItem value="kg">{t.units.kg}</SelectItem>
                    <SelectItem value="gram">{t.units.gram}</SelectItem>
                    <SelectItem value="liter">{t.units.liter}</SelectItem>
                    <SelectItem value="ml">{t.units.ml}</SelectItem>
                    <SelectItem value="piece">{t.units.piece}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t.expenses.initialStock}</Label>
                <Input type="number" min="0" value={editProduct.stock}
                  onChange={e => setEditProduct(p => ({ ...p, stock: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProductDialogOpen(false)}>{t.common.cancel}</Button>
            <Button onClick={handleEditProduct}>{t.expenses.updateProduct}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ─────────────────────────────────────── */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.expenses.deleteProduct}</DialogTitle>
            <DialogDescription>{t.expenses.deleteProductConfirm}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteConfirmOpen(false); setProductToDelete(""); }}>
              {t.common.cancel}
            </Button>
            <Button variant="destructive" onClick={() => {
              if (onDeleteProduct && productToDelete) { onDeleteProduct(productToDelete); }
              setDeleteConfirmOpen(false); setProductToDelete("");
            }}>
              {t.common.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
