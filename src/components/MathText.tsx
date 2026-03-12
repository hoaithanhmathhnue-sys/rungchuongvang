import { useEffect, useRef } from 'react';

declare global {
  interface Window { MathJax: any; }
}

interface MathTextProps {
  text: string;
  className?: string;
  tag?: 'span' | 'div' | 'h2' | 'h3' | 'p';
  mathScale?: number;
}

/**
 * MathText – render text + công thức MathJax, không vỡ layout.
 *
 * BUG FIXES:
 * 1. Regex $$...$$ fixed: $$$1$ → $content$ (trước bị tạo ra $$content$ sai)
 * 2. innerHTML set TRƯỚC typesetClear (không phải sau)
 * 3. applyContainerStyles sau khi render xong để ép inline
 */
export default function MathText({
  text,
  className = '',
  tag: Tag = 'span',
  mathScale = 1,
}: MathTextProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    let isMounted = true;
    let attempts = 0;

    /**
     * Fix: $$$1$ tạo ra "$$content$" → sai.
     * Cần tạo ra "$content$" → dùng literal "$" + capture + "$"
     */
    const toInline = (raw: string): string => {
      // $$...$$ → $...$ (display → inline)
      let result = raw.replace(/\$\$([^$]+?)\$\$/gs, (_match, inner) => `$${inner}$`);
      // \[...\] → \(...\)
      result = result.replace(/\\\[(.+?)\\\]/gs, '\\($1\\)');
      return result;
    };

    const applyContainerStyles = (el: HTMLElement) => {
      el.querySelectorAll('mjx-container').forEach((node) => {
        const c = node as HTMLElement;
        c.style.display = 'inline-flex';
        c.style.alignItems = 'center';
        c.style.verticalAlign = 'middle';
        c.style.maxWidth = '100%';
        c.style.margin = '0 2px';
        const svg = c.querySelector('svg') as SVGSVGElement | null;
        if (svg) {
          svg.style.maxWidth = '100%';
          svg.style.height = 'auto';
          svg.style.overflow = 'visible';
          if (mathScale !== 1) {
            svg.style.fontSize = `${mathScale}em`;
          }
        }
      });
    };

    const tryRender = async () => {
      if (!isMounted || !ref.current) return;

      if (window.MathJax?.typesetPromise) {
        try {
          // FIX: set innerHTML TRƯỚC, rồi mới clear cache cũ, rồi mới typeset
          const inlineText = toInline(text);
          ref.current.innerHTML = inlineText;
          window.MathJax.typesetClear?.([ref.current]);
          await window.MathJax.typesetPromise([ref.current]);
          if (isMounted && ref.current) {
            applyContainerStyles(ref.current);
          }
        } catch (err) {
          console.warn('[MathJax] render error:', err);
          if (isMounted && ref.current) ref.current.innerHTML = text;
        }
      } else if (attempts < 30) {
        attempts++;
        // Hiện raw text trong lúc chờ MathJax load
        if (isMounted && ref.current) ref.current.innerHTML = toInline(text);
        setTimeout(tryRender, 200);
      }
    };

    tryRender();
    return () => { isMounted = false; };
  }, [text, mathScale]);

  return (
    <Tag
      ref={ref as any}
      className={className}
      style={{
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
        minWidth: 0,
        lineHeight: 1.7,
      }}
    />
  );
}
