import Image from 'next/image';
import Link from 'next/link';

interface BrandLogoProps {
  href?: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  sizes?: string;
}

const BrandLogo = ({
  href = '/',
  className = '',
  imageClassName = '',
  priority = false,
  sizes = '240px',
}: BrandLogoProps) => {
  const logoImage = (
    <Image
      src='/logo_bg.png'
      alt='天下影视 Logo'
      width={965}
      height={274}
      priority={priority}
      sizes={sizes}
      className={`h-auto w-full ${imageClassName}`.trim()}
    />
  );

  if (!href) {
    return <div className={className}>{logoImage}</div>;
  }

  return (
    <Link
      href={href}
      aria-label='返回首页'
      className={`block select-none transition-opacity duration-200 hover:opacity-85 ${className}`.trim()}
    >
      {logoImage}
    </Link>
  );
};

export default BrandLogo;
