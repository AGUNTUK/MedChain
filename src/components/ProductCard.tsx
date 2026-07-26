import React, { useState } from "react";
import { Plus, Minus, ShoppingCart, Check, Tag, Package, Building2, Pill, AlertTriangle } from "lucide-react";
import { Product } from "../types";
import { formatProductPriceLabel } from "../lib/utils";
import { useFlyToCart } from "../context/FlyToCartContext";

interface ProductCardProps {
  product: Product;
  cartQuantity?: number;
  onAddToCart?: (productId: string, quantity: number) => void;
  onUpdateCartQty?: (productId: string, currentQty: number, delta: number) => void;
  onOpenDetails?: (product: Product) => void;
  className?: string;
  layout?: "grid" | "horizontal";
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  cartQuantity = 0,
  onAddToCart,
  onUpdateCartQty,
  onOpenDetails,
  className = "",
  layout = "grid",
}) => {
  const { triggerFlyToCart } = useFlyToCart();
  const [orderQty, setOrderQty] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const imageUrl = product.imageUrl || product.image_url;
  const isOutOfStock = (product.availableStock ?? 100) <= 0;
  const isLowStock = (product.availableStock ?? 100) > 0 && (product.availableStock ?? 100) <= 20;

  // Calculate discount percentage
  const calculatedDiscount =
    product.mrp && product.sellingPrice && product.mrp > product.sellingPrice
      ? Math.round(((product.mrp - product.sellingPrice) / product.mrp) * 100)
      : product.discountPercentage || 0;

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (isOutOfStock) return;

    // Trigger fly to cart parabolic animation
    if (e.currentTarget) {
      triggerFlyToCart(e.currentTarget, imageUrl);
    }

    if (onAddToCart) {
      onAddToCart(product.id, orderQty);
    } else if (onUpdateCartQty) {
      onUpdateCartQty(product.id, cartQuantity, orderQty);
    }

    // Visual Feedback
    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
    }, 1500);
  };

  const handleIncrementOrderQty = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOrderQty((prev) => prev + 1);
  };

  const handleDecrementOrderQty = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOrderQty((prev) => (prev > 1 ? prev - 1 : 1));
  };

  const handleCardClick = () => {
    if (onOpenDetails) {
      onOpenDetails(product);
    }
  };

  if (layout === "horizontal") {
    return (
      <div
        onClick={handleCardClick}
        className={`bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm hover:border-emerald-200 transition-all cursor-pointer relative flex gap-3.5 ${className}`}
      >
        {/* Aspect Ratio Image Container */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 flex-shrink-0 flex items-center justify-center p-1.5 relative">
          {imageUrl && !imageError ? (
            <img
              src={imageUrl}
              alt={product.name}
              onError={() => setImageError(true)}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-300">
              <Pill className="w-7 h-7 text-emerald-600/40" />
            </div>
          )}

          {/* Category Badge */}
          <span className="absolute bottom-1 left-1 bg-slate-900/80 backdrop-blur-xs text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
            {product.category}
          </span>
        </div>

        {/* Content Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-1">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 truncate leading-snug">
                {product.name} <span className="text-[11px] font-bold text-slate-500">{product.strength}</span>
              </h3>
              {calculatedDiscount > 0 && (
                <span className="bg-emerald-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase shrink-0">
                  {calculatedDiscount}% OFF
                </span>
              )}
            </div>

            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate mt-0.5">
              {product.genericName}
            </p>
            <p className="text-[10px] text-slate-500 font-semibold truncate flex items-center gap-1 mt-0.5">
              <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
              <span>{product.company}</span>
            </p>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2">
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-black text-emerald-700">৳{product.sellingPrice}</span>
                {product.mrp > product.sellingPrice && (
                  <span className="text-[10px] text-slate-400 line-through">৳{product.mrp}</span>
                )}
              </div>
              <span className="text-[8px] text-slate-500 font-mono block">
                {formatProductPriceLabel(product.sellingPrice, product.packSize)}
              </span>
            </div>

            {/* Ordering System Controls */}
            {cartQuantity > 0 ? (
              <div
                className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/80 rounded-xl px-2 py-1"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateCartQty?.(product.id, cartQuantity, -1);
                  }}
                  className="w-5 h-5 bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-xs font-black text-emerald-700 font-mono px-1">{cartQuantity}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateCartQty?.(product.id, cartQuantity, 1);
                  }}
                  className="w-5 h-5 bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  isAdded
                    ? "bg-emerald-700 text-white"
                    : isOutOfStock
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                }`}
              >
                {isAdded ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Added</span>
                  </>
                ) : isOutOfStock ? (
                  <span>Out of Stock</span>
                ) : (
                  <>
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleCardClick}
      className={`bg-white rounded-2xl border border-slate-100 shadow-3xs hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer flex flex-col justify-between overflow-hidden relative group ${className}`}
    >
      <div>
        {/* Top Aspect Ratio Image Container */}
        <div className="w-full h-32 sm:h-36 bg-slate-50 border-b border-slate-100 flex items-center justify-center p-3 relative overflow-hidden">
          {/* Category & Discount Badges */}
          <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 items-start">
            <span className="bg-slate-900/80 backdrop-blur-xs text-white text-[8px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider">
              {product.category}
            </span>
            {calculatedDiscount > 0 && (
              <span className="bg-emerald-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase shadow-xs flex items-center gap-0.5">
                <Tag className="w-2.5 h-2.5" /> {calculatedDiscount}% OFF
              </span>
            )}
          </div>

          {/* Stock Status Badge */}
          <div className="absolute top-2 right-2 z-10">
            {isOutOfStock ? (
              <span className="bg-rose-100 text-rose-700 border border-rose-200 text-[8px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                <AlertTriangle className="w-2.5 h-2.5" /> Out of Stock
              </span>
            ) : isLowStock ? (
              <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[8px] font-bold px-1.5 py-0.5 rounded-md">
                Low Stock ({product.availableStock})
              </span>
            ) : (
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[8px] font-bold px-1.5 py-0.5 rounded-md">
                In Stock
              </span>
            )}
          </div>

          {imageUrl && !imageError ? (
            <img
              src={imageUrl}
              alt={product.name}
              onError={() => setImageError(true)}
              className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-300">
              <Pill className="w-10 h-10 text-emerald-600/30 mb-1" />
              <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">
                {product.packSize || "Medicine"}
              </span>
            </div>
          )}
        </div>

        {/* Card Body Information */}
        <div className="p-3.5 space-y-2">
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 line-clamp-1 leading-snug">
              {product.name} <span className="text-[11px] font-bold text-slate-500">{product.strength}</span>
            </h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider line-clamp-1 mt-0.5">
              {product.genericName}
            </p>
            <p className="text-[10px] text-slate-500 font-semibold truncate flex items-center gap-1 mt-1">
              <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate">{product.company}</span>
            </p>
          </div>

          {/* Pricing Row */}
          <div className="pt-1.5 border-t border-slate-100 flex items-baseline justify-between gap-1">
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm sm:text-base font-black text-emerald-700">৳{product.sellingPrice}</span>
                {product.mrp > product.sellingPrice && (
                  <span className="text-[10px] text-slate-400 line-through font-medium">৳{product.mrp}</span>
                )}
              </div>
              <span className="text-[8px] text-slate-400 font-mono block">
                {formatProductPriceLabel(product.sellingPrice, product.packSize)}
              </span>
            </div>
            {product.packSize && (
              <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-mono shrink-0">
                {product.packSize}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card Action Controls */}
      <div className="p-3.5 pt-0 mt-auto">
        {cartQuantity > 0 ? (
          <div
            className="flex items-center justify-between bg-emerald-50 border border-emerald-200/80 rounded-xl p-1 w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateCartQty?.(product.id, cartQuantity, -1);
              }}
              className="w-7 h-7 bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors flex items-center justify-center cursor-pointer shadow-2xs"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-black text-emerald-800 font-mono">
              {cartQuantity} Box in Cart
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateCartQty?.(product.id, cartQuantity, 1);
              }}
              className="w-7 h-7 bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors flex items-center justify-center cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {/* Quantity Selector Counter */}
            <div className="flex items-center border border-slate-200 bg-slate-50 rounded-xl overflow-hidden shrink-0">
              <button
                type="button"
                onClick={handleDecrementOrderQty}
                className="w-6 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-6 text-center text-xs font-bold text-slate-800 font-mono">{orderQty}</span>
              <button
                type="button"
                onClick={handleIncrementOrderQty}
                className="w-6 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {/* Add to Cart Button */}
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                isAdded
                  ? "bg-emerald-700 text-white"
                  : isOutOfStock
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-md"
              }`}
            >
              {isAdded ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Added!</span>
                </>
              ) : isOutOfStock ? (
                <span>Out of Stock</span>
              ) : (
                <>
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Add to Order</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
