import { useState, useMemo } from "react";
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Award,
  Printer,
  XCircle,
  Receipt,
  PackageOpen,
  ChevronDown,
  ChevronUp,
  Trash2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Badge } from "./ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { Order, Expense, ReceiptBusinessProfile } from "../types/business";
import { ReceiptMerchantHeader } from "./ReceiptMerchantHeader";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
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
} from "./ui/alert-dialog";
import { useLanguage } from "../contexts/LanguageContext";
import { printElementById } from "../../lib/print";

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

interface ProfitAnalyticsProps {
  orders: Order[];
  expenses: Expense[];
  onVoidOrder?: (orderId: string) => void;
  onDeleteExpense?: (id: string) => void;
  businessProfile: ReceiptBusinessProfile;
}

export function ProfitAnalytics({
  orders,
  expenses,
  onVoidOrder,
  onDeleteExpense,
  businessProfile,
}: ProfitAnalyticsProps) {
  const { t } = useLanguage();
  const a = t.analytics;

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 4 + i);

  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState("all");

  const [txYear, setTxYear] = useState(currentYear.toString());
  const [txMonth, setTxMonth] = useState("all");
  const [txShowAll, setTxShowAll] = useState(false);

  const [expYear, setExpYear] = useState(currentYear.toString());
  const [expMonth, setExpMonth] = useState("all");
  const [expShowAll, setExpShowAll] = useState(false);

  const [topYear, setTopYear] = useState(currentYear.toString());
  const [topMonth, setTopMonth] = useState("all");

  const [receiptOpen, setReceiptOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [analyticsReceiptOpen, setAnalyticsReceiptOpen] = useState(false);

  const matchDate = (date: Date, year: string, month: string) => {
    const d = new Date(date);
    return (
      d.getFullYear() === parseInt(year) &&
      (month === "all" || d.getMonth() === parseInt(month))
    );
  };

  const YearMonthFilter = ({
    year,
    month,
    years,
    onYearChange,
    onMonthChange,
  }: {
    year: string;
    month: string;
    years: number[];
    onYearChange: (v: string) => void;
    onMonthChange: (v: string) => void;
  }) => (
    <div className="flex gap-2">
      <Select value={year} onValueChange={onYearChange}>
        <SelectTrigger className="w-[110px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={y.toString()}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={month} onValueChange={onMonthChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Months</SelectItem>
          {MONTH_LABELS.map((label, i) => (
            <SelectItem key={i} value={i.toString()}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const today = new Date().toDateString();
  const todayOrders = orders.filter(
    (o) =>
      new Date(o.date).toDateString() === today && o.status === "completed",
  );
  const todaySales = todayOrders.reduce((s, o) => s + o.total, 0);

  const filteredOrders = orders.filter(
    (o) =>
      matchDate(o.date, selectedYear, selectedMonth) &&
      o.status === "completed",
  );
  const filteredExpenses = expenses.filter((e) =>
    matchDate(e.date, selectedYear, selectedMonth),
  );

  const totalSales = filteredOrders.reduce((s, o) => s + o.total, 0);
  const totalCost = filteredExpenses.reduce((s, e) => s + e.totalCost, 0);
  const profit = totalSales - totalCost;
  const profitMargin = totalSales > 0 ? (profit / totalSales) * 100 : 0;

  const transactions = useMemo(
    () =>
      orders
        .filter(
          (o) =>
            matchDate(o.date, txYear, txMonth) && o.status === "completed",
        )
        .sort(
          (a1, b1) =>
            new Date(b1.date).getTime() - new Date(a1.date).getTime(),
        )
        .map((o) => ({
          id: o.id,
          date: o.date,
          items: o.items
            .map((i) => `${i.productName} (${i.quantity} ${i.unit})`)
            .join(", "),
          amount: o.total,
          paymentMethod: o.paymentMethod,
        })),
    [orders, txYear, txMonth],
  );

  const expenseHistory = useMemo(
    () =>
      expenses
        .filter((e) => matchDate(e.date, expYear, expMonth))
        .sort(
          (a1, b1) =>
            new Date(b1.date).getTime() - new Date(a1.date).getTime(),
        ),
    [expenses, expYear, expMonth],
  );
  const expenseHistoryTotal = expenseHistory.reduce(
    (s, e) => s + e.totalCost,
    0,
  );

  const topProducts = useMemo(() => {
    const map = new Map<string, { quantity: number; revenue: number }>();
    orders
      .filter(
        (o) =>
          matchDate(o.date, topYear, topMonth) && o.status === "completed",
      )
      .forEach((o) =>
        o.items.forEach((item) => {
          const ex = map.get(item.productName) || {
            quantity: 0,
            revenue: 0,
          };
          map.set(item.productName, {
            quantity: ex.quantity + item.quantity,
            revenue: ex.revenue + item.total,
          });
        }),
      );

    return Array.from(map.entries())
      .map(([name, stats], i) => ({
        productKey: `${topYear}-${topMonth}-${name}-${i}`,
        name,
        ...stats,
      }))
      .sort((a1, b1) => b1.revenue - a1.revenue)
      .slice(0, 10);
  }, [orders, topYear, topMonth]);

  const monthlyData = useMemo(() => {
    const data = Array.from({ length: 12 }, (_, i) => ({
      monthKey: `${selectedYear}-${i}`,
      month: MONTH_LABELS[i].substring(0, 3),
      sales: 0,
      cost: 0,
      profit: 0,
    }));

    orders.forEach((o) => {
      const d = new Date(o.date);
      if (
        d.getFullYear() === parseInt(selectedYear) &&
        o.status === "completed"
      ) {
        data[d.getMonth()].sales += o.total;
      }
    });

    expenses.forEach((e) => {
      const d = new Date(e.date);
      if (d.getFullYear() === parseInt(selectedYear)) {
        data[d.getMonth()].cost += e.totalCost;
      }
    });

    data.forEach((d) => {
      d.profit = d.sales - d.cost;
    });

    return data;
  }, [selectedYear, orders, expenses]);

  const handleViewReceipt = (orderId: string) => {
    const o = orders.find((x) => x.id === orderId);
    if (o) {
      setSelectedOrder(o);
      setReceiptOpen(true);
    }
  };

  const printWithTarget = (target: "receipt" | "analytics") => {
    const id =
      target === "receipt" ? "print-receipt-analytics" : "print-analytics";
    void printElementById(id, target);
  };

  const periodLabel =
    selectedMonth === "all"
      ? `${selectedYear} (All Months)`
      : `${selectedYear} (${MONTH_LABELS[Number(selectedMonth)]})`;

  const SHOW_LIMIT = 20;

  return (
    <div className="space-y-6">
      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">
          {a.showingFor}
        </span>

        <YearMonthFilter
          year={selectedYear}
          month={selectedMonth}
          years={yearOptions}
          onYearChange={setSelectedYear}
          onMonthChange={setSelectedMonth}
        />

        <div className="ml-auto">
          <Button variant="outline" onClick={() => setAnalyticsReceiptOpen(true)}>
            <Printer className="mr-2 h-4 w-4" />
            Print Summary
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">{a.todaySales}</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">RM {todaySales.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {todayOrders.length} {a.ordersToday}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">{a.totalSales}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">RM {totalSales.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredOrders.length} {a.completedOrders}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">{a.totalExpenses}</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">RM {totalCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredExpenses.length} {a.expenseEntries}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">{a.netProfit}</CardTitle>
            <TrendingUp
              className={`h-4 w-4 ${
                profit >= 0 ? "text-green-600" : "text-red-500"
              }`}
            />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl ${
                profit >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              RM {profit.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {profitMargin.toFixed(1)}% {a.margin}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{a.monthlyPerformance}</CardTitle>
              <CardDescription>{a.monthlyDesc}</CardDescription>
            </div>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(v) => `RM ${Number(v).toFixed(2)}`} />
              <Legend />
              <Line
                key="line-sales"
                type="monotone"
                dataKey="sales"
                stroke="#0088FE"
                name={a.totalSales}
                strokeWidth={2}
              />
              <Line
                key="line-cost"
                type="monotone"
                dataKey="cost"
                stroke="#FF8042"
                name={a.totalExpenses}
                strokeWidth={2}
              />
              <Line
                key="line-profit"
                type="monotone"
                dataKey="profit"
                stroke="#00C49F"
                name={a.netProfit}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-primary" />
                {a.transactionHistory}
              </CardTitle>
              <CardDescription>{a.transactionDesc}</CardDescription>
            </div>

            <YearMonthFilter
              year={txYear}
              month={txMonth}
              years={yearOptions}
              onYearChange={(v) => {
                setTxYear(v);
                setTxShowAll(false);
              }}
              onMonthChange={(v) => {
                setTxMonth(v);
                setTxShowAll(false);
              }}
            />
          </div>
        </CardHeader>

        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingBag className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{a.noTransactions}</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">
                  {transactions.length} {a.items} •{" "}
                  <span className="font-medium text-foreground">
                    RM{" "}
                    {transactions
                      .reduce((s, tx) => s + tx.amount, 0)
                      .toFixed(2)}
                  </span>
                </p>

                {transactions.length > SHOW_LIMIT && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTxShowAll((v) => !v)}
                  >
                    {txShowAll ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-1" />
                        {a.showLess}
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-1" />
                        {a.showAll} ({transactions.length})
                      </>
                    )}
                  </Button>
                )}
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{a.dateTime}</TableHead>
                      <TableHead>{a.orderId}</TableHead>
                      <TableHead>{a.items}</TableHead>
                      <TableHead>{t.orders.payment}</TableHead>
                      <TableHead className="text-right">{a.amount}</TableHead>
                      <TableHead className="text-right">{t.common.actions}</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {(txShowAll ? transactions : transactions.slice(0, SHOW_LIMIT)).map(
                      (tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="text-sm whitespace-nowrap">
                            {new Date(tx.date).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-mono text-sm">#{tx.id}</TableCell>
                          <TableCell className="text-sm max-w-[220px] truncate">
                            {tx.items}
                          </TableCell>
                          <TableCell>
                            {tx.paymentMethod ? (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                tx.paymentMethod === "cash"
                                  ? "bg-green-100 text-green-700"
                                  : tx.paymentMethod === "qr"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-purple-100 text-purple-700"
                              }`}>
                                {tx.paymentMethod === "qr" ? "QR" : tx.paymentMethod.charAt(0).toUpperCase() + tx.paymentMethod.slice(1)}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            RM {tx.amount.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewReceipt(tx.id)}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>

                            {onVoidOrder && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-red-600">
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{a.voidOrder}</AlertDialogTitle>
                                    <AlertDialogDescription>{a.voidOrderConfirm}</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => onVoidOrder(tx.id)}>
                                      {a.voidOrder}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </TableCell>
                        </TableRow>
                      ),
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Expense History */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <PackageOpen className="h-5 w-5 text-orange-500" />
                {a.expenseHistory}
              </CardTitle>
              <CardDescription>{a.expenseHistoryDesc}</CardDescription>
            </div>

            <YearMonthFilter
              year={expYear}
              month={expMonth}
              years={yearOptions}
              onYearChange={(v) => {
                setExpYear(v);
                setExpShowAll(false);
              }}
              onMonthChange={(v) => {
                setExpMonth(v);
                setExpShowAll(false);
              }}
            />
          </div>
        </CardHeader>

        <CardContent>
          {expenseHistory.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <PackageOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{a.noExpenses}</p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex flex-wrap gap-4 text-sm">
                  <span>
                    <span className="text-muted-foreground">{a.entries} </span>
                    <strong>{expenseHistory.length}</strong>
                  </span>
                  <span>
                    <span className="text-muted-foreground">{a.totalSpent} </span>
                    <strong className="text-orange-600">
                      RM {expenseHistoryTotal.toFixed(2)}
                    </strong>
                  </span>
                </div>

                {expenseHistory.length > SHOW_LIMIT && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpShowAll((v) => !v)}
                  >
                    {expShowAll ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-1" />
                        {a.showLess}
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-1" />
                        {a.showAll} ({expenseHistory.length})
                      </>
                    )}
                  </Button>
                )}
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.common.date}</TableHead>
                      <TableHead>{a.productMaterial}</TableHead>
                      <TableHead>{t.common.quantity}</TableHead>
                      <TableHead className="text-right">{a.costPerUnit}</TableHead>
                      <TableHead className="text-right">{t.expenses.totalCost}</TableHead>
                      <TableHead>{t.common.notes}</TableHead>
                      <TableHead className="text-right">{t.common.actions}</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {(expShowAll ? expenseHistory : expenseHistory.slice(0, SHOW_LIMIT)).map(
                      (exp) => (
                        <TableRow key={exp.id}>
                          <TableCell className="text-sm whitespace-nowrap">
                            {new Date(exp.date).toLocaleDateString()}{" "}
                            <span className="text-muted-foreground text-xs">
                              {new Date(exp.date).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{exp.productName}</span>
                          </TableCell>
                          <TableCell>
                            {exp.quantity}{" "}
                            <span className="text-muted-foreground text-xs">{exp.unit}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            RM {exp.costPerUnit.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant="secondary"
                              className={`font-mono ${
                                exp.totalCost < 0 
                                  ? "bg-green-100 text-green-700 border-green-200" 
                                  : "bg-orange-100 text-orange-700 border-orange-200"
                              }`}
                            >
                              RM {exp.totalCost.toFixed(2)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">
                            {exp.notes || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {onDeleteExpense && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{a.deleteExpense}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      <strong>{exp.productName}</strong> — RM {exp.totalCost.toFixed(2)}?{" "}
                                      {a.deleteExpenseConfirm}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-red-600 hover:bg-red-700"
                                      onClick={() => onDeleteExpense(exp.id)}
                                    >
                                      {t.common.delete}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </TableCell>
                        </TableRow>
                      ),
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Top Selling Products */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>{a.topProducts}</CardTitle>
              <CardDescription>{a.topProductsDesc}</CardDescription>
            </div>

            <YearMonthFilter
              year={topYear}
              month={topMonth}
              years={yearOptions}
              onYearChange={setTopYear}
              onMonthChange={setTopMonth}
            />
          </div>
        </CardHeader>

        <CardContent>
          {topProducts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Award className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{a.noSalesData}</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topProducts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip formatter={(v) => `RM ${Number(v).toFixed(2)}`} />
                  <Bar key="bar-revenue" dataKey="revenue" fill="#0088FE" name={a.revenue} />
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
        </CardContent>
      </Card>

      {/* Analytics receipt popup */}
      <Dialog open={analyticsReceiptOpen} onOpenChange={setAnalyticsReceiptOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="sr-only">Analytics Receipt</DialogTitle>
            <DialogDescription className="sr-only">
              Print analytics summary (80mm)
            </DialogDescription>
          </DialogHeader>

          {/* Printable block */}
          <div id="print-analytics" className="receipt-root print-only space-y-3 font-mono text-sm">
            <ReceiptMerchantHeader
              profile={businessProfile}
              subtitle="ANALYTICS SUMMARY"
            />

            <div className="space-y-1 border-b border-dashed pb-3">
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{new Date().toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Time:</span>
                <span>{new Date().toLocaleTimeString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Period:</span>
                <span className="font-bold">{periodLabel}</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Today Sales</span>
                <span>RM {todaySales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Sales</span>
                <span>RM {totalSales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Expenses</span>
                <span>RM {totalCost.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-base font-bold border-t-2 border-dashed pt-2">
                <span>Net Profit</span>
                <span>RM {profit.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-xs pt-1">
                <span>Profit Margin</span>
                <span>{profitMargin.toFixed(1)}%</span>
              </div>
            </div>

            <div className="receipt-footer text-center text-xs border-t border-dashed pt-3">
              <p>— End —</p>
            </div>
          </div>

          {/* Close above Print (Print will immediately open print dialog) */}
          <DialogFooter className="flex flex-col gap-2 sm:flex-col">
            <Button
              variant="outline"
              onClick={() => setAnalyticsReceiptOpen(false)}
              className="w-full"
            >
              {t.common.close}
            </Button>

            <Button
              onClick={() => {
                printWithTarget("analytics"); // immediately opens print dialog
                setAnalyticsReceiptOpen(false);
              }}
              className="w-full"
            >
              <Printer className="mr-2 h-4 w-4" />
              Print Summary
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order receipt popup */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="sr-only">Order Receipt</DialogTitle>
            <DialogDescription className="sr-only">
              Reprint official receipt
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div
              id="print-receipt-analytics"
              className="receipt-root print-only space-y-4 font-mono text-sm"
            >
              <ReceiptMerchantHeader profile={businessProfile} />

              <div className="space-y-1 border-b border-dashed pb-3">
                <div className="flex justify-between">
                  <span>{t.orders.receiptNo}:</span>
                  <span className="font-bold">#{selectedOrder.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t.common.date}:</span>
                  <span>{new Date(selectedOrder.date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t.orders.time}</span>
                  <span>{new Date(selectedOrder.date).toLocaleTimeString()}</span>
                </div>
              </div>

              <div className="border-b-2 border-dashed pb-3">
                <div className="font-bold mb-2">{t.orders.itemsLabel}</div>
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="mb-3">
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
                  <span>RM {selectedOrder.subtotal.toFixed(2)}</span>
                </div>

                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>
                      {t.orders.discount}{" "}
                      {selectedOrder.discountType === "percentage"
                        ? `(${selectedOrder.discount}%)`
                        : t.orders.discountFixed}
                      :
                    </span>
                    <span>- RM {selectedOrder.discountAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-base font-bold border-t-2 border-dashed pt-2">
                  <span>{t.orders.totalFinal}</span>
                  <span>RM {selectedOrder.total.toFixed(2)}</span>
                </div>
                {selectedOrder.paymentMethod && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{t.orders.payment}</span>
                    <span className="font-medium">{selectedOrder.paymentMethod === "qr" ? t.orders.paymentQr : selectedOrder.paymentMethod === "card" ? t.orders.paymentCard : t.orders.paymentCash}</span>
                  </div>
                )}
                {selectedOrder.cashTendered != null && selectedOrder.cashTendered > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span>{t.orders.cashReceived}</span>
                      <span>RM {selectedOrder.cashTendered.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-blue-600">
                      <span>{t.orders.change}</span>
                      <span>RM {(selectedOrder.cashTendered - selectedOrder.total).toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="receipt-footer text-center text-xs border-t border-dashed pt-3">
                <p>{t.orders.thankYou}</p>
                <p className="mt-1">{t.orders.comeAgain}</p>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col gap-2 sm:flex-col">
            <Button variant="outline" onClick={() => setReceiptOpen(false)} className="w-full">
              {t.common.close}
            </Button>
            <Button
              onClick={() => {
                printWithTarget("receipt"); // immediately opens print dialog
                setReceiptOpen(false);
              }}
              className="w-full"
            >
              <Printer className="mr-2 h-4 w-4" />
              {t.orders.printReceipt}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
