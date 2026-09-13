import { RotateCcw, Terminal, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { type Achievement, playAchievementChime } from './achievements';

interface AchievementToastProps {
  achievement: Achievement | null;
  onDismiss: () => void;
}

export default function AchievementToast({ achievement, onDismiss }: AchievementToastProps) {
  const [isLeaving, setIsLeaving] = useState<boolean>(false);

  useEffect(() => {
    if (!achievement) return;

    setIsLeaving(false);
    playAchievementChime();

    const timer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(onDismiss, 450);
    }, 6500);

    return () => clearTimeout(timer);
  }, [achievement, onDismiss]);

  if (!achievement) return null;

  function handleClose() {
    setIsLeaving(true);
    setTimeout(onDismiss, 450);
  }

  function renderIcon() {
    if (!achievement) return null;
    switch (achievement.id) {
      case 'root_privilege':
        return <Terminal className="w-4 h-4 text-vsc-blue" />;
      case 'rm_rf':
        return <Trash2 className="w-4 h-4 text-red-400" />;
      case 'cold_reboot':
        return <RotateCcw className="w-4 h-4 text-emerald-400" />;
      default:
        return <Terminal className="w-4 h-4 text-vsc-blue" />;
    }
  }

  return (
    <div
      className={`fixed bottom-8 inset-x-0 mx-auto w-fit z-[100] pointer-events-auto select-none font-mono flex justify-center px-4 ${
        isLeaving ? 'animate-xboxPopOut pointer-events-none' : 'animate-xboxPopIn'
      }`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center rounded-2xl sm:rounded-full bg-vsc-card/95 backdrop-blur-md border border-vsc-border pl-1.5 pr-3 sm:pr-4 py-2 gap-3 shadow-2xl shadow-black/80 max-w-[92vw] sm:max-w-2xl">
        {/* Xbox style circular jewel adapted to VS Code theme */}
        <div className="relative flex-shrink-0 w-10 h-10 rounded-full bg-vsc-bar border border-vsc-border-subtle flex items-center justify-center shadow-inner">
          <div className="w-8 h-8 rounded-full border border-vsc-blue/40 bg-vsc-window flex items-center justify-center">
            {renderIcon()}
          </div>
        </div>

        {/* Expanding horizontal banner tray */}
        <div className="overflow-hidden animate-xboxExpand flex-1 min-w-0">
          <div className="animate-xboxTextReveal pr-1">
            <div className="flex items-center gap-1.5 text-xs leading-tight">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-vsc-blue shrink-0">
                Achievement Unlocked
              </span>
              <span className="text-vsc-fg-subtle shrink-0">·</span>
              <span className="font-bold text-vsc-fg-bright shrink-0">{achievement.title}</span>
            </div>
            <p className="text-[11px] text-vsc-fg-muted leading-tight mt-0.5 whitespace-normal sm:whitespace-nowrap">
              {achievement.description}
            </p>
          </div>
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          className="text-vsc-fg-subtle hover:text-vsc-fg-bright p-1 rounded-full transition-colors cursor-pointer shrink-0 ml-1"
          aria-label="Dismiss achievement"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
