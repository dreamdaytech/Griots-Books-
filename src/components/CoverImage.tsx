import { useState } from 'react';
import { BookOpen } from 'lucide-react';

interface CoverImageProps {
  src?: string;
  alt: string;
  title?: string;
  className?: string;
}

export function CoverImage({ src, alt, title, className = '' }: CoverImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#22170D] via-[#533714] to-[#946000] text-white p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <BookOpen className="w-8 h-8 opacity-80 mb-3" />
        {title && (
          <p className="font-serif text-sm font-medium leading-snug line-clamp-3">
            {title}
          </p>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
