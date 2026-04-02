import { useState } from "react";
import { Plus, Pencil, Trash2, FolderOpen } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Product } from "../types/inventory";

interface CategoriesListProps {
  categories: string[];
  products: Product[];
  onAddCategory: (name: string) => void;
  onDeleteCategory: (name: string) => void;
}

export function CategoriesList({ 
  categories, 
  products, 
  onAddCategory, 
  onDeleteCategory 
}: CategoriesListProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  const getCategoryProductCount = (category: string) => {
    return products.filter(p => p.category === category).length;
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      onAddCategory(newCategoryName.trim());
      setNewCategoryName("");
      setDialogOpen(false);
    }
  };

  const handleDeleteClick = (category: string) => {
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (categoryToDelete) {
      onDeleteCategory(categoryToDelete);
      setCategoryToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Categories</CardTitle>
              <CardDescription>Organize your products into categories</CardDescription>
            </div>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg">No categories yet</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Create your first category to organize products
              </p>
              <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => {
                const productCount = getCategoryProductCount(category);
                return (
                  <Card key={category}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-5 w-5 text-primary" />
                          <CardTitle className="text-base">{category}</CardTitle>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(category)}
                          disabled={productCount > 0}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground">
                        {productCount} {productCount === 1 ? 'product' : 'products'}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
            <DialogDescription>
              Create a new category to organize your products
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="categoryName">Category Name</Label>
              <Input
                id="categoryName"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g., Electronics, Clothing"
                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCategory} disabled={!newCategoryName.trim()}>
              Add Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this category? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
