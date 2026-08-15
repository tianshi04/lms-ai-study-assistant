import { useCallback, useEffect, useRef, useState } from "react";

export function useScrollEdgeFade<T extends HTMLElement = HTMLDivElement>() {
  const scrollRef = useRef<T>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const hasOverflow = scrollHeight > clientHeight + 4;
    setCanScrollUp(hasOverflow && scrollTop > 4);
    setCanScrollDown(hasOverflow && scrollTop + clientHeight < scrollHeight - 6);
  }, []);

  useEffect(() => {
    handleScroll();
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(handleScroll);
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleScroll]);

  return {
    scrollRef,
    canScrollUp,
    canScrollDown,
    handleScroll,
  };
}
