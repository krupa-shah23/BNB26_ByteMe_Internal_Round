'use client';

/**
 * React Bits — Animated List (https://reactbits.dev/components/animated-list)
 * CreatorAi adaptation: items are generic (rendered via `renderItem`), entries animate in/out/reorder with `layout`,
 * the list grows with its content instead of scrolling internally (`maxHeight` is opt-in), and the global
 * keyboard hijack is off by default.
 */
import React, { useRef, useState, useEffect, useCallback, type ReactNode, type UIEvent } from 'react';
import { AnimatePresence, motion, useInView } from 'motion/react';
import './AnimatedList.css';

interface AnimatedItemProps {
  children: ReactNode;
  delay?: number;
  index: number;
  onMouseEnter?: () => void;
  onClick?: () => void;
}

const AnimatedItem: React.FC<AnimatedItemProps> = ({ children, delay = 0, index, onMouseEnter, onClick }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3, once: false });
  return (
    <motion.div
      ref={ref}
      layout
      data-index={index}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      initial={{ scale: 0.7, opacity: 0, y: -16 }}
      animate={inView ? { scale: 1, opacity: 1, y: 0 } : { scale: 0.7, opacity: 0, y: 0 }}
      exit={{ scale: 0.7, opacity: 0 }}
      transition={{ duration: 0.25, delay, type: 'spring', stiffness: 380, damping: 30 }}
      style={{ marginBottom: '0.75rem', cursor: onClick ? 'pointer' : 'default' }}
    >
      {children}
    </motion.div>
  );
};

interface AnimatedListProps<T> {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T, index: number, selected: boolean) => ReactNode;
  onItemSelect?: (item: T, index: number) => void;
  showGradients?: boolean;
  enableArrowNavigation?: boolean;
  className?: string;
  itemClassName?: string;
  displayScrollbar?: boolean;
  initialSelectedIndex?: number;
  maxHeight?: number;
}

function AnimatedList<T>({
  items,
  getKey,
  renderItem,
  onItemSelect,
  showGradients = false,
  enableArrowNavigation = false,
  className = '',
  itemClassName = '',
  displayScrollbar = true,
  initialSelectedIndex = -1,
  maxHeight
}: AnimatedListProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(initialSelectedIndex);
  const [keyboardNav, setKeyboardNav] = useState<boolean>(false);
  const [topGradientOpacity, setTopGradientOpacity] = useState<number>(0);
  const [bottomGradientOpacity, setBottomGradientOpacity] = useState<number>(1);

  const handleScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const { scrollTop, scrollHeight, clientHeight } = target;
    setTopGradientOpacity(Math.min(scrollTop / 50, 1));
    const bottomDistance = scrollHeight - (scrollTop + clientHeight);
    setBottomGradientOpacity(scrollHeight <= clientHeight ? 0 : Math.min(bottomDistance / 50, 1));
  }, []);

  useEffect(() => {
    if (!enableArrowNavigation) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setKeyboardNav(true);
        setSelectedIndex(prev => Math.min(prev + 1, items.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setKeyboardNav(true);
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && selectedIndex >= 0 && selectedIndex < items.length) {
        e.preventDefault();
        onItemSelect?.(items[selectedIndex], selectedIndex);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, selectedIndex, onItemSelect, enableArrowNavigation]);

  useEffect(() => {
    if (!keyboardNav || selectedIndex < 0 || !listRef.current) return;
    listRef.current.querySelector(`[data-index="${selectedIndex}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    setKeyboardNav(false);
  }, [selectedIndex, keyboardNav]);

  return (
    <div className={`scroll-list-container ${className}`}>
      <div
        ref={listRef}
        className={`scroll-list ${!displayScrollbar ? 'no-scrollbar' : ''}`}
        style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}
        onScroll={handleScroll}
      >
        <AnimatePresence initial={false}>
          {items.map((item, index) => (
            <AnimatedItem
              key={getKey(item)}
              delay={0}
              index={index}
              onMouseEnter={() => setSelectedIndex(index)}
              onClick={
                onItemSelect
                  ? () => {
                      setSelectedIndex(index);
                      onItemSelect(item, index);
                    }
                  : undefined
              }
            >
              <div className={`item ${selectedIndex === index ? 'selected' : ''} ${itemClassName}`}>
                {renderItem(item, index, selectedIndex === index)}
              </div>
            </AnimatedItem>
          ))}
        </AnimatePresence>
      </div>
      {showGradients && maxHeight ? (
        <>
          <div className="top-gradient" style={{ opacity: topGradientOpacity }}></div>
          <div className="bottom-gradient" style={{ opacity: bottomGradientOpacity }}></div>
        </>
      ) : null}
    </div>
  );
}

export default AnimatedList;
