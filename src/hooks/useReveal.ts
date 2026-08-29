import { useEffect, useRef } from 'react';

/**
 * Adds `is-visible` to elements marked `data-reveal` inside the returned ref
 * once they scroll into view, so CSS can fade/slide them up.
 *
 * Falls back to showing everything immediately when IntersectionObserver is
 * unavailable, and never hides content when the user prefers reduced motion.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const targets = Array.from(
      root.querySelectorAll<HTMLElement>('[data-reveal]'),
    );
    if (targets.length === 0) return;

    const showAll = () => targets.forEach((el) => el.classList.add('is-visible'));

    const reduced = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    if (reduced || typeof IntersectionObserver === 'undefined') {
      showAll();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return ref;
}

export default useReveal;
