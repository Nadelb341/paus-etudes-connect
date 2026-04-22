import { useRef, useState, useCallback } from "react";

export const useScrollToTop = (threshold = 200) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const handleScroll = useCallback(() => {
    setShowScrollTop((scrollRef.current?.scrollTop ?? 0) > threshold);
  }, [threshold]);

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return { scrollRef, showScrollTop, handleScroll, scrollToTop };
};

// Pour le scroll de la fenêtre (pages entières)
export const useWindowScrollToTop = (threshold = 200) => {
  const [showScrollTop, setShowScrollTop] = useState(false);

  const handleScroll = useCallback(() => {
    setShowScrollTop(window.scrollY > threshold);
  }, [threshold]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return { showScrollTop, handleScroll, scrollToTop };
};
