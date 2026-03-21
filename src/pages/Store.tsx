import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag, Plus, Package, Tag, ExternalLink, Star, Crown, Sparkles,
  X, Shield, BarChart3, MessageCircle, Trash2, ChevronLeft, ChevronRight,
  Image as ImageIcon, Link as LinkIcon,
} from "lucide-react";
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
  images: string[];
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

// --- Image Carousel Component ---
const ImageCarousel = ({ images, name }: { images: string[]; name: string }) => {
  const [current, setCurrent] = useState(0);
  const allImages = images.length > 0 ? images : ["https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&h=400&fit=crop"];

  return (
    <div className="relative w-full aspect-square bg-secondary overflow-hidden group">
      <img
        src={allImages[current]}
        alt={`${name} - ${current + 1}`}
        className="w-full h-full object-cover transition-transform"
      />
      {allImages.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setCurrent((p) => (p - 1 + allImages.length) % allImages.length); }}
            className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="w-3 h-3 text-white" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setCurrent((p) => (p + 1) % allImages.length); }}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="w-3 h-3 text-white" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {allImages.map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === current ? "bg-primary" : "bg-white/50"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// --- Product Detail Modal ---
const ProductDetailModal = ({
  product,
  onClose,
  isSeller,
  userId,
  onDelete,
}: {
  product: Product;
  onClose: () => void;
  isSeller: boolean;
  userId: string | undefined;
  onDelete: (id: string) => void;
}) => {
  const allImages = product.images?.length > 0 ? product.images : [product.image_url];
  const [current, setCurrent] = useState(0);
  const isOwner = isSeller && userId === product.seller_id;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-card rounded-3xl border border-border shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Image slider */}
        <div className="relative aspect-square bg-secondary">
          <img src={allImages[current]} alt={product.name} className="w-full h-full object-cover rounded-t-3xl" />
          {allImages.length > 1 && (
            <>
              <button onClick={() => setCurrent((p) => (p - 1 + allImages.length) % allImages.length)} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
                <ChevronLeft className="w-4 h-4 text-white" />
              </button>
              <button onClick={() => setCurrent((p) => (p + 1) % allImages.length)} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
                <ChevronRight className="w-4 h-4 text-white" />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {allImages.map((_, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full ${i === current ? "bg-primary" : "bg-white/50"}`} />
                ))}
              </div>
            </>
          )}
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="p-5">
          <h2 className="text-xl font-bold text-foreground">{product.name}</h2>
          <p className="text-2xl font-bold text-primary mt-1">R{product.price.toFixed(2)}</p>

          <div className="flex items-center gap-2 mt-3">
            <img
              src={product.seller?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=40&h=40&fit=crop&crop=face"}
              alt="" className="w-6 h-6 rounded-full object-cover"
            />
            <span className="text-sm text-muted-foreground">
              Sold by <span className="text-foreground font-medium">{product.seller?.username || "Seller"}</span>
            </span>
          </div>

          {product.description && (
            <p className="text-sm text-muted-foreground mt-4 leading-relaxed">{product.description}</p>
          )}

          <div className="flex gap-2 mt-5">
            {product.external_url && (
              <Button
                variant="gaming"
                className="flex-1"
                onClick={() => window.open(product.external_url!, "_blank", "noopener,noreferrer")}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Buy Now
              </Button>
            )}
            {isOwner && (
              <Button
                variant="destructive"
                size="icon"
                onClick={() => { onDelete(product.id); onClose(); }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// --- Pricing Modal ---
const PricingModal = ({ onClose }: { onClose: () => void }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    onClick={onClose}
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
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
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
        <Button variant="gaming" className="w-full" onClick={() => window.open(STANDARD_PAYPAL, "_blank")}>
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
        <Button variant="gaming" className="w-full" onClick={() => window.open(PREMIUM_PAYPAL, "_blank")}>
          Get Premium – $99
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center mt-4">
        After payment, your seller access will be activated within 24 hours.
      </p>
    </motion.div>
  </motion.div>
);

// --- List Product Modal (sellers only) ---
const ListProductModal = ({
  onClose,
  onSubmit,
  isSubmitting,
}: {
  onClose: () => void;
  onSubmit: (form: { name: string; price: string; description: string; images: string[]; external_url: string; category: string }) => void;
  isSubmitting: boolean;
}) => {
  const [form, setForm] = useState({
    name: "",
    price: "",
    description: "",
    images: ["", "", "", ""],
    external_url: "",
    category: "Gaming",
  });

  const filledImages = form.images.filter((u) => u.trim() !== "");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
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
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Product Name</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Gaming Headset Pro" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Price (ZAR)</label>
            <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="e.g. 499.99" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe your product..."
              className="w-full min-h-[80px] rounded-lg border border-border bg-secondary/50 px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
            />
          </div>

          {/* Image URLs (up to 4) */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-1">
              <ImageIcon className="w-4 h-4" /> Product Images (up to 4)
            </label>
            <div className="space-y-2">
              {form.images.map((url, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={url}
                    onChange={(e) => {
                      const newImages = [...form.images];
                      newImages[i] = e.target.value;
                      setForm({ ...form, images: newImages });
                    }}
                    placeholder={`Image URL ${i + 1}${i === 0 ? " (required)" : " (optional)"}`}
                    className="text-sm"
                  />
                  {url.trim() && (
                    <img src={url} alt="" className="w-10 h-10 rounded-lg object-cover border border-border flex-shrink-0" onError={(e) => (e.currentTarget.style.display = "none")} />
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Paste image URLs. Users will swipe through them.</p>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1 block flex items-center gap-1">
              <LinkIcon className="w-4 h-4" /> Product Link (where buyers go)
            </label>
            <Input
              value={form.external_url}
              onChange={(e) => setForm({ ...form, external_url: e.target.value })}
              placeholder="https://your-store.com/product"
            />
            <p className="text-xs text-muted-foreground mt-1">Users will be redirected to this link when they click "Buy Now".</p>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.filter((c) => c !== "All").map((cat) => (
                <button
                  key={cat}
                  onClick={() => setForm({ ...form, category: cat })}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    form.category === cat ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
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
            onClick={() => onSubmit({ ...form, images: filledImages.length > 0 ? filledImages : form.images })}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Listing..." : "List Product"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// --- Main Store Component ---
const Store = () => {
  const { userRole, user, profile } = useAuth();
  const { toast } = useToast();
  const isSeller = userRole === "seller";
  const [activeCategory, setActiveCategory] = useState("All");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showListModal, setShowListModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const sellerPaid = true; // Market is free for now
  const [searchQuery, setSearchQuery] = useState("");

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

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

      setProducts(
        items.map((p: any) => ({
          ...p,
          images: p.images || [],
          seller: profileMap.get(p.seller_id) || undefined,
        }))
      );
    } else {
      setProducts([]);
    }
    setLoading(false);
  };

  const handleListProduct = async (form: {
    name: string;
    price: string;
    description: string;
    images: string[];
    external_url: string;
    category: string;
  }) => {
    if (!user || !isSeller) return;
    if (!form.name.trim() || !form.price) {
      toast({ title: "Name and price are required", variant: "destructive" });
      return;
    }

    const validImages = form.images.filter((u) => u.trim() !== "");
    if (validImages.length === 0) {
      toast({ title: "At least one product image is required", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.from("store_products" as any).insert({
      seller_id: user.id,
      name: form.name.trim(),
      price: parseFloat(form.price),
      description: form.description.trim(),
      image_url: validImages[0],
      images: validImages,
      external_url: form.external_url.trim() || null,
      category: form.category,
    } as any);

    setIsSubmitting(false);

    if (error) {
      toast({ title: "Failed to list product", variant: "destructive" });
      return;
    }

    toast({ title: "Product listed!" });
    setShowListModal(false);
    fetchProducts();
  };

  const handleDeleteProduct = async (productId: string) => {
    const { error } = await supabase
      .from("store_products" as any)
      .delete()
      .eq("id", productId)
      .eq("seller_id", user?.id);

    if (error) {
      toast({ title: "Failed to delete product", variant: "destructive" });
      return;
    }

    toast({ title: "Product deleted" });
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const filteredProducts = (() => {
    let filtered = activeCategory === "All" ? products : products.filter((p) => p.category === activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }
    return filtered;
  })();

  // Seller's own products
  const myProducts = isSeller ? products.filter((p) => p.seller_id === user?.id) : [];

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
              {/* Only sellers see the seller actions */}
              {isSeller && sellerPaid && (
                <Button variant="gaming" size="sm" onClick={() => setShowListModal(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add New
                </Button>
              )}
              {isSeller && !sellerPaid && !checkingSubscription && (
                <Button variant="outline" size="sm" onClick={() => setShowPricingModal(true)}>
                  <Tag className="w-4 h-4 mr-1" />
                  Activate Selling
                </Button>
              )}
              {/* Fans & streamers see nothing here — they just browse */}
            </div>
          </div>
        </header>

        <main className="px-4 py-4">
          {/* Search Bar */}
          <div className="mb-4">
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Seller's own listings section */}
          {isSeller && myProducts.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Your Listings ({myProducts.length})
              </h2>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {myProducts.map((product) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-card rounded-xl border border-primary/20 overflow-hidden cursor-pointer hover:border-primary/40 transition-all relative"
                    onClick={() => setSelectedProduct(product)}
                  >
                    <ImageCarousel images={product.images?.length > 0 ? product.images : [product.image_url]} name={product.name} />
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product.id); }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-destructive/80 flex items-center justify-center z-10 hover:bg-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-white" />
                    </button>
                    <div className="p-3">
                      <p className="font-medium text-foreground text-sm truncate">{product.name}</p>
                      <p className="text-primary font-bold text-sm mt-1">R{product.price.toFixed(2)}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="h-px bg-border/50 mb-4" />
            </div>
          )}

          {/* Unpaid seller CTA */}
          {isSeller && !sellerPaid && !checkingSubscription && (
            <div className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 text-center">
              <Crown className="w-8 h-8 text-primary mx-auto mb-2" />
              <h3 className="font-bold text-foreground mb-1">Activate Your Seller Account</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Purchase a seller package to start listing products on the StreamRate Market.
              </p>
              <Button variant="gaming" onClick={() => setShowPricingModal(true)}>
                View Seller Packages
              </Button>
            </div>
          )}

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
              <p className="text-muted-foreground text-sm max-w-xs">
                Gaming gear, streaming equipment, and accessories from sellers in the community.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredProducts.map((product) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-card rounded-xl border border-border/50 overflow-hidden cursor-pointer hover:border-primary/30 transition-all"
                  onClick={() => setSelectedProduct(product)}
                >
                  <ImageCarousel images={product.images?.length > 0 ? product.images : [product.image_url]} name={product.name} />
                  <div className="p-3">
                    <p className="font-medium text-foreground text-sm truncate">{product.name}</p>
                    <p className="text-primary font-bold text-sm mt-1">R{product.price.toFixed(2)}</p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <img
                        src={product.seller?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=40&h=40&fit=crop&crop=face"}
                        alt="" className="w-4 h-4 rounded-full object-cover"
                      />
                      <span className="text-xs text-muted-foreground truncate">
                        {product.seller?.username || "Seller"}
                      </span>
                    </div>
                    {product.external_url && (
                      <div className="mt-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); window.open(product.external_url!, "_blank", "noopener,noreferrer"); }}
                          className="w-full py-1.5 px-3 rounded-lg bg-primary/10 text-primary text-xs font-medium flex items-center justify-center gap-1 hover:bg-primary/20 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Buy Now
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </main>

        {/* Modals */}
        <AnimatePresence>
          {showPricingModal && <PricingModal onClose={() => setShowPricingModal(false)} />}
        </AnimatePresence>

        <AnimatePresence>
          {showListModal && (
            <ListProductModal
              onClose={() => setShowListModal(false)}
              onSubmit={handleListProduct}
              isSubmitting={isSubmitting}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedProduct && (
            <ProductDetailModal
              product={selectedProduct}
              onClose={() => setSelectedProduct(null)}
              isSeller={isSeller}
              userId={user?.id}
              onDelete={handleDeleteProduct}
            />
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
};

export default Store;
