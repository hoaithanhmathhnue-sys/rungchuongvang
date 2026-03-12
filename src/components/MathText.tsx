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
    let timeoutId: number;
    let isMounted = true;

    const renderMath = async () => {
      if (!ref.current || !isMounted) return;
      
      if (window.MathJax && window.MathJax.typesetPromise) {
        try {
          if (window.MathJax.typesetClear) {
            window.MathJax.typesetClear([ref.current]);
          }
          if (isMounted) ref.current.innerHTML = text;
          await window.MathJax.typesetPromise([ref.current]);
        } catch (err: any) {
          console.warn('[MathJax] Typeset error:', err);
        }
      } else {
        // Tạm thời hiển thị raw, thử gọi lại sau 200ms
        if (isMounted) ref.current.innerHTML = text;
        timeoutId = window.setTimeout(renderMath, 300);
      }
    };

    renderMath();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [text]);

  return <Tag ref={ref as any} className={className} dangerouslySetInnerHTML={{ __html: text }} />;
}
