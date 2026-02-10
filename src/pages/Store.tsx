import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ShoppingBag, Plus, Package, Tag } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
  category: string;
  seller_name: string;
}

// Placeholder store page - products and listing will be implemented with payment integration
const Store = () => {
  const { userRole } = useAuth();
  const { toast } = useToast();
  const isSeller = userRole === "seller";

  const handleListProduct = () => {
    toast({
      title: "Coming Soon",
      description: "Product listing requires a seller subscription (R400/6 months). This feature is being built.",
    });
  };

  return (
    <AppLayout showBottomNav={true}>
      <div className="min-h-screen bg-background pb-20 md:pb-8">
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50">
          <div className="px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Store</h1>
            </div>
            {isSeller && (
              <Button variant="gaming" size="sm" onClick={handleListProduct}>
                <Plus className="w-4 h-4 mr-1" />
                List Item
              </Button>
            )}
          </div>
        </header>

        <main className="px-4 py-4">
          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
            {["All", "Controllers", "Headsets", "Keyboards", "Mice", "Monitors", "Chairs", "Accessories"].map((cat) => (
              <button
                key={cat}
                className="px-4 py-2 rounded-full bg-secondary text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors whitespace-nowrap"
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Empty State */}
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Package className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Store Coming Soon</h3>
            <p className="text-muted-foreground text-sm max-w-xs mb-6">
              Gaming gear, streaming equipment, and accessories from sellers in the community.
            </p>
            {!isSeller && (
              <div className="p-4 rounded-xl bg-secondary/50 border border-border/30 max-w-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-foreground text-sm">Want to sell?</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Register as a Seller to list your gaming products. Seller subscription: R400/6 months.
                </p>
              </div>
            )}
            {isSeller && (
              <Button variant="gaming" onClick={handleListProduct}>
                <Plus className="w-4 h-4 mr-1" />
                List Your First Product
              </Button>
            )}
          </div>
        </main>
      </div>
    </AppLayout>
  );
};

export default Store;
