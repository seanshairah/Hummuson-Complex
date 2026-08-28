import { Fraunces, Inter, Space_Grotesk } from "next/font/google";

/** Body / UI — quiet, highly legible. */
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/** Display — confident geometric grotesk for headlines and data. */
export const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

/** Editorial accent — warm optical serif, used sparingly in italics. */
export const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  style: ["normal", "italic"],
  axes: ["opsz"],
});

export const fontVariables = `${inter.variable} ${spaceGrotesk.variable} ${fraunces.variable}`;
