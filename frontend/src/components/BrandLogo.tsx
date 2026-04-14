import { Link } from 'react-router-dom';

import { useSite } from './SiteProvider';

interface BrandLogoProps {
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  sizes?: string;
}

export default function BrandLogo({
  className = '',
  imageClassName = '',
}: BrandLogoProps) {
  const { siteName } = useSite();

  return (
    <Link
      to='/'
      className={`group inline-flex min-w-0 items-center gap-3 ${className}`.trim()}
      aria-label={siteName}
    >
      <span
        className={`relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#d4af37]/45 bg-[radial-gradient(circle_at_top,_rgba(240,185,11,0.45),_rgba(54,42,8,0.95))] shadow-[0_18px_36px_rgba(0,0,0,0.28)] ${imageClassName}`.trim()}
      >
        <span className='absolute inset-y-1 left-1 w-1 rounded-full bg-black/55' />
        <span className='absolute inset-y-1 right-1 w-1 rounded-full bg-black/55' />
        <span className='h-4 w-4 rotate-45 rounded-[0.35rem] border border-black/20 bg-black/85 shadow-[0_0_22px_rgba(0,0,0,0.35)]' />
      </span>

      <span className='min-w-0'>
        <span className='block truncate text-sm font-semibold tracking-[0.28em] text-[#f0b90b] transition-colors group-hover:text-[#ffe08a]'>
          {siteName}
        </span>
      </span>
    </Link>
  );
}
