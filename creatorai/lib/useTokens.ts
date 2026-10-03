"use client";
import { useEffect, useState } from "react";

export interface TokenColors { glowHsl: string; surfaceHex: string; light: boolean }

const read = (name: string): [number, number, number] => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim().split(/\s+/).map(Number);
  return [v[0] || 0, v[1] || 0, v[2] || 0];
};
const toHsl = ([r, g, b]: [number, number, number]) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  const d = max - min;
  let h = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return `${Math.round(h)} ${Math.round(s * 100)} ${Math.round(l * 100)}`;
};
const toHex = (c: [number, number, number]) => `#${c.map((x) => x.toString(16).padStart(2, "0")).join("")}`;

/** Resolves design tokens into the formats third-party components expect (HSL triple, hex) and follows theme changes. */
export function useTokenColors(): TokenColors {
  const [t, setT] = useState<TokenColors>({ glowHsl: "260 60 55", surfaceHex: "#ffffff", light: true });
  useEffect(() => {
    const update = () => {
      const surface = read("surface");
      setT({ glowHsl: toHsl(read("brand")), surfaceHex: toHex(surface), light: surface[0] * 0.2126 + surface[1] * 0.7152 + surface[2] * 0.0722 > 140 });
    };
    update();
    const o = new MutationObserver(update);
    o.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => o.disconnect();
  }, []);
  return t;
}
