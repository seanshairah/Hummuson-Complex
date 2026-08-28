"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowRight, ChevronDown, Leaf, MessageCircle, ScanSearch } from "lucide-react";
import { useRef } from "react";
import type { ProductCardData } from "@/server/data/products";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MediaImage } from "@/components/shared/media-image";
import { Counter } from "@/components/motion/counter";
import { whatsappLink, whatsappAdviceMessage } from "@/lib/whatsapp";
import heroField from "../../../public/images/field/hero-seedlings-drip-IMG_0553.jpg";

const EASE = [0.16, 1, 0.3, 1] as const;

export function HomeHero({
  spotlight,
  productCount,
  cropCount,
  partnerCount,
}: {
  spotlight: ProductCardData | null;
  productCount: number;
  cropCount: number;
  /** Verified supplier brands (labels: Bioenergy LT, Sapropel Organics, IKAR, Arvensis Agro, eMAXX). */
  partnerCount: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const cardsY = useTransform(scrollYProgress, [0, 1], ["0%", "-12%"]);

  const lines = [
    { text: "Healthy soil.", className: "text-paper" },
    { text: "Stronger crops.", className: "text-paper" },
    { text: "Better harvests.", className: "text-editorial text-leaf-300" },
  ];

  return (
    <section
      ref={ref}
      className="bg-grain relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-humus-950"
    >
      {/* Layered field imagery */}
      <motion.div style={reduce ? undefined : { y: bgY }} className="absolute inset-0 -z-10">
        <Image
          src={heroField}
          alt=""
          fill
          priority
          placeholder="blur"
          sizes="100vw"
          quality={72}
          className="scale-105 object-cover object-[62%_40%]"
        />
        {/* Colour grade + legibility scrims */}
        <div aria-hidden className="absolute inset-0 bg-humus-900/35 mix-blend-multiply" />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-humus-950/92 via-humus-950/55 to-humus-950/20 max-lg:bg-humus-950/70"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-humus-950 to-transparent"
        />
      </motion.div>
      <div aria-hidden className="absolute inset-0 -z-10 glow-leaf" />

      <div className="container-wide flex flex-1 items-center pt-28 pb-16 md:pt-32">
        <div className="grid w-full items-center gap-12 lg:grid-cols-[1.12fr_0.88fr]">
          {/* Copy */}
          <div>
            <motion.p
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="flex items-center gap-3 text-eyebrow text-leaf-400"
            >
              <span aria-hidden className="h-px w-10 bg-leaf-400/70" />
              Home of healthy soil &amp; healthy crop
            </motion.p>

            <h1 className="mt-6 text-display-1">
              {lines.map((line, i) => (
                <span key={line.text} className="block overflow-hidden">
                  <motion.span
                    className={`block ${line.className}`}
                    initial={reduce ? false : { y: "105%" }}
                    animate={{ y: 0 }}
                    transition={{ duration: 0.85, delay: 0.12 + i * 0.12, ease: EASE }}
                  >
                    {line.text}
                  </motion.span>
                </span>
              ))}
            </h1>

            <motion.p
              initial={reduce ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5, ease: EASE }}
              className="mt-6 max-w-xl text-base leading-relaxed text-paper/75 md:text-lg"
            >
              Humuson Complex distributes organic fertilisers, biostimulants and foliar fertilisers
              from renowned European producers — helping Zimbabwean farmers improve soil fertility,
              maximise crop productivity and farm sustainably.
            </motion.p>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.62, ease: EASE }}
              className="mt-9 flex flex-wrap items-center gap-3"
            >
              <ButtonLink href="/products" variant="accent" size="xl">
                Explore products <ArrowRight className="size-4.5" />
              </ButtonLink>
              <ButtonLink href="/product-finder" variant="outline-light" size="xl">
                <ScanSearch className="size-5" strokeWidth={1.8} /> Find my solution
              </ButtonLink>
            </motion.div>

            {/* Real numbers only */}
            <motion.dl
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.85 }}
              className="mt-12 flex flex-wrap gap-x-10 gap-y-5"
            >
              {[
                { value: productCount, suffix: "", label: "Products in range" },
                { value: cropCount, suffix: "", label: "Crops covered" },
                { value: partnerCount, suffix: "", label: "Partner brands" },
              ].map((stat) => (
                <div key={stat.label}>
                  <dt className="sr-only">{stat.label}</dt>
                  <dd className="font-display text-3xl font-semibold text-paper">
                    <Counter value={stat.value} suffix={stat.suffix} />
                  </dd>
                  <dd className="mt-0.5 text-xs tracking-wide text-paper/55 uppercase">
                    {stat.label}
                  </dd>
                </div>
              ))}
              <div>
                <dd className="font-display text-3xl font-semibold text-leaf-300">Free</dd>
                <dd className="mt-0.5 text-xs tracking-wide text-paper/55 uppercase">
                  Basic consultation
                </dd>
              </div>
            </motion.dl>
          </div>

          {/* Floating information cards */}
          <motion.div
            style={reduce ? undefined : { y: cardsY }}
            className="relative mx-auto w-full max-w-md lg:max-w-none"
          >
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 32, rotate: -1.5 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ duration: 0.9, delay: 0.55, ease: EASE }}
            >
              {spotlight && (
                <Link
                  href={`/products/${spotlight.slug}`}
                  className="group block rounded-3xl p-5 shadow-float glass-dark transition-transform duration-300 hover:-translate-y-1"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-eyebrow text-[0.62rem] text-leaf-400">Product spotlight</p>
                    {spotlight.category && (
                      <Badge variant="glass" className="text-[0.62rem]">
                        {spotlight.category.name}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-4 flex gap-4">
                    {spotlight.image && (
                      <div className="relative h-28 w-24 shrink-0 overflow-hidden rounded-xl bg-paper/10">
                        <MediaImage
                          image={spotlight.image}
                          alt={`${spotlight.name} pack`}
                          fill
                          sizes="96px"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-display text-xl font-semibold text-paper">
                        {spotlight.name}
                      </p>
                      {spotlight.shortDescription && (
                        <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-paper/65">
                          {spotlight.shortDescription}
                        </p>
                      )}
                    </div>
                  </div>
                  {spotlight.cropNames.length > 0 && (
                    <p className="mt-4 flex items-start gap-1.5 border-t border-paper/10 pt-3 text-xs text-paper/75">
                      <Leaf className="mt-0.5 size-3.5 shrink-0 text-leaf-400" />
                      <span className="truncate">
                        Listed for {spotlight.cropNames.slice(0, 4).join(", ")}
                        {spotlight.cropNames.length > 4 && "…"}
                      </span>
                    </p>
                  )}
                  <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-leaf-300">
                    View product{" "}
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </p>
                </Link>
              )}
            </motion.div>

            <motion.a
              href={whatsappLink(whatsappAdviceMessage())}
              target="_blank"
              rel="noopener noreferrer"
              initial={reduce ? false : { opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.72, ease: EASE }}
              className="mt-4 flex items-center gap-4 rounded-3xl p-5 shadow-float glass-dark transition-transform duration-300 hover:-translate-y-1 lg:ml-14"
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-leaf-400 text-humus-950">
                <MessageCircle className="size-5.5" strokeWidth={1.9} />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-sm font-semibold text-paper">
                  Talk to an agronomy adviser
                </span>
                <span className="mt-0.5 block text-xs text-paper/65">
                  Basic consultation is free — reach us on WhatsApp
                </span>
              </span>
              <ArrowRight className="ml-auto size-4 shrink-0 text-leaf-300" />
            </motion.a>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.86, ease: EASE }}
              className="mt-4 flex items-center justify-between gap-3 rounded-3xl px-5 py-4 shadow-float glass-dark lg:mr-10"
            >
              <p className="text-xs leading-relaxed text-paper/70">
                Crop programs for maize, wheat &amp; potatoes — see which product fits each growth
                stage.
              </p>
              <Link
                href="/crops"
                className="shrink-0 rounded-full border border-paper/25 px-4 py-2 text-xs font-medium text-paper transition-colors hover:border-leaf-400 hover:text-leaf-300"
              >
                View crops
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Scroll cue */}
      <motion.div
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.8 }}
        className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 text-paper/50"
        aria-hidden
      >
        <ChevronDown className="mx-auto size-5 animate-float-y" />
      </motion.div>
    </section>
  );
}
