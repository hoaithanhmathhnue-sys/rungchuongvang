import { useEffect, useRef, useState } from 'react';

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
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let attempts = 0;
    const maxAttempts = 20;

    const tryRender = async () => {
      if (!isMounted || !ref.current) return;

      if (window.MathJax && window.MathJax.typesetPromise) {
        try {
          // Cập nhật nội dung HTML trước
          ref.current.innerHTML = text;
          // Xoá cache MathJax cũ trên element này
          if (window.MathJax.typesetClear) {
            window.MathJax.typesetClear([ref.current]);
          }
          // Render lại MathJax
          await window.MathJax.typesetPromise([ref.current]);
          if (isMounted) setRendered(true);
        } catch (err) {
          console.warn('[MathJax] Lỗi render:', err);
          // Vẫn hiển thị raw nếu lỗi
          if (isMounted && ref.current) ref.current.innerHTML = text;
        }
      } else if (attempts < maxAttempts) {
        // MathJax chưa load xong, thử lại sau 200ms
        attempts++;
        if (isMounted && ref.current) ref.current.innerHTML = text;
        setTimeout(tryRender, 200);
      }
    };

    setRendered(false);
    tryRender();

    return () => {
      isMounted = false;
    };
  }, [text]);

  // Render element với ref, không dùng dangerouslySetInnerHTML song song với ref innerHTML
  return (
    <Tag
      ref={ref as any}
      className={className}
      style={{ visibility: 'visible' }}
    />
  );
}
