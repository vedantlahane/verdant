"use client";

import { useEffect, useRef, ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface PlotterRevealProps {
  children: ReactNode;
  className?: string;
  distance?: number;
  /** Duration (seconds) of fallback tween when near page bottom */
  fallbackDuration?: number;
}

export function PlotterReveal({
  children,
  className = "",
  distance = 400,
  fallbackDuration = 0.6,
}: PlotterRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const distanceRef = useRef(distance);
  distanceRef.current = distance;
  const durationRef = useRef(fallbackDuration);
  durationRef.current = fallbackDuration;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let ctx: gsap.Context | undefined;
    let raf1 = 0;
    let raf2 = 0;

    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        ctx = gsap.context(() => {
          const d = distanceRef.current;
          const dur = durationRef.current;

          const finalState = {
            clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
            opacity: 1,
            y: 0,
          };

          // ── Measure available scroll runway ──
          const elTop = el.getBoundingClientRect().top + window.scrollY;
          const viewportH = window.innerHeight;
          const startScroll = Math.max(0, elTop - viewportH * 0.85);
          const maxScroll =
            document.documentElement.scrollHeight - viewportH;
          const runway = maxScroll - startScroll;

          if (runway < d * 0.75) {
            // ── NEAR BOTTOM: enter-triggered tween, no scrub needed ──
            gsap.to(el, {
              ...finalState,
              duration: dur,
              ease: "power1.inOut",
              scrollTrigger: {
                trigger: el,
                start: "top 95%",
                toggleActions: "play none none none",
                invalidateOnRefresh: true,
                onToggle: ({ isActive }) => {
                  el.style.willChange = isActive
                    ? "clip-path, transform, opacity"
                    : "auto";
                },
              },
            });
          } else {
            // ── ENOUGH RUNWAY: scrub animation ──
            const tl = gsap.timeline({
              scrollTrigger: {
                trigger: el,
                start: "top 85%",
                end: `+=${d}`,
                scrub: 0.3,
                invalidateOnRefresh: true,
                onToggle: ({ isActive }) => {
                  el.style.willChange = isActive
                    ? "clip-path, transform, opacity"
                    : "auto";
                },
                onLeave: () => gsap.set(el, finalState),
              },
            });

            tl.to(el, {
              ...finalState,
              ease: "power1.inOut",
            });
          }
        }, el);
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      ctx?.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={{
        opacity: 0,
        transform: "translateY(40px)",
        clipPath: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)",
      }}
    >
      {children}
    </div>
  );
}