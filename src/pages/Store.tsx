import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Plus, Package, Tag, ExternalLink, Star, Crown, Sparkles, X, Shield, BarChart3, MessageCircle } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  image_url: string;
  external_url: string | null;
  category: string;
  seller_id: string;
  created_at: string;
  seller?: {
    username: string | null;
    avatar_url: string | null;
  };
}

const CATEGORIES = ["All", "Controllers", "Headsets", "Keyboards", "Mice", "Monitors", "Chairs", "Accessories", "Fashion", "Gaming", "Beauty", "Tech"];

const STANDARD_PAYPAL = "https://www.paypal.com/ncp/payment/D9NVXMMRNNUTJ";
const PREMIUM_PAYPAL = "https://www.paypal.com/ncp/payment/83TQ3PBLJFM9W";

const Store = () => {
  const { userRole, user } = useAuth();
  const { toast } = useToast();
  const isSeller = userRole === "seller";
  const [activeCategory, setActiveCategory] = useState("All");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showListModal, setShowListModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [listForm, setListForm] = useState({
    name: "",
    price: "",
    description: "",
    image_url: "",
    external_url: "",
    category: "Gaming",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("store_products" as any)
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (data && (data as any[]).length > 0) {
      const items = data as any[];
      const sellerIds = [...new Set(items.map((p: any) => p.seller_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", sellerIds as string[]);
      
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      
      setProducts(items.map((p: any) => ({
        ...p,
        seller: profileMap.get(p.seller_id) || undefined,
      })));
    } else {
      setProducts([]);
    }
    setLoading(false);
  };

  const handleListProduct = async () => {
    if (!user || !isSeller) return;
    if (!listForm.name.trim() || !listForm.price) {
      toast({ title: "Name and price are required", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.from("store_products" as any).insert({
      seller_id: user.id,
      name: listForm.name.trim(),
      price: parseFloat(listForm.price),
      description: listForm.description.trim(),
      image_url: listForm.image_url.trim() || "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&h=400&fit=crop",
      external_url: listForm.external_url.trim() || null,
      category: listForm.category,
    } as any);

    setIsSubmitting(false);

    if (error) {
      toast({ title: "Failed to list product", variant: "destructive" });
      return;
    }

    toast({ title: "Product listed!" });
    setShowListModal(false);
    setListForm({ name: "", price: "", description: "", image_url: "", external_url: "", category: "Gaming" });
    fetchProducts();
  };

  const filteredProducts = activeCategory === "All" 
    ? products 
    : products.filter(p => p.category === activeCategory);

  const handleProductClick = (product: Product) => {
    if (product.external_url) {
      window.open(product.external_url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <AppLayout showBottomNav={true}>
      <div className="min-h-screen bg-background pb-20 md:pb-8">
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50">
          <div className="px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Market</h1>
            </div>
            <div className="flex items-center gap-2">
              {!isSeller && (
                <Button variant="outline" size="sm" onClick={() => setShowPricingModal(true)}>
                  <Tag className="w-4 h-4 mr-1" />
                  Sell
                </Button>
              )}
              {isSeller && (
                <Button variant="gaming" size="sm" onClick={() => setShowListModal(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  List Item
                </Button>
              )}
            </div>
          </div>
        </header>

        <main className="px-4 py-4">
          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="aspect-square bg-secondary rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Package className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {products.length === 0 ? "Market Opening Soon" : "No products in this category"}
              </h3>
              <p className="text-muted-foreground text-sm max-w-xs mb-6">
                Gaming gear, streaming equipment, and accessories from sellers in the community.
              </p>
              {!isSeller && (
                <div className="p-5 rounded-2xl bg-secondary/50 border border-border/30 max-w-sm text-center">
                  <Tag className="w-5 h-5 text-primary mx-auto mb-2" />
                  <span className="font-semibold text-foreground text-sm block mb-1">Want to sell?</span>
                  <p className="text-xs text-muted-foreground mb-3">
                    Join the StreamRate Marketplace and get 6 months of digital storefront access.
                  </p>
                  <Button variant="gaming" size="sm" onClick={() => setShowPricingModal(true)}>
                    View Seller Packages
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredProducts.map((product) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-card rounded-xl border border-border/50 overflow-hidden cursor-pointer hover:border-primary/30 transition-all"
                  onClick={() => handleProductClick(product)}
                >
                  <div className="aspect-square bg-secondary relative">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                    {product.external_url && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center">
                        <ExternalLink className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-medium text-foreground text-sm truncate">{product.name}</p>
                    <p className="text-primary font-bold text-sm mt-1">R{product.price.toFixed(2)}</p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <img
                        src={product.seller?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=40&h=40&fit=crop&crop=face"}
                        alt=""
                        className="w-4 h-4 rounded-full object-cover"
                      />
                      <span className="text-xs text-muted-foreground truncate">
                        {product.seller?.username || "Seller"}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </main>

        {/* Pricing Modal */}
        <AnimatePresence>
          {showPricingModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setShowPricingModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-card rounded-3xl p-6 border border-border shadow-2xl max-h-[85vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-foreground">Seller Packages</h2>
                  <button onClick={() => setShowPricingModal(false)} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                {/* Standard Plan */}
                <div className="p-5 rounded-2xl bg-secondary/50 border border-border/30 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ShoppingBag className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-foreground">Standard Seller</h3>
                  </div>
                  <p className="text-2xl font-bold text-primary mb-1">$35 USD</p>
                  <p className="text-xs text-muted-foreground mb-4">6 months access</p>
                  <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                    <li className="flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> Custom store profile</li>
                    <li className="flex items-center gap-2"><Package className="w-4 h-4 text-primary" /> Product listings</li>
                    <li className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> 7-day new seller boost</li>
                    <li className="flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /> Basic analytics</li>
                    <li className="flex items-center gap-2"><MessageCircle className="w-4 h-4 text-primary" /> Reviews & ratings</li>
                    <li className="flex items-center gap-2"><Tag className="w-4 h-4 text-primary" /> Official Store badge</li>
                  </ul>
                  <Button
                    variant="gaming"
                    className="w-full"
                    onClick={() => window.open(STANDARD_PAYPAL, "_blank")}
                  >
                    Get Standard – $35
                  </Button>
                </div>

                {/* Premium Plan */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Crown className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-foreground">Premium Seller</h3>
                    <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-bold">Popular</span>
                  </div>
                  <p className="text-2xl font-bold text-primary mb-1">$99 USD</p>
                  <p className="text-xs text-muted-foreground mb-4">6 months premium access</p>
                  <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                    <li className="flex items-center gap-2"><Star className="w-4 h-4 text-primary" /> Everything in Standard</li>
                    <li className="flex items-center gap-2"><Crown className="w-4 h-4 text-primary" /> Priority placement & search ranking</li>
                    <li className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> 14-day premium spotlight</li>
                    <li className="flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /> Advanced analytics</li>
                    <li className="flex items-center gap-2"><Tag className="w-4 h-4 text-primary" /> 2 free promo posts/month</li>
                    <li className="flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> Premium Verified Store badge</li>
                  </ul>
                  <Button
                    variant="gaming"
                    className="w-full"
                    onClick={() => window.open(PREMIUM_PAYPAL, "_blank")}
                  >
                    Get Premium – $99
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center mt-4">
                  After payment, your seller access will be activated within 24 hours.
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* List Product Modal */}
        <AnimatePresence>
          {showListModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setShowListModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-card rounded-3xl p-6 border border-border shadow-2xl max-h-[85vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-foreground">List a Product</h2>
                  <button onClick={() => setShowListModal(false)} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Product Name</label>
                    <Input
                      value={listForm.name}
                      onChange={(e) => setListForm({ ...listForm, name: e.target.value })}
                      placeholder="e.g. Gaming Headset Pro"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Price (ZAR)</label>
                    <Input
                      type="number"
                      value={listForm.price}
                      onChange={(e) => setListForm({ ...listForm, price: e.target.value })}
                      placeholder="e.g. 499.99"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Description</label>
                    <textarea
                      value={listForm.description}
                      onChange={(e) => setListForm({ ...listForm, description: e.target.value })}
                      placeholder="Describe your product..."
                      className="w-full min-h-[80px] rounded-lg border border-border bg-secondary/50 px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Image URL</label>
                    <Input
                      value={listForm.image_url}
                      onChange={(e) => setListForm({ ...listForm, image_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Product Link (where buyers go)</label>
                    <Input
                      value={listForm.external_url}
                      onChange={(e) => setListForm({ ...listForm, external_url: e.target.value })}
                      placeholder="https://your-store.com/product"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Users will be redirected to this link when they click your product.</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Category</label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.filter(c => c !== "All").map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setListForm({ ...listForm, category: cat })}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            listForm.category === cat
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="gaming"
                    className="w-full"
                    onClick={handleListProduct}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Listing..." : "List Product"}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
};

export default Store;
