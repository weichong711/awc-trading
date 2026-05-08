import { useState } from "react";
import { createPortal } from "react-dom";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Receipt,
  DollarSign,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { ScrollArea } from "./ui/scroll-area";
import {
  Product,
  OrderItem,
  Order,
  UnitType,
  ReceiptBusinessProfile,
} from "../types/business";
import { ReceiptMerchantHeader } from "./ReceiptMerchantHeader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { useLanguage } from "../contexts/LanguageContext";
import { printElementById } from "../../lib/print";

interface OrderSummaryProps {
  products: Product[];
  onPlaceOrder: (order: Omit<Order, "id">) => void;
  businessProfile: ReceiptBusinessProfile;
}

export function OrderSummary({
  products,
  onPlaceOrder,
  businessProfile,
}: OrderSummaryProps) {
  const { t } = useLanguage();

  const [cart, setCart] = useState<OrderItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedUnit, setSelectedUnit] = useState<UnitType>("unit");
  const [customPrice, setCustomPrice] = useState<number>(0);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);

  const [discountType, setDiscountType] = useState<"percentage" | "fixed">(
    "percentage",
  );
  const [discount, setDiscount] = useState(0);
  const [cashTendered, setCashTendered] = useState<number | "">("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "qr" | "card">("cash");

  // Only show products that are not hidden from orders
  const visibleProducts = products.filter((p) => p.showInOrders !== false);
  const categories = [...new Set(visibleProducts.map((p) => p.category))];

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setSelectedUnit(product.unit);
    setQuantity(1);
    setCustomPrice(product.price);
    setDialogOpen(true);
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;

    const existingItem = cart.find(
      (item) =>
        item.productId === selectedProduct.id && item.unit === selectedUnit,
    );

    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.productId === selectedProduct.id && item.unit === selectedUnit
            ? {
                ...item,
                quantity: item.quantity + quantity,
                total: (item.quantity + quantity) * customPrice,
              }
            : item,
        ),
      );
    } else {
      const newItem: OrderItem = {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        quantity,
        unit: selectedUnit,
        price: customPrice,
        total: customPrice * quantity,
      };
      setCart([...cart, newItem]);
    }

    setDialogOpen(false);
    setSelectedProduct(null);
  };

  const updateCartItemQuantity = (index: number, delta: number) => {
    const newCart = [...cart];
    const newQuantity = newCart[index].quantity + delta;

    if (newQuantity <= 0) {
      removeFromCart(index);
    } else {
      newCart[index].quantity = newQuantity;
      newCart[index].total = newQuantity * newCart[index].price;
      setCart(newCart);
    }
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const getSubtotal = () => cart.reduce((sum, item) => sum + item.total, 0);

  const getDiscountAmount = () => {
    if (discountType === "percentage") {
      return (getSubtotal() * discount) / 100;
    }
    return discount;
  };

  const getFinalTotal = () => getSubtotal() - getDiscountAmount();

  const handlePlaceOrder = () => {
    if (cart.length === 0) return;

    const subtotal = getSubtotal();
    const discountAmount = getDiscountAmount();
    const finalTotal = getFinalTotal();

    const order: Omit<Order, "id"> = {
      items: cart,
      subtotal,
      discountType,
      discount,
      discountAmount,
      total: finalTotal,
      cashTendered: cashTendered !== "" && Number(cashTendered) > 0 ? Number(cashTendered) : undefined,
      paymentMethod,
      date: new Date(),
      status: "completed",
    };

    const id = Date.now().toString();

    onPlaceOrder(order);
    setLastOrder({ ...order, id });
    setCart([]);
    setDiscount(0);
    setCashTendered("");
    setPaymentMethod("cash");
    setReceiptDialogOpen(true);
  };

  const printReceipt = () => {
    if (!lastOrder) return;
    
    // For Bluetooth printing, format the receipt directly from order data
    const printerConfig = localStorage.getItem("printerConfig");
    if (printerConfig) {
      try {
        const config = JSON.parse(printerConfig);
        if (config.printerType === "bluetooth") {
          // Import and use direct formatting
          import("../../lib/format-receipt-text").then(({ formatOrderReceipt }) => {
            const receiptText = formatOrderReceipt(lastOrder, businessProfile);
            
            // Import Bluetooth print function
            import("../../lib/bluetooth-print").then(({ printToBluetoothPrinter }) => {
              printToBluetoothPrinter(receiptText, config.deviceId)
                .then(() => {
                  console.log("✅ Printed successfully");
                })
                .catch((error) => {
                  console.error("Print failed:", error);
                  // Fallback to HTML printing
                  void printElementById("print-receipt-orders", "receipt");
                });
            });
          });
          return;
        }
      } catch (error) {
        console.error("Error parsing printer config:", error);
      }
    }
    
    // Fallback to HTML printing for browser print
    void printElementById("print-receipt-orders", "receipt");
  };

  /** Portal keeps the print node under `document.body` so mobile print preview is not blank when an ancestor (e.g. Radix Tabs) uses `display: none` / `hidden`. */
  const printableReceipt =
    lastOrder &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        id="print-receipt-orders"
        className="receipt-root print-only space-y-3 font-mono text-sm"
        aria-hidden
      >
        {/* Business Header */}
        <div className="text-center pb-2">
          <h2 className="text-xl font-bold mb-1">{businessProfile.businessName || "AWC TRADING"}</h2>
          <p className="text-xs mb-2">{t.orders.officialReceipt}</p>
          {businessProfile.username && (
            <div className="text-xs text-left">
              <div className="flex justify-between">
                <span>{t.settings.username}:</span>
                <span>{businessProfile.username}</span>
              </div>
            </div>
          )}
          {businessProfile.phoneNumber && (
            <div className="text-xs text-left">
              <div className="flex justify-between">
                <span>{t.settings.phoneNumber}:</span>
                <span>{businessProfile.phoneNumber}</span>
              </div>
            </div>
          )}
          {businessProfile.email && (
            <div className="text-xs text-left">
              <div className="flex justify-between">
                <span>{t.settings.email}:</span>
                <span className="break-all">{businessProfile.email}</span>
              </div>
            </div>
          )}
        </div>

        {/* Separator */}
        <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }}></div>

        {/* Receipt Info */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>{t.orders.receiptNo}:</span>
            <span className="font-bold">#{lastOrder.id}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>{t.common.date}:</span>
            <span>{new Date(lastOrder.date).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>{t.orders.time}:</span>
            <span>{new Date(lastOrder.date).toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Separator */}
        <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }}></div>

        {/* Items */}
        <div>
          <div className="font-bold mb-2 text-xs">{t.orders.itemsLabel}</div>
          {lastOrder.items.map((item, index) => (
            <div key={index} className="mb-2">
              <div className="text-xs">{item.productName}</div>
              <div className="flex justify-between text-xs">
                <span>
                  {item.quantity} {item.unit} x RM {item.price.toFixed(2)}
                </span>
                <span className="font-bold">RM {item.total.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Separator */}
        <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }}></div>

        {/* Totals */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>{t.orders.subtotalLabel}:</span>
            <span>RM {lastOrder.subtotal.toFixed(2)}</span>
          </div>

          {lastOrder.discount > 0 && (
            <div className="flex justify-between text-xs">
              <span>
                {t.orders.discount}{" "}
                {lastOrder.discountType === "percentage"
                  ? `(${lastOrder.discount}%)`
                  : ""}:
              </span>
              <span>- RM {lastOrder.discountAmount.toFixed(2)}</span>
            </div>
          )}

          <div style={{ borderTop: "2px solid #000", margin: "4px 0" }}></div>

          <div className="flex justify-between font-bold">
            <span>{t.orders.totalFinal}:</span>
            <span>RM {lastOrder.total.toFixed(2)}</span>
          </div>

          <div style={{ borderTop: "2px solid #000", margin: "4px 0" }}></div>

          {lastOrder.paymentMethod && (
            <div className="flex justify-between text-xs">
              <span>{t.orders.payment}:</span>
              <span>{lastOrder.paymentMethod === "qr" ? t.orders.paymentQr : lastOrder.paymentMethod === "card" ? t.orders.paymentCard : t.orders.paymentCash}</span>
            </div>
          )}
          {lastOrder.cashTendered != null && lastOrder.cashTendered > 0 && (
            <>
              <div className="flex justify-between text-xs">
                <span>{t.orders.cashReceived}:</span>
                <span>RM {lastOrder.cashTendered.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold">
                <span>{t.orders.change}:</span>
                <span>RM {(lastOrder.cashTendered - lastOrder.total).toFixed(2)}</span>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs" style={{ marginTop: "12px" }}>
          <p>{t.orders.thankYou}</p>
          <p className="mt-1">{t.orders.comeAgain}</p>
        </div>
      </div>,
      document.body,
    );

  return (
    <div className="p-6">
      {printableReceipt}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Products Section */}
        <div className="lg:col-span-2">
          <div className="space-y-6">
            {categories.map((category) => (
              <div key={category}>
                <h2 className="text-lg font-medium mb-3">{category}</h2>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {visibleProducts
                    .filter((p) => p.category === category)
                    .map((product) => (
                      <Card
                        key={product.id}
                        className="cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => handleProductClick(product)}
                      >
                        <CardContent className="p-4">
                          <div className="aspect-square bg-muted rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <DollarSign className="h-8 w-8 text-muted-foreground" />
                            )}
                          </div>
                          <h3 className="font-medium text-sm mb-1 truncate">
                            {product.name}
                          </h3>
                          <p className="text-lg font-medium text-primary">
                            RM {product.price.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t.orders.pricePerUnit} {product.unit}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cart Section */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  {t.orders.cart}
                </CardTitle>
                <Badge variant="secondary">
                  {cart.length} {t.orders.items}
                </Badge>
              </div>
            </CardHeader>

            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                {cart.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{t.orders.emptyCart}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item, index) => (
                      <Card key={`${item.productId}-${index}`}>
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium text-sm">{item.productName}</p>
                              <p className="text-xs text-muted-foreground">
                                RM {item.price.toFixed(2)} / {item.unit}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFromCart(index)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateCartItemQuantity(index, -1)}
                                className="h-8 w-8 p-0"
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="font-medium text-sm w-10 text-center">
                                {item.quantity}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateCartItemQuantity(index, 1)}
                                className="h-8 w-8 p-0"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                            <p className="font-medium text-sm">
                              RM {item.total.toFixed(2)}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="discount-type" className="text-sm">
                    {t.orders.discountType}
                  </Label>
                  <Select
                    value={discountType}
                    onValueChange={(value: "percentage" | "fixed") => {
                      setDiscountType(value);
                      setDiscount(0);
                    }}
                    disabled={cart.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">{t.orders.percentage}</SelectItem>
                      <SelectItem value="fixed">{t.orders.fixedAmount}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discount" className="text-sm">
                    {discountType === "percentage"
                      ? t.orders.discountPercentage
                      : t.orders.discountAmount}
                  </Label>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    max={discountType === "percentage" ? "100" : getSubtotal().toString()}
                    step="0.01"
                    value={discount}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      if (discountType === "percentage") {
                        setDiscount(Math.min(100, Math.max(0, value)));
                      } else {
                        setDiscount(Math.min(getSubtotal(), Math.max(0, value)));
                      }
                    }}
                    placeholder="0"
                    disabled={cart.length === 0}
                  />
                </div>

                {discount > 0 && (
                  <div className="flex justify-between items-center text-sm text-green-600">
                    <span>
                      {t.orders.discount}{" "}
                      {discountType === "percentage" ? `(${discount}%)` : ""}
                    </span>
                    <span>- RM {getDiscountAmount().toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center font-medium text-lg border-t pt-2">
                  <span>{t.orders.subtotal}</span>
                  <span className="text-primary">
                    RM {getFinalTotal().toFixed(2)}
                  </span>
                </div>

                {/* Payment method */}
                <div className="space-y-2">
                  <Label className="text-sm">Payment Method</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["cash", "qr", "card"] as const).map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        disabled={cart.length === 0}
                        className={`py-2 rounded-lg border text-sm font-medium transition-all ${
                          paymentMethod === method
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border hover:border-primary/40 text-muted-foreground"
                        }`}
                      >
                        {method === "qr" ? "QR" : method.charAt(0).toUpperCase() + method.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cash tendered — only shown for cash */}
                {paymentMethod === "cash" && (
                <div className="space-y-2">
                  <Label htmlFor="cash-tendered" className="text-sm">Cash Received (RM)</Label>
                  <Input
                    id="cash-tendered"
                    type="number"
                    min={getFinalTotal()}
                    step="0.01"
                    value={cashTendered}
                    onChange={(e) => setCashTendered(parseFloat(e.target.value) || "")}
                    placeholder={`Min. RM ${getFinalTotal().toFixed(2)}`}
                    disabled={cart.length === 0}
                  />
                  {cashTendered !== "" && Number(cashTendered) >= getFinalTotal() && (
                    <div className="flex justify-between items-center text-sm font-medium text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
                      <span>Change</span>
                      <span>RM {(Number(cashTendered) - getFinalTotal()).toFixed(2)}</span>
                    </div>
                  )}
                  {cashTendered !== "" && Number(cashTendered) < getFinalTotal() && (
                    <p className="text-xs text-red-500">Amount is less than total</p>
                  )}
                </div>
                )}

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handlePlaceOrder}
                  disabled={cart.length === 0 || (cashTendered !== "" && Number(cashTendered) < getFinalTotal())}
                >
                  <Receipt className="mr-2 h-4 w-4" />
                  {t.orders.placeOrder}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add to Cart Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedProduct?.name}</DialogTitle>
            <DialogDescription>
              {t.orders.pricePerUnit} RM {selectedProduct?.price} /{" "}
              {selectedProduct?.unit}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t.common.quantity}</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Price (RM)</Label>
                {customPrice !== selectedProduct?.price && (
                  <button
                    type="button"
                    onClick={() => setCustomPrice(selectedProduct?.price || 0)}
                    className="text-xs text-primary hover:underline"
                  >
                    Reset to default (RM {selectedProduct?.price.toFixed(2)})
                  </button>
                )}
              </div>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={customPrice}
                onChange={(e) => setCustomPrice(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="grid gap-2">
              <Label>{t.common.unit}</Label>
              <Select
                value={selectedUnit}
                onValueChange={(value) => setSelectedUnit(value as UnitType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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

            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span>{t.orders.totalLabel}</span>
              <span className="text-xl font-medium">
                RM {(quantity * customPrice).toFixed(2)}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={handleAddToCart}>{t.orders.addToCart}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog (Close above Print, Print opens dialog immediately) */}
      <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="sr-only">Order Receipt</DialogTitle>
            <DialogDescription className="sr-only">
              Official receipt for your order
            </DialogDescription>
          </DialogHeader>

          {lastOrder && (
            <div className="space-y-3 font-mono text-sm">
              {/* Business Header */}
              <div className="text-center pb-2">
                <h2 className="text-xl font-bold mb-1">{businessProfile.businessName || "AWC TRADING"}</h2>
                <p className="text-xs mb-2">{t.orders.officialReceipt}</p>
                {businessProfile.username && (
                  <div className="text-xs text-left">
                    <div className="flex justify-between">
                      <span>{t.settings.username}:</span>
                      <span>{businessProfile.username}</span>
                    </div>
                  </div>
                )}
                {businessProfile.phoneNumber && (
                  <div className="text-xs text-left">
                    <div className="flex justify-between">
                      <span>{t.settings.phoneNumber}:</span>
                      <span>{businessProfile.phoneNumber}</span>
                    </div>
                  </div>
                )}
                {businessProfile.email && (
                  <div className="text-xs text-left">
                    <div className="flex justify-between">
                      <span>{t.settings.email}:</span>
                      <span className="break-all">{businessProfile.email}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Separator */}
              <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }}></div>

              {/* Receipt Info */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>{t.orders.receiptNo}:</span>
                  <span className="font-bold">#{lastOrder.id}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>{t.common.date}:</span>
                  <span>{new Date(lastOrder.date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>{t.orders.time}:</span>
                  <span>{new Date(lastOrder.date).toLocaleTimeString()}</span>
                </div>
              </div>

              {/* Separator */}
              <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }}></div>

              {/* Items */}
              <div>
                <div className="font-bold mb-2 text-xs">{t.orders.itemsLabel}</div>
                {lastOrder.items.map((item, index) => (
                  <div key={index} className="mb-2">
                    <div className="text-xs">{item.productName}</div>
                    <div className="flex justify-between text-xs">
                      <span>
                        {item.quantity} {item.unit} x RM {item.price.toFixed(2)}
                      </span>
                      <span className="font-bold">RM {item.total.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Separator */}
              <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }}></div>

              {/* Totals */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>{t.orders.subtotalLabel}:</span>
                  <span>RM {lastOrder.subtotal.toFixed(2)}</span>
                </div>
                {lastOrder.discount > 0 && (
                  <div className="flex justify-between text-xs">
                    <span>
                      {t.orders.discount}{" "}
                      {lastOrder.discountType === "percentage"
                        ? `(${lastOrder.discount}%)`
                        : ""}:
                    </span>
                    <span>- RM {lastOrder.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ borderTop: "2px solid #000", margin: "4px 0" }}></div>
                <div className="flex justify-between font-bold">
                  <span>{t.orders.totalFinal}:</span>
                  <span>RM {lastOrder.total.toFixed(2)}</span>
                </div>
                <div style={{ borderTop: "2px solid #000", margin: "4px 0" }}></div>
                {lastOrder.paymentMethod && (
                  <div className="flex justify-between text-xs">
                    <span>{t.orders.payment}:</span>
                    <span className="capitalize">{lastOrder.paymentMethod === "qr" ? t.orders.paymentQr : lastOrder.paymentMethod === "card" ? t.orders.paymentCard : t.orders.paymentCash}</span>
                  </div>
                )}
                {lastOrder.cashTendered != null && lastOrder.cashTendered > 0 && (
                  <>
                    <div className="flex justify-between text-xs">
                      <span>{t.orders.cashReceived}:</span>
                      <span>RM {lastOrder.cashTendered.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold">
                      <span>{t.orders.change}:</span>
                      <span>RM {(lastOrder.cashTendered - lastOrder.total).toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="text-center text-xs" style={{ marginTop: "12px" }}>
                <p>{t.orders.thankYou}</p>
                <p className="mt-1">{t.orders.comeAgain}</p>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col gap-2 sm:flex-col">
            <Button
              variant="outline"
              onClick={() => setReceiptDialogOpen(false)}
              className="w-full"
            >
              {t.common.close}
            </Button>

            <Button
              onClick={() => {
                printReceipt();
                setReceiptDialogOpen(false);
              }}
              className="w-full"
            >
              <Receipt className="mr-2 h-4 w-4" />
              {t.orders.printReceipt}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
