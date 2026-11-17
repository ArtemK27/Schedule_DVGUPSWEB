import React from 'react';
import { ChevronDown, Code2, RefreshCw, RotateCcw } from 'lucide-react';
import { CurrentStatusInfo, CurrentStatusType } from '../data/scheduleModels';

interface CurrentStatusBannerProps {
  selectedGroup: string;
  studentDefaultGroup: string;
  isLoading: boolean;
  status: CurrentStatusInfo;
  isDark: boolean;
  onGroupClick: () => void;
  onReturnToMyGroupClick: () => void;
  onRefreshClick: () => void;
  onDebugClick: () => void;
}

export const CurrentStatusBanner: React.FC<CurrentStatusBannerProps> = ({
  selectedGroup,
  studentDefaultGroup,
  isLoading,
  status,
  isDark,
  onGroupClick,
  onReturnToMyGroupClick,
  onRefreshClick,
  onDebugClick,
}) => {
  const isViewingForeignGroup =
    studentDefaultGroup.trim().length > 0 &&
    selectedGroup.trim().toUpperCase() !== studentDefaultGroup.trim().toUpperCase();

  const showLivePill =
    status.type === CurrentStatusType.ACTIVE_LESSON ||
    status.type === CurrentStatusType.UPCOMING_BREAK;

  const isLive = status.type === CurrentStatusType.ACTIVE_LESSON;

  return (
    <div className="w-full px-4 pt-2 pb-1.5 select-none">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <button
            type="button"
            onClick={onGroupClick}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0E8158] hover:bg-[#0A6343] active:scale-[0.98] transition-all px-3.5 py-2 text-white font-bold text-[15px] leading-none shadow-sm cursor-pointer"
          >
            <span className="truncate max-w-[140px]">
              {selectedGroup || 'Выбрать группу'}
            </span>
            <ChevronDown className="w-4 h-4 opacity-90 shrink-0" />
          </button>

          {isViewingForeignGroup && (
            <button
              type="button"
              onClick={onReturnToMyGroupClick}
              className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold border transition-all active:scale-95 cursor-pointer ${
                isDark
                  ? 'bg-[#0E8158]/20 border-[#34D399]/40 text-[#34D399]'
                  : 'bg-[#0E8158]/12 border-[#0E8158]/35 text-[#0E8158]'
              }`}
              title={`Вернуться к моей группе (${studentDefaultGroup})`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>К {studentDefaultGroup}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onRefreshClick}
            disabled={isLoading}
            aria-label="Обновить расписание"
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
              isDark
                ? 'bg-[#172923] text-[#E6F2ED] hover:bg-[#1E352D]'
                : 'bg-[#EBEAE4] text-[#1B2421] hover:bg-[#DFDDD5]'
            }`}
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#34D399]' : ''}`}
            />
          </button>

          <button
            type="button"
            onClick={onDebugClick}
            aria-label="Инспектор API"
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
              isDark
                ? 'bg-[#172923]/75 text-[#8AA39B] hover:text-[#E6F2ED]'
                : 'bg-[#EBEAE4]/80 text-[#5A6863] hover:text-[#1B2421]'
            }`}
          >
            <Code2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showLivePill && (
        <div
          className={`mt-2 flex items-center justify-between gap-2 rounded-xl px-3 py-2 border transition-colors ${
            isLive
              ? isDark
                ? 'bg-[#0E8158]/20 border-[#0E8158]/50 text-[#E6F2ED]'
                : 'bg-[#0E8158]/12 border-[#0E8158]/35 text-[#1B2421]'
              : isDark
              ? 'bg-[#172923]/90 border-[#264B3E]/70 text-[#E6F2ED]'
              : 'bg-[#EBEAE4]/90 border-[#0E8158]/25 text-[#1B2421]'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isLive ? 'bg-[#34D399] animate-pulse' : 'bg-[#D97706]'
              }`}
            />
            <span className="text-xs font-semibold truncate">
              {status.headline} • {status.subline}
            </span>
          </div>

          {typeof status.remainingMinutes === 'number' && (
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                isLive
                  ? 'bg-[#0E8158] text-white'
                  : isDark
                  ? 'bg-[#D97706]/25 text-[#FBBF24]'
                  : 'bg-[#D97706]/20 text-[#B45309]'
              }`}
            >
              {status.remainingMinutes} мин
            </span>
          )}
        </div>
      )}
    </div>
  );
};
