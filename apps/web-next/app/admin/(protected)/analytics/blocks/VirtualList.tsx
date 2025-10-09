"use client";

import { useMemo, useRef, useState, UIEvent } from "react";

type VirtualListProps<T> = {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor?: (item: T, index: number) => string | number;
  height?: number; // px
  itemHeight?: number; // px (approximate, fixed row height)
  overscan?: number; // rows
  className?: string;
};

export default function VirtualList<T>({
  items,
  renderItem,
  keyExtractor,
  height = 360,
  itemHeight = 32,
  overscan = 6,
  className,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const total = items.length;
  const totalHeight = total * itemHeight;
  const viewportCount = Math.max(1, Math.ceil(height / itemHeight));

  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const end = Math.min(total, start + viewportCount + overscan * 2);

  const slice = useMemo(() => items.slice(start, end), [items, start, end]);

  function onScroll(e: UIEvent<HTMLDivElement>) {
    setScrollTop(e.currentTarget.scrollTop);
  }

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      className={className}
      style={{
        position: "relative",
        overflowY: "auto",
        height,
      }}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div style={{
          position: "absolute",
          top: start * itemHeight,
          left: 0,
          right: 0,
        }}>
          {slice.map((item, i) => {
            const index = start + i;
            const key = keyExtractor ? keyExtractor(item, index) : index;
            return (
              <div key={key} style={{ height: itemHeight }}>
                {renderItem(item, index)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

