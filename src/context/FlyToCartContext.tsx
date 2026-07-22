import React, { createContext, useContext, useState, useRef, useCallback, ReactNode } from "react";

export interface FlyingItem {
  id: string;
  imageSrc?: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
}

interface FlyToCartContextType {
  registerCartTarget: (node: HTMLElement | null) => void;
  triggerFlyToCart: (
    source: HTMLElement | DOMRect | { x: number; y: number } | null,
    imageSrc?: string
  ) => void;
  flyingItems: FlyingItem[];
  removeFlyingItem: (id: string) => void;
  isCartBarPulsing: boolean;
  isBadgeSpringing: boolean;
  isCartDrawerOpen: boolean;
  setIsCartDrawerOpen: (open: boolean) => void;
  triggerLandingFeedback: () => void;
}

const FlyToCartContext = createContext<FlyToCartContextType | undefined>(undefined);

export function FlyToCartProvider({ children }: { children: ReactNode }) {
  const [flyingItems, setFlyingItems] = useState<FlyingItem[]>([]);
  const [isCartBarPulsing, setIsCartBarPulsing] = useState(false);
  const [isBadgeSpringing, setIsBadgeSpringing] = useState(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

  const cartTargetRef = useRef<HTMLElement | null>(null);

  const registerCartTarget = useCallback((node: HTMLElement | null) => {
    cartTargetRef.current = node;
  }, []);

  const triggerLandingFeedback = useCallback(() => {
    setIsCartBarPulsing(true);
    setIsBadgeSpringing(true);
    setTimeout(() => {
      setIsCartBarPulsing(false);
    }, 400);
    setTimeout(() => {
      setIsBadgeSpringing(false);
    }, 500);
  }, []);

  const removeFlyingItem = useCallback((id: string) => {
    setFlyingItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const triggerFlyToCart = useCallback(
    (
      source: HTMLElement | DOMRect | { x: number; y: number } | null,
      imageSrc?: string
    ) => {
      let startX = window.innerWidth / 2;
      let startY = window.innerHeight / 2;

      if (source) {
        if ("getBoundingClientRect" in source && typeof source.getBoundingClientRect === "function") {
          const rect = source.getBoundingClientRect();
          startX = rect.left + rect.width / 2;
          startY = rect.top + rect.height / 2;
        } else if ("x" in source && "y" in source) {
          startX = source.x;
          startY = source.y;
        }
      }

      let targetX = window.innerWidth / 2;
      let targetY = window.innerHeight - 80;

      if (cartTargetRef.current) {
        const rect = cartTargetRef.current.getBoundingClientRect();
        targetX = rect.left + rect.width / 2;
        targetY = rect.top + rect.height / 2;
      }

      const newItem: FlyingItem = {
        id: `fly-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        imageSrc,
        startX,
        startY,
        targetX,
        targetY
      };

      setFlyingItems((prev) => [...prev, newItem]);
    },
    []
  );

  return (
    <FlyToCartContext.Provider
      value={{
        registerCartTarget,
        triggerFlyToCart,
        flyingItems,
        removeFlyingItem,
        isCartBarPulsing,
        isBadgeSpringing,
        isCartDrawerOpen,
        setIsCartDrawerOpen,
        triggerLandingFeedback
      }}
    >
      {children}
    </FlyToCartContext.Provider>
  );
}

export function useFlyToCart() {
  const context = useContext(FlyToCartContext);
  if (!context) {
    throw new Error("useFlyToCart must be used within a FlyToCartProvider");
  }
  return context;
}
