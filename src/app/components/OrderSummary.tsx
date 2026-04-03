import { useState } from "react";
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
  const [dialogOpen, setDialogOpen] = useState(false);

  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);

  const [discountType, setDiscountType] = useState<"percentage" | "fixed">(
    "percentage",
  );
  const [discount, setDiscount] = useState(0);

  // Only show products that are not hidden from orders
  const visibleProducts = products.filter((p) => p.showInOrders !== false);
  const categories = [...new Set(visibleProducts.map((p) => p.category))];

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setSelectedUnit(product.unit);
    setQuantity(1);
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
                total: (item.quantity + quantity) * item.price,
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
        price: selectedProduct.price,
        total: selectedProduct.price * quantity,
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
      date: new Date(),
      status: "completed",
    };

    const id = Date.now().toString();

    onPlaceOrder(order);
    setLastOrder({ ...order, id });
    setCart([]);
    setDiscount(0);
    setReceiptDialogOpen(true);
  };

  const printReceipt = () => {
    // Use an isolated print iframe for better mobile/tablet compatibility.
    void printElementById("print-receipt-orders", "receipt");
  };

  return (
    <div className="p-6">
      {/* Hidden printable receipt (80mm) */}
      {lastOrder && (
        <div id="print-receipt-orders" className="space-y-4 font-mono text-sm">
          <ReceiptMerchantHeader profile={businessProfile} />

          {/* Order Info */}
          <div className="space-y-1 border-b border-dashed border-black pb-3">
            <div className="flex justify-between">
              <span>{t.orders.receiptNo}:</span>
              <span className="font-bold">#{lastOrder.id}</span>
            </div>
            <div className="flex justify-between">
              <span>{t.common.date}:</span>
              <span>{new Date(lastOrder.date).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Time:</span>
              <span>{new Date(lastOrder.date).toLocaleTimeString()}</span>
            </div>
          </div>

          {/* Items */}
          <div className="border-b-2 border-dashed border-black pb-3">
            <div className="font-bold mb-2">{t.orders.itemsLabel}</div>
            {lastOrder.items.map((item, index) => (
              <div key={index} className="mb-3">
                <div className="flex justify-between">
                  <span>{item.productName}</span>
                </div>
                <div className="flex justify-between text-xs pl-2">
                  <span>
                    {item.quantity} {item.unit} x RM {item.price.toFixed(2)}
                  </span>
                  <span className="font-bold">RM {item.total.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>{t.orders.subtotalLabel}</span>
              <span>RM {lastOrder.subtotal.toFixed(2)}</span>
            </div>

            {lastOrder.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>
                  {t.orders.discount}{" "}
                  {lastOrder.discountType === "percentage"
                    ? `(${lastOrder.discount}%)`
                    : t.orders.discountFixed}
                  :
                </span>
                <span>- RM {lastOrder.discountAmount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-base font-bold border-t-2 border-dashed border-black pt-2">
              <span>{t.orders.totalFinal}</span>
              <span>RM {lastOrder.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs border-t border-dashed border-black pt-3">
            <p>{t.orders.thankYou}</p>
            <p className="mt-1">{t.orders.comeAgain}</p>
          </div>
        </div>
      )}

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

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handlePlaceOrder}
                  disabled={cart.length === 0}
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
                RM {(quantity * (selectedProduct?.price || 0)).toFixed(2)}
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
            <div className="space-y-4 font-mono text-sm">
              <ReceiptMerchantHeader profile={businessProfile} />

              <div className="space-y-1 border-b border-dashed pb-3">
                <div className="flex justify-between">
                  <span>{t.orders.receiptNo}:</span>
                  <span className="font-bold">#{lastOrder.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t.common.date}:</span>
                  <span>{new Date(lastOrder.date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Time:</span>
                  <span>{new Date(lastOrder.date).toLocaleTimeString()}</span>
                </div>
              </div>

              <div className="border-b-2 border-dashed pb-3">
                <div className="font-bold mb-2">{t.orders.itemsLabel}</div>
                {lastOrder.items.map((item, index) => (
                  <div key={index} className="mb-3">
                    <div className="flex justify-between">
                      <span>{item.productName}</span>
                    </div>
                    <div className="flex justify-between text-xs pl-2">
                      <span>
                        {item.quantity} {item.unit} x RM {item.price.toFixed(2)}
                      </span>
                      <span className="font-bold">RM {item.total.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>{t.orders.subtotalLabel}</span>
                  <span>RM {lastOrder.subtotal.toFixed(2)}</span>
                </div>
                {lastOrder.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>
                      {t.orders.discount}{" "}
                      {lastOrder.discountType === "percentage"
                        ? `(${lastOrder.discount}%)`
                        : t.orders.discountFixed}
                      :
                    </span>
                    <span>- RM {lastOrder.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold border-t-2 border-dashed pt-2">
                  <span>{t.orders.totalFinal}</span>
                  <span>RM {lastOrder.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center text-xs border-t border-dashed pt-3">
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
