import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Muted looping background video that only downloads and plays once visible.
 * It sits transparent over a still photo and fades in when playback starts, so there is never a blank frame.
 * Reduced-motion and Data Saver users keep the still photo.
 */
export function AutoVideo({ src, className = "" }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || navigator.connection?.saveData) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          if (!v.src) v.src = src;
          v.play().catch(() => {});
        } else {
          v.pause();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [src]);

  return (
    <video
      ref={ref}
      className={`${className} transition-opacity duration-1000 ${playing ? "opacity-100" : "opacity-0"}`}
      onPlaying={() => setPlaying(true)}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden
      tabIndex={-1}
    />
  );
}

/**
 * Keeps the home hero to exactly one screen under the header on tablets and laptops: when its contents are
 * taller than the space, the whole block is scaled down together with CSS zoom. Phones keep their own layout.
 */
export function HeroFit({ children, className = "" }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.zoom = "";
      el.style.minHeight = "";
      if (!window.matchMedia("(min-width: 640px)").matches) return;
      const section = el.parentElement;
      const top = section.getBoundingClientRect().top + window.scrollY;
      const avail = Math.min(window.innerHeight - top - 4, 920);
      const natural = el.offsetHeight;
      const z = Math.min(1, avail / natural);
      if (z < 0.999) el.style.zoom = z.toFixed(4);
      el.style.minHeight = `${Math.max(avail, 0) / z}px`;
    };
    fit();
    const ro = new ResizeObserver(() => requestAnimationFrame(fit));
    [...el.children].forEach((c) => ro.observe(c));
    window.addEventListener("resize", fit);
    document.fonts?.ready.then(fit);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/** Number that counts up the first time it scrolls into view. */
export function CountUp({ to, from = 0, duration = 1400 }) {
  const ref = useRef(null);
  const [val, setVal] = useState(to);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let done;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        setVal(from);
        const t0 = performance.now();
        const tick = (t) => {
          const p = Math.min(1, (t - t0) / duration);
          setVal(Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3))));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        done = setTimeout(() => setVal(to), duration + 300); // rAF pauses in background tabs
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      clearTimeout(done);
    };
  }, [to, from, duration]);

  return <span ref={ref}>{val}</span>;
}

/**
 * Pakka's step reveal: as the box scrolls up, data-stage counts how many of its `step` children have been
 * reached (78% down the screen), and --p runs 0 to 1 along them. CSS lights steps and draws the track from
 * these. Children laid out in one row are spread over a short scroll run so all of them light up in turn.
 * Reduced motion shows the finished state.
 */
export function StageProgress({ as: Tag = "div", className = "", step, children, style }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const items = () => [...el.querySelectorAll(step)];
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.setProperty("--p", "1");
      el.dataset.stage = String(items().length);
      return;
    }
    el.classList.add("sp-on");
    let frame = 0;
    const update = () => {
      frame = 0;
      const box = el.getBoundingClientRect();
      if (!box.height) return;
      const reached = window.innerHeight * 0.78 - box.top;
      const tops = items().map((it) => {
        const r = it.getBoundingClientRect();
        return { top: r.top - box.top, h: r.height };
      });
      const oneRow = tops.length > 1 && tops.every((t) => Math.abs(t.top - tops[0].top) < 4);
      let marks;
      if (oneRow) {
        const run = Math.min(tops[0].h * 0.45, 260);
        marks = tops.map((t, k) => t.top + 40 + (run * k) / Math.max(1, tops.length - 1));
      } else {
        marks = tops.map((t) => t.top + Math.min(t.h * 0.3, 120));
      }
      el.dataset.stage = String(marks.filter((m) => reached >= m).length);
      const p = oneRow
        ? Math.min(1, Math.max(0, (reached - marks[0] + 40) / (marks[marks.length - 1] - marks[0] + 80)))
        : Math.min(1, Math.max(0, reached / box.height));
      el.style.setProperty("--p", p.toFixed(4));
    };
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
    };
  }, [step]);
  return (
    <Tag ref={ref} className={className} style={{ "--p": 0, ...style }} data-stage="0">
      {children}
    </Tag>
  );
}

/**
 * Keeps the Pakka home hero within one screen on laptops: scales it down (CSS zoom, never below 0.6) when the
 * headline, coach and booking bar are taller than the space under the bar and header.
 */
export function useHeroFit() {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.zoom = "";
      if (!window.matchMedia("(min-width: 1024px)").matches) return;
      const rootZoom = parseFloat(document.getElementById("root")?.style.zoom || "1") || 1;
      const bar = document.querySelector(".pk-bar")?.offsetHeight ?? 0;
      const header = document.querySelector(".pk-header")?.offsetHeight ?? 0;
      const avail = window.innerHeight / rootZoom - bar - header;
      const z = Math.min(1, avail / el.offsetHeight);
      if (z < 0.995) el.style.zoom = Math.max(z, 0.6).toFixed(4);
    };
    fit();
    const ro = new ResizeObserver(() => requestAnimationFrame(fit));
    [...el.children].forEach((c) => ro.observe(c));
    window.addEventListener("resize", fit);
    document.fonts?.ready.then(fit);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, []);
  return ref;
}

/**
 * Sets --p on its box, from 0 to 1, as the box scrolls up the screen: 0 while its top is below `from`
 * (a share of the screen height), 1 once its top reaches `to`. With `stages`, also sets data-stage.
 * Reduced-motion users get the finished state.
 */
export function ScrollProgress({ children, className = "", as: Tag = "div", from = 0.95, to = 0.45, stages, style }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = (p) => {
      el.style.setProperty("--p", p.toFixed(4));
      if (stages) {
        el.dataset.stage = String(p < 0.02 ? 0 : Array.from({ length: stages }, (_, k) => k / Math.max(1, stages - 1)).filter((at) => p >= at - 0.02).length);
      }
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      set(1);
      return;
    }
    el.classList.add("sp-on");
    let frame = 0;
    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      const top = el.getBoundingClientRect().top;
      set(Math.min(1, Math.max(0, (from * vh - top) / ((from - to) * vh))));
    };
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
    };
  }, [from, to, stages]);

  return (
    <Tag ref={ref} className={`sp ${className}`} style={{ "--p": 0, ...style }}>
      {children}
    </Tag>
  );
}
