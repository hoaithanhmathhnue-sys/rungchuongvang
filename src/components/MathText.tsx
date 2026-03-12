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
}

/**
 * Component render text có chứa công thức toán MathJax.
 * Hỗ trợ inline math: $...$  và display math: $$...$$
 */
export default function MathText({ text, className = '', tag: Tag = 'span' }: MathTextProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (ref.current && window.MathJax) {
      // Reset content
      ref.current.innerHTML = text;
      // Typeset
      if (window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([ref.current]).catch((err: any) => {
          console.warn('[MathJax] Typeset error:', err);
        });
      }
    }
  }, [text]);

  return <Tag ref={ref as any} className={className} dangerouslySetInnerHTML={{ __html: text }} />;
}
