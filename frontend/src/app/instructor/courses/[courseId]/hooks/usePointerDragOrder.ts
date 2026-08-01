"use client";

import { useRef, useState } from "react";

interface DragOptions {
  isInstructorOrAdmin: boolean;
  onReorderWeeks?: (fromIndex: number, toIndex: number) => Promise<void> | void;
  onReorderLessons?: (weekId: string, fromIndex: number, toIndex: number) => Promise<void> | void;
  onReorderItems?: (lessonId: string, fromIndex: number, toIndex: number) => Promise<void> | void;
}

export function usePointerDragOrder(options: DragOptions) {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const isInstructorOrAdmin = options.isInstructorOrAdmin;

  const [activeDraggingItemId, setActiveDraggingItemId] = useState<string | null>(null);
  const [activeDraggingLessonId, setActiveDraggingLessonId] = useState<string | null>(null);
  const [activeDraggingWeekId, setActiveDraggingWeekId] = useState<string | null>(null);

  // 60FPS Continuous Lerp Auto-Scroll Engine Ref
  const autoScrollStateRef = useRef<{
    animationFrameId: number | null;
    currentSpeed: number;
    targetSpeed: number;
    onFrame: (() => void) | null;
  }>({
    animationFrameId: null,
    currentSpeed: 0,
    targetSpeed: 0,
    onFrame: null,
  });

  const updateAutoScrollEngine = (
    elementEl: HTMLElement | null,
    clientY: number,
    onScrollFrame: () => void,
  ) => {
    const cursorThreshold = 90;
    const elementEdgeThreshold = 35;
    const maxSpeed = 20;
    const gentleSpeed = 4;
    const viewportHeight = window.innerHeight;

    let computedTargetSpeed = 0;

    if (clientY < cursorThreshold) {
      const depth = (cursorThreshold - clientY) / cursorThreshold;
      computedTargetSpeed = -Math.pow(depth, 1.5) * maxSpeed;
    } else if (viewportHeight - clientY < cursorThreshold) {
      const depth = (cursorThreshold - (viewportHeight - clientY)) / cursorThreshold;
      computedTargetSpeed = Math.pow(depth, 1.5) * maxSpeed;
    } else if (elementEl) {
      const rect = elementEl.getBoundingClientRect();
      if (
        viewportHeight - rect.bottom < elementEdgeThreshold &&
        viewportHeight - rect.bottom > -120
      ) {
        computedTargetSpeed = gentleSpeed;
      } else if (rect.top < elementEdgeThreshold && rect.top > -120) {
        computedTargetSpeed = -gentleSpeed;
      }
    }

    const scrollState = autoScrollStateRef.current;
    scrollState.targetSpeed = computedTargetSpeed;
    scrollState.onFrame = onScrollFrame;

    if (computedTargetSpeed !== 0 && scrollState.animationFrameId === null) {
      const scrollLoop = () => {
        const state = autoScrollStateRef.current;
        state.currentSpeed += (state.targetSpeed - state.currentSpeed) * 0.25;

        if (Math.abs(state.currentSpeed) > 0.1) {
          window.scrollBy(0, state.currentSpeed);
          if (state.onFrame) {
            state.onFrame();
          }
          state.animationFrameId = requestAnimationFrame(scrollLoop);
        } else {
          state.currentSpeed = 0;
          state.animationFrameId = null;
        }
      };

      scrollState.animationFrameId = requestAnimationFrame(scrollLoop);
    } else if (
      computedTargetSpeed === 0 &&
      Math.abs(scrollState.currentSpeed) < 0.2 &&
      scrollState.animationFrameId !== null
    ) {
      cancelAnimationFrame(scrollState.animationFrameId);
      scrollState.animationFrameId = null;
      scrollState.currentSpeed = 0;
    }
  };

  const stopAutoScrollEngine = () => {
    const state = autoScrollStateRef.current;
    if (state.animationFrameId !== null) {
      cancelAnimationFrame(state.animationFrameId);
      state.animationFrameId = null;
    }
    state.currentSpeed = 0;
    state.targetSpeed = 0;
    state.onFrame = null;
  };

  // --- ITEM DRAG HANDLERS ---
  const itemPointerDragRef = useRef<{
    itemId: string;
    lessonId: string;
    itemEl: HTMLElement;
    containerEl: HTMLElement;
    startY: number;
    startScrollY: number;
    lastClientY: number;
    minY: number;
    maxY: number;
    startIndex: number;
    currentIndex: number;
    itemBounds: { id: string; top: number; bottom: number; mid: number }[];
    animationFrameId: number | null;
  } | null>(null);

  const handleItemPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    lessonId: string,
    itemId: string,
    startIndex: number,
  ) => {
    if (!isInstructorOrAdmin) return;
    e.preventDefault();
    e.stopPropagation();

    const handleEl = e.currentTarget;
    handleEl.setPointerCapture(e.pointerId);

    const itemEl = handleEl.closest("[data-item-id]") as HTMLElement;
    const containerEl = handleEl.closest("[data-items-container]") as HTMLElement;

    if (!itemEl || !containerEl) return;

    const itemRect = itemEl.getBoundingClientRect();
    const containerRect = containerEl.getBoundingClientRect();

    const minY = containerRect.top - itemRect.top;
    const maxY = containerRect.bottom - itemRect.bottom;

    const siblingEls = Array.from(containerEl.querySelectorAll<HTMLElement>("[data-item-id]"));
    const itemBounds = siblingEls.map((el) => {
      const r = el.getBoundingClientRect();
      return {
        id: el.getAttribute("data-item-id")!,
        top: r.top,
        bottom: r.bottom,
        mid: r.top + r.height / 2,
      };
    });

    itemEl.style.transform = "translateY(0px)";
    itemEl.style.zIndex = "50";
    itemEl.style.position = "relative";
    itemEl.style.boxShadow =
      "0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)";
    itemEl.style.borderColor = "#94a3b8";
    itemEl.style.transition = "none";

    itemPointerDragRef.current = {
      itemId,
      lessonId,
      itemEl,
      containerEl,
      startY: e.clientY,
      startScrollY: window.scrollY,
      lastClientY: e.clientY,
      minY,
      maxY,
      startIndex,
      currentIndex: startIndex,
      itemBounds,
      animationFrameId: null,
    };

    setActiveDraggingItemId(itemId);
  };

  const renderItemPointerDragFrame = (clientY: number) => {
    const drag = itemPointerDragRef.current;
    if (!drag) return;

    const scrollDelta = window.scrollY - drag.startScrollY;
    const deltaY = clientY - drag.startY + scrollDelta;
    const constrainedY = Math.max(drag.minY, Math.min(drag.maxY, deltaY));

    if (drag.itemEl) {
      drag.itemEl.style.transform = `translateY(${constrainedY}px)`;
    }

    const draggedRect = drag.itemEl ? drag.itemEl.getBoundingClientRect() : null;
    const draggedTop = draggedRect ? draggedRect.top : clientY;
    const draggedBottom = draggedRect ? draggedRect.bottom : clientY;
    const currentScrollOffset = window.scrollY - drag.startScrollY;
    let newTargetIndex = drag.startIndex;

    for (let idx = 0; idx < drag.itemBounds.length; idx++) {
      const siblingMidpoint = drag.itemBounds[idx].mid - currentScrollOffset;

      if (idx < drag.startIndex) {
        if (draggedTop < siblingMidpoint) {
          newTargetIndex = Math.min(newTargetIndex, idx);
        }
      } else if (idx > drag.startIndex) {
        if (draggedBottom > siblingMidpoint) {
          newTargetIndex = Math.max(newTargetIndex, idx);
        }
      }
    }

    drag.currentIndex = newTargetIndex;

    const siblingEls = Array.from(drag.containerEl.querySelectorAll<HTMLElement>("[data-item-id]"));
    const draggedHeight = drag.itemBounds[drag.startIndex]
      ? drag.itemBounds[drag.startIndex].bottom - drag.itemBounds[drag.startIndex].top + 8
      : 44;

    siblingEls.forEach((el, idx) => {
      if (idx === drag.startIndex) return;

      el.style.transition = "transform 0.22s cubic-bezier(0.2, 0, 0, 1)";

      if (drag.startIndex < newTargetIndex) {
        if (idx > drag.startIndex && idx <= newTargetIndex) {
          el.style.transform = `translateY(-${draggedHeight}px)`;
        } else {
          el.style.transform = "translateY(0px)";
        }
      } else if (drag.startIndex > newTargetIndex) {
        if (idx >= newTargetIndex && idx < drag.startIndex) {
          el.style.transform = `translateY(${draggedHeight}px)`;
        } else {
          el.style.transform = "translateY(0px)";
        }
      } else {
        el.style.transform = "translateY(0px)";
      }
    });
  };

  const handleItemPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = itemPointerDragRef.current;
    if (!drag) return;
    e.preventDefault();

    drag.lastClientY = e.clientY;

    updateAutoScrollEngine(drag.itemEl, e.clientY, () => {
      renderItemPointerDragFrame(drag.lastClientY);
    });

    if (drag.animationFrameId !== null) {
      cancelAnimationFrame(drag.animationFrameId);
    }

    drag.animationFrameId = requestAnimationFrame(() => {
      renderItemPointerDragFrame(e.clientY);
    });
  };

  const handleItemPointerUp = async (e: React.PointerEvent<HTMLDivElement>) => {
    stopAutoScrollEngine();
    const drag = itemPointerDragRef.current;
    if (!drag) return;
    e.preventDefault();

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (drag.animationFrameId !== null) {
      cancelAnimationFrame(drag.animationFrameId);
    }

    const { lessonId, startIndex, currentIndex, itemEl, containerEl, itemBounds } = drag;
    itemPointerDragRef.current = null;
    setActiveDraggingItemId(null);

    const startTop = itemBounds[startIndex] ? itemBounds[startIndex].top : 0;
    const targetTop = itemBounds[currentIndex] ? itemBounds[currentIndex].top : startTop;
    const targetOffset = targetTop - startTop;

    if (itemEl) {
      itemEl.style.transition =
        "transform 0.18s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.18s ease, border-color 0.18s ease";
      itemEl.style.transform = `translateY(${targetOffset}px)`;
      itemEl.style.boxShadow = "";
      itemEl.style.borderColor = "";
    }

    await new Promise((resolve) => setTimeout(resolve, 180));

    if (itemEl) {
      itemEl.style.transform = "";
      itemEl.style.zIndex = "";
      itemEl.style.position = "";
      itemEl.style.boxShadow = "";
      itemEl.style.borderColor = "";
      itemEl.style.transition = "";
    }

    if (containerEl) {
      const siblingEls = Array.from(containerEl.querySelectorAll<HTMLElement>("[data-item-id]"));
      siblingEls.forEach((el) => {
        el.style.transform = "";
        el.style.transition = "";
      });
    }

    if (currentIndex !== startIndex) {
      if (optionsRef.current.onReorderItems) {
        await optionsRef.current.onReorderItems(lessonId, startIndex, currentIndex);
      }
    }
  };

  // --- LESSON DRAG HANDLERS ---
  const lessonPointerDragRef = useRef<{
    lessonId: string;
    weekId: string;
    lessonEl: HTMLElement;
    containerEl: HTMLElement;
    startY: number;
    startScrollY: number;
    lastClientY: number;
    minY: number;
    maxY: number;
    startIndex: number;
    currentIndex: number;
    lessonBounds: { id: string; top: number; bottom: number; mid: number }[];
    animationFrameId: number | null;
  } | null>(null);

  const handleLessonPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    weekId: string,
    lessonId: string,
    startIndex: number,
  ) => {
    if (!isInstructorOrAdmin) return;
    e.preventDefault();
    e.stopPropagation();

    const handleEl = e.currentTarget;
    handleEl.setPointerCapture(e.pointerId);

    const lessonEl = handleEl.closest("[data-lesson-id]") as HTMLElement;
    const containerEl = handleEl.closest("[data-lessons-container]") as HTMLElement;

    if (!lessonEl || !containerEl) return;

    const lessonRect = lessonEl.getBoundingClientRect();
    const containerRect = containerEl.getBoundingClientRect();

    const minY = containerRect.top - lessonRect.top;
    const maxY = containerRect.bottom - lessonRect.bottom;

    const siblingEls = Array.from(containerEl.querySelectorAll<HTMLElement>("[data-lesson-id]"));
    const lessonBounds = siblingEls.map((el) => {
      const r = el.getBoundingClientRect();
      return {
        id: el.getAttribute("data-lesson-id")!,
        top: r.top,
        bottom: r.bottom,
        mid: r.top + r.height / 2,
      };
    });

    lessonEl.style.transform = "translateY(0px)";
    lessonEl.style.zIndex = "40";
    lessonEl.style.position = "relative";
    lessonEl.style.boxShadow =
      "0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)";
    lessonEl.style.borderColor = "#94a3b8";
    lessonEl.style.transition = "none";

    lessonPointerDragRef.current = {
      lessonId,
      weekId,
      lessonEl,
      containerEl,
      startY: e.clientY,
      startScrollY: window.scrollY,
      lastClientY: e.clientY,
      minY,
      maxY,
      startIndex,
      currentIndex: startIndex,
      lessonBounds,
      animationFrameId: null,
    };

    setActiveDraggingLessonId(lessonId);
  };

  const renderLessonPointerDragFrame = (clientY: number) => {
    const drag = lessonPointerDragRef.current;
    if (!drag) return;

    const scrollDelta = window.scrollY - drag.startScrollY;
    const deltaY = clientY - drag.startY + scrollDelta;
    const constrainedY = Math.max(drag.minY, Math.min(drag.maxY, deltaY));

    if (drag.lessonEl) {
      drag.lessonEl.style.transform = `translateY(${constrainedY}px)`;
    }

    const draggedRect = drag.lessonEl ? drag.lessonEl.getBoundingClientRect() : null;
    const draggedTop = draggedRect ? draggedRect.top : clientY;
    const draggedBottom = draggedRect ? draggedRect.bottom : clientY;
    const currentScrollOffset = window.scrollY - drag.startScrollY;
    let newTargetIndex = drag.startIndex;

    for (let idx = 0; idx < drag.lessonBounds.length; idx++) {
      const siblingMidpoint = drag.lessonBounds[idx].mid - currentScrollOffset;

      if (idx < drag.startIndex) {
        if (draggedTop < siblingMidpoint) {
          newTargetIndex = Math.min(newTargetIndex, idx);
        }
      } else if (idx > drag.startIndex) {
        if (draggedBottom > siblingMidpoint) {
          newTargetIndex = Math.max(newTargetIndex, idx);
        }
      }
    }

    drag.currentIndex = newTargetIndex;

    const siblingEls = Array.from(
      drag.containerEl.querySelectorAll<HTMLElement>("[data-lesson-id]"),
    );
    const draggedHeight = drag.lessonBounds[drag.startIndex]
      ? drag.lessonBounds[drag.startIndex].bottom - drag.lessonBounds[drag.startIndex].top + 16
      : 80;

    siblingEls.forEach((el, idx) => {
      if (idx === drag.startIndex) return;

      el.style.transition = "transform 0.22s cubic-bezier(0.2, 0, 0, 1)";

      if (drag.startIndex < newTargetIndex) {
        if (idx > drag.startIndex && idx <= newTargetIndex) {
          el.style.transform = `translateY(-${draggedHeight}px)`;
        } else {
          el.style.transform = "translateY(0px)";
        }
      } else if (drag.startIndex > newTargetIndex) {
        if (idx >= newTargetIndex && idx < drag.startIndex) {
          el.style.transform = `translateY(${draggedHeight}px)`;
        } else {
          el.style.transform = "translateY(0px)";
        }
      } else {
        el.style.transform = "translateY(0px)";
      }
    });
  };

  const handleLessonPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = lessonPointerDragRef.current;
    if (!drag) return;
    e.preventDefault();

    drag.lastClientY = e.clientY;

    updateAutoScrollEngine(drag.lessonEl, e.clientY, () => {
      renderLessonPointerDragFrame(drag.lastClientY);
    });

    if (drag.animationFrameId !== null) {
      cancelAnimationFrame(drag.animationFrameId);
    }

    drag.animationFrameId = requestAnimationFrame(() => {
      renderLessonPointerDragFrame(e.clientY);
    });
  };

  const handleLessonPointerUp = async (e: React.PointerEvent<HTMLDivElement>) => {
    stopAutoScrollEngine();
    const drag = lessonPointerDragRef.current;
    if (!drag) return;
    e.preventDefault();

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (drag.animationFrameId !== null) {
      cancelAnimationFrame(drag.animationFrameId);
    }

    const { weekId, startIndex, currentIndex, lessonEl, containerEl, lessonBounds } = drag;
    lessonPointerDragRef.current = null;
    setActiveDraggingLessonId(null);

    const startTop = lessonBounds[startIndex] ? lessonBounds[startIndex].top : 0;
    const targetTop = lessonBounds[currentIndex] ? lessonBounds[currentIndex].top : startTop;
    const targetOffset = targetTop - startTop;

    if (lessonEl) {
      lessonEl.style.transition =
        "transform 0.18s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.18s ease, border-color 0.18s ease";
      lessonEl.style.transform = `translateY(${targetOffset}px)`;
      lessonEl.style.boxShadow = "";
      lessonEl.style.borderColor = "";
    }

    await new Promise((resolve) => setTimeout(resolve, 180));

    if (lessonEl) {
      lessonEl.style.transform = "";
      lessonEl.style.zIndex = "";
      lessonEl.style.position = "";
      lessonEl.style.boxShadow = "";
      lessonEl.style.borderColor = "";
      lessonEl.style.transition = "";
    }

    if (containerEl) {
      const siblingEls = Array.from(containerEl.querySelectorAll<HTMLElement>("[data-lesson-id]"));
      siblingEls.forEach((el) => {
        el.style.transform = "";
        el.style.transition = "";
      });
    }

    if (currentIndex !== startIndex) {
      if (optionsRef.current.onReorderLessons) {
        await optionsRef.current.onReorderLessons(weekId, startIndex, currentIndex);
      }
    }
  };

  // --- WEEK DRAG HANDLERS ---
  const weekPointerDragRef = useRef<{
    weekId: string;
    weekEl: HTMLElement;
    containerEl: HTMLElement;
    startY: number;
    startScrollY: number;
    lastClientY: number;
    minY: number;
    maxY: number;
    startIndex: number;
    currentIndex: number;
    weekBounds: { id: string; top: number; bottom: number; mid: number }[];
    animationFrameId: number | null;
  } | null>(null);

  const handleWeekPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    weekId: string,
    startIndex: number,
  ) => {
    if (!isInstructorOrAdmin) return;
    e.preventDefault();
    e.stopPropagation();

    const handleEl = e.currentTarget;
    handleEl.setPointerCapture(e.pointerId);

    const weekEl = handleEl.closest("[data-week-id]") as HTMLElement;
    const containerEl = handleEl.closest("[data-weeks-container]") as HTMLElement;

    if (!weekEl || !containerEl) return;

    const weekRect = weekEl.getBoundingClientRect();
    const containerRect = containerEl.getBoundingClientRect();

    const minY = containerRect.top - weekRect.top;
    const maxY = containerRect.bottom - weekRect.bottom;

    const siblingEls = Array.from(containerEl.querySelectorAll<HTMLElement>("[data-week-id]"));
    const weekBounds = siblingEls.map((el) => {
      const r = el.getBoundingClientRect();
      return {
        id: el.getAttribute("data-week-id")!,
        top: r.top,
        bottom: r.bottom,
        mid: r.top + r.height / 2,
      };
    });

    weekEl.style.transform = "translateY(0px)";
    weekEl.style.zIndex = "30";
    weekEl.style.position = "relative";
    weekEl.style.boxShadow =
      "0 12px 30px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)";
    weekEl.style.borderColor = "#94a3b8";
    weekEl.style.transition = "none";

    weekPointerDragRef.current = {
      weekId,
      weekEl,
      containerEl,
      startY: e.clientY,
      startScrollY: window.scrollY,
      lastClientY: e.clientY,
      minY,
      maxY,
      startIndex,
      currentIndex: startIndex,
      weekBounds,
      animationFrameId: null,
    };

    setActiveDraggingWeekId(weekId);
  };

  const renderWeekPointerDragFrame = (clientY: number) => {
    const drag = weekPointerDragRef.current;
    if (!drag) return;

    const scrollDelta = window.scrollY - drag.startScrollY;
    const deltaY = clientY - drag.startY + scrollDelta;
    const constrainedY = Math.max(drag.minY, Math.min(drag.maxY, deltaY));

    if (drag.weekEl) {
      drag.weekEl.style.transform = `translateY(${constrainedY}px)`;
    }

    const draggedRect = drag.weekEl ? drag.weekEl.getBoundingClientRect() : null;
    const draggedTop = draggedRect ? draggedRect.top : clientY;
    const draggedBottom = draggedRect ? draggedRect.bottom : clientY;
    const currentScrollOffset = window.scrollY - drag.startScrollY;
    let newTargetIndex = drag.startIndex;

    for (let idx = 0; idx < drag.weekBounds.length; idx++) {
      const siblingMidpoint = drag.weekBounds[idx].mid - currentScrollOffset;

      if (idx < drag.startIndex) {
        if (draggedTop < siblingMidpoint) {
          newTargetIndex = Math.min(newTargetIndex, idx);
        }
      } else if (idx > drag.startIndex) {
        if (draggedBottom > siblingMidpoint) {
          newTargetIndex = Math.max(newTargetIndex, idx);
        }
      }
    }

    drag.currentIndex = newTargetIndex;

    const siblingEls = Array.from(drag.containerEl.querySelectorAll<HTMLElement>("[data-week-id]"));
    const draggedHeight = drag.weekBounds[drag.startIndex]
      ? drag.weekBounds[drag.startIndex].bottom - drag.weekBounds[drag.startIndex].top + 24
      : 160;

    siblingEls.forEach((el, idx) => {
      if (idx === drag.startIndex) return;

      el.style.transition = "transform 0.22s cubic-bezier(0.2, 0, 0, 1)";

      if (drag.startIndex < newTargetIndex) {
        if (idx > drag.startIndex && idx <= newTargetIndex) {
          el.style.transform = `translateY(-${draggedHeight}px)`;
        } else {
          el.style.transform = "translateY(0px)";
        }
      } else if (drag.startIndex > newTargetIndex) {
        if (idx >= newTargetIndex && idx < drag.startIndex) {
          el.style.transform = `translateY(${draggedHeight}px)`;
        } else {
          el.style.transform = "translateY(0px)";
        }
      } else {
        el.style.transform = "translateY(0px)";
      }
    });
  };

  const handleWeekPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = weekPointerDragRef.current;
    if (!drag) return;
    e.preventDefault();

    drag.lastClientY = e.clientY;

    updateAutoScrollEngine(drag.weekEl, e.clientY, () => {
      renderWeekPointerDragFrame(drag.lastClientY);
    });

    if (drag.animationFrameId !== null) {
      cancelAnimationFrame(drag.animationFrameId);
    }

    drag.animationFrameId = requestAnimationFrame(() => {
      renderWeekPointerDragFrame(e.clientY);
    });
  };

  const handleWeekPointerUp = async (e: React.PointerEvent<HTMLDivElement>) => {
    stopAutoScrollEngine();
    const drag = weekPointerDragRef.current;
    if (!drag) return;
    e.preventDefault();

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (drag.animationFrameId !== null) {
      cancelAnimationFrame(drag.animationFrameId);
    }

    const { startIndex, currentIndex, weekEl, containerEl, weekBounds } = drag;
    weekPointerDragRef.current = null;
    setActiveDraggingWeekId(null);

    const startTop = weekBounds[startIndex] ? weekBounds[startIndex].top : 0;
    const targetTop = weekBounds[currentIndex] ? weekBounds[currentIndex].top : startTop;
    const targetOffset = targetTop - startTop;

    if (weekEl) {
      weekEl.style.transition =
        "transform 0.18s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.18s ease, border-color 0.18s ease";
      weekEl.style.transform = `translateY(${targetOffset}px)`;
      weekEl.style.boxShadow = "";
      weekEl.style.borderColor = "";
    }

    await new Promise((resolve) => setTimeout(resolve, 180));

    if (weekEl) {
      weekEl.style.transform = "";
      weekEl.style.zIndex = "";
      weekEl.style.position = "";
      weekEl.style.boxShadow = "";
      weekEl.style.borderColor = "";
      weekEl.style.transition = "";
    }

    if (containerEl) {
      const siblingEls = Array.from(containerEl.querySelectorAll<HTMLElement>("[data-week-id]"));
      siblingEls.forEach((el) => {
        el.style.transform = "";
        el.style.transition = "";
      });
    }

    if (currentIndex !== startIndex) {
      if (optionsRef.current.onReorderWeeks) {
        await optionsRef.current.onReorderWeeks(startIndex, currentIndex);
      }
    }
  };

  return {
    activeDraggingItemId,
    activeDraggingLessonId,
    activeDraggingWeekId,
    handleItemPointerDown,
    handleItemPointerMove,
    handleItemPointerUp,
    handleLessonPointerDown,
    handleLessonPointerMove,
    handleLessonPointerUp,
    handleWeekPointerDown,
    handleWeekPointerMove,
    handleWeekPointerUp,
  };
}
