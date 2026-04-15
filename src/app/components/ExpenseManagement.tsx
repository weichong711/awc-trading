import { useState } from "react";
import { Plus, Trash2, DollarSign, Edit, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Product, Expense, UnitType } from "../types/business";
import { Textarea } from "./ui/textarea";
import { useLanguage } from "../contexts/LanguageContext";

interface ExpenseManagementProps {
  products: Product[];
  expenses: Expense[];
  onAddExpense: (expense: Omit<Expense, "id">) => void;
  onDeleteExpense: (id: string) => void;
  onAddProduct: (product: Omit<Product, "id">) => void;
  onUpdateProduct?: (id: string, product: Omit<Product, "id">) => void;
  onDeleteProduct?: (id: string) => void;
}

const BLANK_PRODUCT = {
  name: "",
  category: "",
  price: 0,
  cost: 0,
  unit: "unit" as UnitType,
  stock: 0,
  imageUrl: "",
  showInOrders: true,
};

export function ExpenseManagement({
  products,
  expenses,
  onAddExpense,
  onDeleteExpense,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
}: ExpenseManagementProps) {
  const { t } = useLanguage();
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editProductDialogOpen, setEditProductDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string>("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [editingProductId, setEditingProductId] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [costPerUnit, setCostPerUnit] = useState(0);
  const [unit, setUnit] = useState<UnitType>("unit");
  const [notes, setNotes] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  const [newProduct, setNewProduct] = useState({ ...BLANK_PRODUCT });
  const [editProduct, setEditProduct] = useState({ ...BLANK_PRODUCT });
  const [newProductError, setNewProductError] = useState("");

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleAddExpense = () => {
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;
    onAddExpense({
      productId: product.id,
      productName: product.name,
      quantity,
      unit,
      costPerUnit,
      totalCost: quantity * costPerUnit,
      date: new Date(),
      expiryDate: expiryDate || undefined,
      notes,
    });
    setExpenseDialogOpen(false);
    resetExpenseForm();
  };

  const resetExpenseForm = () => {
    setSelectedProductId(""); setQuantity(0); setCostPerUnit(0); setUnit("unit"); setNotes(""); setExpiryDate("");
  };

  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.category) return;
    const isDuplicate = products.some(
      p => p.name.trim().toLowerCase() === newProduct.name.trim().toLowerCase()
    );
    if (isDuplicate) {
      setNewProductError(`"${newProduct.name}" already exists. Please use a different name.`);
      return;
    }
    onAddProduct(newProduct);
    setProductDialogOpen(false);
    setNewProduct({ ...BLANK_PRODUCT });
    setNewProductError("");
  };

  const handleEditProduct = () => {
    if (!editProduct.name || !editProduct.category || !onUpdateProduct) return;
    onUpdateProduct(editingProductId, editProduct);
    setEditProductDialogOpen(false);
    setEditProduct({ ...BLANK_PRODUCT });
  };

  // Quick toggle showInOrders without opening dialog
  const handleToggleVisibility = (product: Product) => {
    if (!onUpdateProduct) return;
    const current = product.showInOrders !== false; // default true
    onUpdateProduct(product.id, { ...product, showInOrders: !current });
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Please select an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { alert("Image size should be less than 5MB"); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      const b64 = reader.result as string;
      if (isEdit) setEditProduct(p => ({ ...p, imageUrl: b64 }));
      else setNewProduct(p => ({ ...p, imageUrl: b64 }));
    };
    reader.readAsDataURL(file);
  };

  const getTotalExpenses = () => expenses.reduce((s, e) => s + e.totalCost, 0);
  const getRecentExpenses = () =>
    [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t.expenses.title}</CardTitle>
              <CardDescription>{t.expenses.description}</CardDescription>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">{t.expenses.totalExpenses}</p>
              <p className="text-2xl font-medium text-primary">RM {getTotalExpenses().toFixed(2)}</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Product Grid */}
      <Card>
        <CardHeader>
          <CardTitle>{t.expenses.productManagement}</CardTitle>
          <CardDescription>
            {t.expenses.productManagementDesc}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {products.map(product => {
              const visible = product.showInOrders !== false;
              return (
                <Card
                  key={product.id}
                  className={`relative group transition-colors ${visible ? "hover:border-primary" : "opacity-60 border-dashed hover:border-muted-foreground"}`}
                >
                  <CardContent className="p-4">
                    {/* Action buttons top-right */}
                    <div className="absolute top-1 right-1 flex gap-1 z-10">
                      {/* Visibility toggle */}
                      <Button
                        variant="ghost"
                        size="sm"
                        title={visible ? t.expenses.hideFromOrders : t.expenses.showInOrdersBtn}
                        className={`h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity ${visible ? "text-green-600 hover:text-red-500" : "text-muted-foreground hover:text-green-600"}`}
                        onClick={(e) => { e.stopPropagation(); handleToggleVisibility(product); }}
                      >
                        {visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      </Button>
                      {/* Edit button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingProductId(product.id);
                          setEditProduct({
                            name: product.name,
                            category: product.category,
                            price: product.price,
                            cost: product.cost,
                            unit: product.unit,
                            stock: product.stock,
                            imageUrl: product.imageUrl || "",
                            showInOrders: product.showInOrders !== false,
                          });
                          setEditProductDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {onDeleteProduct && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setProductToDelete(product.id);
                            setDeleteConfirmOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>

                    {/* Card body — click to add expense */}
                    <div
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedProductId(product.id);
                        setUnit(product.unit);
                        setExpenseDialogOpen(true);
                      }}
                    >
                      <div className="aspect-square bg-muted rounded-lg mb-2 flex items-center justify-center overflow-hidden relative">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <DollarSign className="h-6 w-6 text-muted-foreground" />
                        )}
                        {!visible && (
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-lg">
                            <EyeOff className="h-5 w-5 text-white" />
                          </div>
                        )}
                      </div>
                      <h4 className="font-medium text-sm truncate">{product.name}</h4>
                      <p className="text-xs text-muted-foreground">{product.category}</p>
                      <p className={`text-xs mt-1 font-semibold ${visible ? "text-green-600" : "text-muted-foreground"}`}>
                        {visible ? t.expenses.inOrders : t.expenses.hidden}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Add New Product */}
            <Card
              className="cursor-pointer hover:border-primary transition-colors border-dashed"
              onClick={() => setProductDialogOpen(true)}
            >
              <CardContent className="p-4">
                <div className="aspect-square bg-muted rounded-lg mb-2 flex items-center justify-center">
                  <Plus className="h-8 w-8 text-muted-foreground" />
                </div>
                <h4 className="font-medium text-sm text-center">{t.expenses.addProduct}</h4>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Recent Expenses Table */}
      <Card>
        <CardHeader><CardTitle>{t.expenses.recentExpenses}</CardTitle></CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t.expenses.noExpenses}</p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.common.date}</TableHead>
                    <TableHead>{t.expenses.product}</TableHead>
                    <TableHead>{t.common.quantity}</TableHead>
                    <TableHead>{t.expenses.costPerUnitCol}</TableHead>
                    <TableHead>{t.expenses.totalCost}</TableHead>
                    <TableHead>{t.common.notes}</TableHead>
                    <TableHead className="text-right">{t.common.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getRecentExpenses().map(expense => (
                    <TableRow key={expense.id}>
                      <TableCell className="text-sm">{new Date(expense.date).toLocaleDateString()}</TableCell>
                      <TableCell>{expense.productName}</TableCell>
                      <TableCell>{expense.quantity} {expense.unit}</TableCell>
                      <TableCell>RM {expense.costPerUnit.toFixed(2)}</TableCell>
                      <TableCell className="font-medium">RM {expense.totalCost.toFixed(2)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{expense.notes || "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => onDeleteExpense(expense.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Add Expense Dialog ─────────────────────────────────────────────── */}
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
