import React from 'react';
import { Skeleton } from './Skeleton';

interface ProductCardSkeletonProps {
  layout?: 'grid' | 'horizontal' | 'frequent';
  className?: string;
}

export const ProductCardSkeleton: React.FC<ProductCardSkeletonProps> = ({ 
  layout = 'grid', 
  className = '' 
}) => {
  
  if (layout === 'horizontal') {
    return (
      <div className={`bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm flex flex-col gap-2.5 ${className}`}>
        {/* Top Header Row */}
        <div className="flex gap-3 items-start">
          {/* Image Container Skeleton */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 relative rounded-xl overflow-hidden">
             <Skeleton type="thumbnail" />
          </div>

          {/* Product Details Skeleton */}
          <div className="flex-1 min-w-0 space-y-2 py-1">
            <Skeleton type="title" width="80%" height="1.25rem" />
            <Skeleton type="text" width="50%" height="0.75rem" />
            <Skeleton type="text" width="60%" height="0.75rem" />
            <div className="flex gap-2 pt-1">
              <Skeleton type="text" width="40px" height="0.875rem" />
              <Skeleton type="text" width="60px" height="0.875rem" />
            </div>
          </div>

          {/* Price Skeleton */}
          <div className="shrink-0 text-right flex flex-col items-end gap-1.5 min-w-[85px] sm:min-w-[100px] py-1">
            <Skeleton type="text" width="40px" height="0.875rem" />
            <Skeleton type="text" width="60px" height="1.25rem" />
            <Skeleton type="text" width="50px" height="0.75rem" />
          </div>
        </div>

        {/* Bottom Controls Row Skeleton */}
        <div className="pt-2 border-t border-slate-50 flex items-center justify-between gap-2 mt-1">
          <Skeleton type="text" width="80px" height="0.875rem" />
          <Skeleton type="button" width="70px" height="1.75rem" className="rounded-xl" />
        </div>
      </div>
    );
  }

  if (layout === 'frequent') {
    return (
      <div className={`bg-white border border-slate-100 rounded-2xl p-3 shadow-sm flex flex-col justify-between relative min-w-[140px] flex-shrink-0 ${className}`}>
        <div>
          <div className="w-full h-14 rounded-xl overflow-hidden mb-2">
            <Skeleton type="thumbnail" />
          </div>
          <div className="flex justify-between items-start mb-1.5 gap-2">
            <Skeleton type="text" width="40px" height="14px" className="rounded" />
            <Skeleton type="text" width="30px" height="14px" />
          </div>
          <Skeleton type="text" width="90%" height="14px" className="mb-1" />
          <Skeleton type="text" width="60%" height="10px" className="mt-0.5" />
        </div>
        <div className="mt-3 flex justify-between items-center">
          <div className="flex flex-col gap-1 w-full mr-2">
            <Skeleton type="text" width="40px" height="14px" />
            <Skeleton type="text" width="50px" height="10px" />
          </div>
          <Skeleton type="button" width="28px" height="28px" className="rounded-lg shrink-0" />
        </div>
      </div>
    );
  }

  // Grid layout (Default)
  return (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-3xs flex flex-col justify-between overflow-hidden relative ${className}`}>
      <div>
        {/* Top Image Container Skeleton */}
        <div className="w-full h-32 sm:h-36 relative">
          <Skeleton type="thumbnail" className="rounded-none" />
        </div>

        {/* Content Skeleton */}
        <div className="p-3 pb-0 space-y-2">
          <div className="flex justify-between items-start gap-2">
            <Skeleton type="text" width="40px" height="16px" className="rounded" />
            <Skeleton type="text" width="35px" height="12px" />
          </div>
          
          <Skeleton type="text" width="85%" height="16px" />
          <Skeleton type="text" width="65%" height="12px" />
          
          <div className="flex items-center gap-1.5 pt-1">
            <Skeleton type="circular" width="12px" height="12px" />
            <Skeleton type="text" width="50%" height="12px" />
          </div>
        </div>
      </div>

      {/* Bottom Skeleton */}
      <div className="p-3 pt-3 flex flex-col gap-2 mt-auto">
        <div className="flex justify-between items-end gap-2">
          <div className="space-y-1 w-1/2">
            <Skeleton type="text" width="60px" height="18px" />
            <Skeleton type="text" width="80px" height="10px" />
          </div>
        </div>
        <Skeleton type="button" width="100%" height="2rem" className="rounded-xl mt-1" />
      </div>
    </div>
  );
};

export default ProductCardSkeleton;
