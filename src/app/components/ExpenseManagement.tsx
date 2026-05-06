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
