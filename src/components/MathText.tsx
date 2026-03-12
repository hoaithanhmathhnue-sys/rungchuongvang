import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    MathJax: any;
  }
}

interface MathTextProps {
  text: string;
  className?: string;
  tag?: 'span' | 'div' | 'h2' | 'h3' | 'p';
  mathScale?: number;
}

/**
 * MathText – render text + công thức MathJax, không vỡ layout.
 * $$...$$ tự động chuyển thành $...$ (inline) để tránh block-level phá ô đáp án.
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

    // Chuyển display math → inline math để tránh vỡ layout
    const toInline = (raw: string) =>
      raw
        .replace(/\$\$([^$]+?)\$\$/gs, '$$$1$')
        .replace(/\\\[(.+?)\\\]/gs, '\\($1\\)');

    const applyContainerStyles = (el: HTMLElement) => {
      el.querySelectorAll('mjx-container').forEach((node) => {
        const c = node as HTMLElement;
        c.style.display = 'inline-flex';
        c.style.alignItems = 'center';
        c.style.verticalAlign = 'middle';
        c.style.maxWidth = '100%';
        const svg = c.querySelector('svg') as SVGSVGElement | null;
        if (svg) {
          svg.style.maxWidth = '100%';
          svg.style.height = 'auto';
          if (mathScale !== 1) svg.style.fontSize = `${mathScale}em`;
        }
      });
    };

    const tryRender = async () => {
      if (!isMounted || !ref.current) return;
      if (window.MathJax?.typesetPromise) {
        try {
          ref.current.innerHTML = toInline(text);
          window.MathJax.typesetClear?.([ref.current]);
          await window.MathJax.typesetPromise([ref.current]);
          if (isMounted && ref.current) applyContainerStyles(ref.current);
        } catch (err) {
          console.warn('[MathJax] render error:', err);
          if (isMounted && ref.current) ref.current.innerHTML = text;
        }
      } else if (attempts < 25) {
        attempts++;
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
      style={{ wordBreak: 'break-word', overflowWrap: 'break-word', minWidth: 0, lineHeight: 1.6 }}
    />
  );
}
