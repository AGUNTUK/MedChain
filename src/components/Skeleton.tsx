import React from 'react';

type SkeletonType = 'text' | 'title' | 'thumbnail' | 'button' | 'circular' | 'custom';

interface SkeletonProps {
  type?: SkeletonType;
  width?: string | number;
  height?: string | number;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  type = 'text', 
  width, 
  height, 
  className = '' 
}) => {
  // Base classes for the shimmer animation and default background
  const baseClasses = 'animate-shimmer rounded-md';
  
  // Specific classes based on type
  let typeClasses = '';
  let defaultWidth: string | number = '100%';
  let defaultHeight: string | number = '1rem';

  switch (type) {
    case 'text':
      defaultHeight = '1rem';
      break;
    case 'title':
      defaultHeight = '1.5rem';
      defaultWidth = '60%';
      break;
    case 'thumbnail':
      defaultHeight = '100%';
      defaultWidth = '100%';
      typeClasses = 'rounded-xl';
      break;
    case 'button':
      defaultHeight = '2.5rem';
      defaultWidth = '100px';
      typeClasses = 'rounded-xl';
      break;
    case 'circular':
      defaultHeight = '3rem';
      defaultWidth = '3rem';
      typeClasses = 'rounded-full';
      break;
    case 'custom':
      defaultHeight = height || '100%';
      defaultWidth = width || '100%';
      typeClasses = '';
      break;
  }

  const finalWidth = width ?? defaultWidth;
  const finalHeight = height ?? defaultHeight;

  return (
    <div
      className={`${baseClasses} ${typeClasses} ${className}`}
      style={{
        width: finalWidth,
        height: finalHeight,
      }}
      aria-hidden="true"
    />
  );
};
