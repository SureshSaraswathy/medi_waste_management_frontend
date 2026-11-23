import { CSSProperties } from 'react';
import { useBranding } from '../../context/BrandingContext';

interface AppLogoImageProps {
  maxHeight?: number;
  style?: CSSProperties;
  className?: string;
}

/**
 * Renders the configured Application Logo, or NOTHING when none is configured,
 * so the surrounding screen keeps its existing look by default.
 */
const AppLogoImage = ({ maxHeight = 56, style, className }: AppLogoImageProps) => {
  const { logoUrl } = useBranding();
  if (!logoUrl) return null;
  return (
    <img
      src={logoUrl}
      alt="Application logo"
      className={`app-logo-image ${className || ''}`.trim()}
      style={{ maxHeight, width: 'auto', ...style }}
    />
  );
};

export default AppLogoImage;
