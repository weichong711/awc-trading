import { Package, DollarSign, AlertTriangle, FolderOpen } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Product } from "../types/inventory";

interface DashboardProps {
  products: Product[];
  categories: string[];
}

export function Dashboard({ products, categories }: DashboardProps) {
  const totalProducts = products.length;
  const totalValue = products.reduce((sum, p) => sum + (p.price * p.quantity), 0);
  const lowStockItems = products.filter(p => p.quantity <= p.minStock).length;
  const totalCategories = categories.length;

  // Category distribution for pie chart
  const categoryData = categories.map(cat => ({
    name: cat,
    value: products.filter(p => p.category === cat).length
  }));

  // Top products by value
  const topProducts = [...products]
    .sort((a, b) => (b.price * b.quantity) - (a.price * a.quantity))
    .slice(0, 5)
    .map(p => ({
      name: p.name.length > 20 ? p.name.substring(0, 20) + '...' : p.name,
      value: p.price * p.quantity
    }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{totalProducts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {totalCategories} categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Inventory Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">RM {totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Current stock value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{lowStockItems}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Items need restocking
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Categories</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{totalCategories}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Product categories
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Products by Value</CardTitle>
            <CardDescription>Highest value inventory items</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis />
                <Tooltip formatter={(value) => `RM ${Number(value).toLocaleString()}`} />
                <Bar dataKey="value" fill="#0088FE" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Category Distribution</CardTitle>
            <CardDescription>Products by category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Items */}
      {lowStockItems > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Low Stock Alerts</CardTitle>
            <CardDescription>Items that need to be restocked</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {products
                .filter(p => p.quantity <= p.minStock)
                .map(product => (
                  <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      <div>
                        <p>{product.name}</p>
                        <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">Current: {product.quantity}</p>
                      <p className="text-sm text-muted-foreground">Min: {product.minStock}</p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}