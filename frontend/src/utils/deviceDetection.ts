/**
 * Device detection utilities
 */

export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check screen width
  const isSmallScreen = window.innerWidth <= 768;
  
  // Check user agent
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  
  // Check touch capability
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  return isSmallScreen || (isMobileUA && isTouchDevice);
};

export const isTabletDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const isTabletUA = /iPad|Android/i.test(navigator.userAgent) && 
                     window.innerWidth > 768 && 
                     window.innerWidth <= 1024;
  
  return isTabletUA;
};

export const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  if (isMobileDevice()) return 'mobile';
  if (isTabletDevice()) return 'tablet';
  return 'desktop';
};
