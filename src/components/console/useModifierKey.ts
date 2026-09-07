import { useEffect, useState } from 'react';

export function useModifierKey(): string {
  const [modifierKey, setModifierKey] = useState<string>('⌘');

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      const isMac = /(Mac|iPhone|iPod|iPad)/i.test(
        (navigator as any).userAgentData?.platform ||
          navigator.platform ||
          navigator.userAgent ||
          ''
      );
      if (!isMac) {
        setModifierKey('Ctrl');
      }
    }
  }, []);

  return modifierKey;
}
