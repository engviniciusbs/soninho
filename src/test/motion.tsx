/**
 * Deterministic stand-in for `framer-motion`, for snapshot tests:
 * `vi.mock("framer-motion", () => import("@/test/motion"))`.
 *
 * Real motion components animate on rAF, so their inline styles depend on
 * timing. Here every `motion.<tag>` renders the plain element; the animation
 * props are serialized into `data-motion` (and MotionValue-driven style keys
 * into `data-motion-style`) so snapshots still pin which animation each
 * element gets. `AnimatePresence` renders its children (exit is immediate).
 */
import { createElement, forwardRef, type ReactNode, type Ref } from "react";

const ANIMATION_PROPS = [
  "initial",
  "animate",
  "exit",
  "transition",
  "whileInView",
  "whileHover",
  "whileTap",
  "viewport",
  "variants",
  "layout",
] as const;

interface FakeMotionValue<T> {
  get(): T;
  on(): () => void;
  __fakeMotionValue: true;
}

function fakeMotionValue<T>(value: T): FakeMotionValue<T> {
  return { get: () => value, on: () => () => {}, __fakeMotionValue: true };
}

function isMotionValue(v: unknown): v is FakeMotionValue<unknown> {
  return typeof v === "object" && v !== null && "__fakeMotionValue" in v;
}

const cache = new Map<string, unknown>();

function motionComponent(tag: string) {
  if (!cache.has(tag)) {
    const Component = forwardRef(function Motion(
      props: Record<string, unknown>,
      ref: Ref<Element>
    ) {
      const rest: Record<string, unknown> = { ...props, ref };
      const anim: Record<string, unknown> = {};
      for (const key of ANIMATION_PROPS) {
        if (key in rest) {
          anim[key] = rest[key];
          delete rest[key];
        }
      }
      if (Object.keys(anim).length) rest["data-motion"] = JSON.stringify(anim);
      const style = rest.style as Record<string, unknown> | undefined;
      if (style) {
        const animated = Object.keys(style).filter((k) => isMotionValue(style[k]));
        if (animated.length) {
          rest["data-motion-style"] = animated.join(",");
          rest.style = Object.fromEntries(
            Object.entries(style).filter(([k]) => !animated.includes(k))
          );
        }
      }
      return createElement(tag, rest);
    });
    Component.displayName = `motion.${tag}`;
    cache.set(tag, Component);
  }
  return cache.get(tag);
}

export const motion = new Proxy({} as Record<string, unknown>, {
  get: (_, tag: string) => motionComponent(tag),
});

export function AnimatePresence({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}

export const useReducedMotion = () => false;
export const useScroll = () => ({ scrollYProgress: fakeMotionValue(0) });
export const useTransform = (_: unknown, __: unknown, output: unknown[]) =>
  fakeMotionValue(output[0]);
