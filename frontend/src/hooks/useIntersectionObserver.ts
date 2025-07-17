import { useState, useEffect, useRef, RefObject } from 'react';

interface IntersectionObserverOptions {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
}

/**
 * A custom hook that uses the IntersectionObserver API to detect when an element
 * enters or exits the viewport.
 * 
 * @param options - IntersectionObserver options
 * @returns An object containing:
 *   - ref: A ref to attach to the target element
 *   - isIntersecting: A boolean indicating if the element is in view
 *   - entry: The full IntersectionObserverEntry object
 */
export const useIntersectionObserver = <T extends HTMLElement = HTMLDivElement>(
  options: IntersectionObserverOptions = {}
) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const elementRef = useRef<T | null>(null);
  
  const { root = null, rootMargin = '0px', threshold = 0 } = options;

  useEffect(() => {
    const element = elementRef.current;
    if (!element || typeof IntersectionObserver !== 'function') {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        setEntry(entry);
      },
      { root, rootMargin, threshold }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [root, rootMargin, threshold]);

  return {
    ref: elementRef,
    isIntersecting,
    entry
  };
};

/**
 * A custom hook that uses the IntersectionObserver API to detect when an element
 * enters the viewport, with the option to trigger only once.
 * 
 * @param options - IntersectionObserver options
 * @param triggerOnce - Whether to disconnect the observer after the first intersection
 * @returns An object containing:
 *   - ref: A ref to attach to the target element
 *   - isIntersecting: A boolean indicating if the element is in view
 *   - entry: The full IntersectionObserverEntry object
 */
export const useIntersectionObserverOnce = <T extends HTMLElement = HTMLDivElement>(
  options: IntersectionObserverOptions = {},
  triggerOnce: boolean = true
) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const elementRef = useRef<T | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  
  const { root = null, rootMargin = '0px', threshold = 0 } = options;

  useEffect(() => {
    const element = elementRef.current;
    if (!element || typeof IntersectionObserver !== 'function') {
      return;
    }

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        setEntry(entry);
        
        // If triggerOnce is true and the element is intersecting, disconnect the observer
        if (triggerOnce && entry.isIntersecting && observerRef.current) {
          observerRef.current.disconnect();
        }
      },
      { root, rootMargin, threshold }
    );

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [root, rootMargin, threshold, triggerOnce]);

  return {
    ref: elementRef,
    isIntersecting,
    entry
  };
};

export default useIntersectionObserver;