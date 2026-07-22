import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useFlyToCart, FlyingItem } from "../context/FlyToCartContext";
import { Package } from "lucide-react";

function SingleFlyingClone({ item }: { item: FlyingItem; key?: React.Key }) {
  const { removeFlyingItem, triggerLandingFeedback } = useFlyToCart();

  // Construct parabolic Bezier curve keyframes
  const steps = 22;
  const xKeyframes: number[] = [];
  const yKeyframes: number[] = [];
  const scaleKeyframes: number[] = [];
  const opacityKeyframes: number[] = [];
  const rotateKeyframes: number[] = [];

  const x0 = item.startX;
  const y0 = item.startY;
  const x2 = item.targetX;
  const y2 = item.targetY;

  // Control point for arc: lift upwards in Y
  const x1 = (x0 + x2) / 2;
  const y1 = Math.min(y0, y2) - 110;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * x1 + t * t * x2;
    const y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * y1 + t * t * y2;
    const scale = 1.0 - t * 0.65; // Scale down from 1 to 0.35
    const rotate = (t - 0.5) * 30; // Subtle flight tilt
    const opacity = t > 0.88 ? (1 - t) / 0.12 : 1;

    xKeyframes.push(x);
    yKeyframes.push(y);
    scaleKeyframes.push(scale);
    rotateKeyframes.push(rotate);
    opacityKeyframes.push(opacity);
  }

  return (
    <motion.div
      key={item.id}
      initial={{
        x: x0 - 24,
        y: y0 - 24,
        scale: 1,
        opacity: 1,
        rotate: 0
      }}
      animate={{
        x: xKeyframes.map((val) => val - 24),
        y: yKeyframes.map((val) => val - 24),
        scale: scaleKeyframes,
        rotate: rotateKeyframes,
        opacity: opacityKeyframes
      }}
      transition={{
        duration: 0.58,
        ease: [0.22, 1, 0.36, 1] // Custom snappy spring-like cubic bezier
      }}
      onAnimationComplete={() => {
        triggerLandingFeedback();
        removeFlyingItem(item.id);
      }}
      className="fixed top-0 left-0 z-50 pointer-events-none w-12 h-12 rounded-2xl bg-white border-2 border-brand-purple shadow-2xl flex items-center justify-center overflow-hidden"
      style={{
        boxShadow: "0 10px 25px -5px rgba(111, 44, 246, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3)"
      }}
    >
      {item.imageSrc ? (
        <img
          src={item.imageSrc}
          alt="Product thumbnail"
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="w-full h-full bg-brand-purple/10 flex items-center justify-center">
          <Package className="w-6 h-6 text-brand-purple" />
        </div>
      )}
    </motion.div>
  );
}

export default function FlyToCartOverlay() {
  const { flyingItems } = useFlyToCart();

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {flyingItems.map((item) => (
          <SingleFlyingClone key={item.id} item={item} />
        ))}
      </AnimatePresence>
    </div>
  );
}
