import React from 'react';
import { ChevronDown } from 'lucide-react';
import { DaySchedule, HOMEWORK_TAG_META } from '../data/scheduleModels';

interface DaySelectorStripProps {
  weekBannerText: string;
  days: DaySchedule[];
  selectedDateIso: string;
  todayIso: string;
  swipeProgressIndex: number;
  isDark: boolean;
  onDaySelect: (dateIso: string, index: number) => void;
  onWeekBarClick: () => void;
}

export const DaySelectorStrip: React.FC<DaySelectorStripProps> = ({
  weekBannerText,
  days,
  selectedDateIso,
  todayIso,
  swipeProgressIndex,
  isDark,
  onDaySelect,
  onWeekBarClick,
}) => {
  const displayDays = days.slice(0, 6);
  const count = Math.max(displayDays.length, 1);
  const clampedIndex = Math.max(0, Math.min(count - 1, swipeProgressIndex));

  return (
    <div className="w-full px-4 pt-1 pb-2 select-none">
      <button
        type="button"
        onClick={onWeekBarClick}
        className={`w-full rounded-[14px] px-3.5 py-2.5 border flex items-center justify-center gap-1.5 transition-all active:scale-[0.99] cursor-pointer ${
          isDark
            ? 'bg-[#10241D] border-[#264B3E] text-[#8AA39B] hover:text-[#E6F2ED]'
            : 'bg-[#E1EFE9] border-[#0E8158]/25 text-[#4A6B5D] hover:text-[#1B2421]'
        }`}
      >
        <span className="text-[13px] font-semibold tracking-tight truncate">
          {weekBannerText}
        </span>
        <ChevronDown className="w-4 h-4 shrink-0 opacity-80" />
      </button>

      {displayDays.length > 0 && (
        <div className="relative mt-2.5 grid grid-cols-6 items-start">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-[21px] left-0 h-9 flex items-center justify-center transition-transform duration-150 ease-out"
            style={{
              width: `${100 / count}%`,
              transform: `translate3d(${clampedIndex * 100}%, 0, 0)`,
              willChange: 'transform',
            }}
          >
            <div className="w-9 h-9 rounded-full bg-[#0E8158] shadow-[0_2px_10px_rgba(14,129,88,0.45)]" />
          </div>

          {displayDays.map((day, idx) => {
            const isSelected = day.dateIso === selectedDateIso;
            const isToday = day.dateIso === todayIso;
            const hwLessons = day.lessons.filter(
              (l) => l.homeworkText && l.homeworkText.trim().length > 0
            );
            const hasClasses = day.lessons.length > 0;

            return (
              <button
                key={day.dateIso}
                type="button"
                onClick={() => onDaySelect(day.dateIso, idx)}
                className="relative z-10 flex flex-col items-center py-0.5 cursor-pointer focus:outline-none group"
              >
                <span
                  className={`text-[11px] font-semibold tracking-wide transition-colors ${
                    isSelected
                      ? isDark
                        ? 'text-[#34D399] font-bold'
                        : 'text-[#0E8158] font-bold'
                      : isDark
                      ? 'text-[#8AA39B]'
                      : 'text-[#5A6863]'
                  }`}
                >
                  {day.dayOfWeekShort}
                </span>

                <div className="mt-1 w-9 h-9 rounded-full flex items-center justify-center relative">
                  {isToday && !isSelected && (
                    <span
                      className={`absolute inset-0 rounded-full border-2 ${
                        isDark ? 'border-[#34D399]/60' : 'border-[#0E8158]/60'
                      }`}
                    />
                  )}
                  <span
                    className={`text-[15px] leading-none transition-colors ${
                      isSelected
                        ? 'text-white font-bold'
                        : isToday
                        ? isDark
                          ? 'text-[#34D399] font-bold'
                          : 'text-[#0E8158] font-bold'
                        : isDark
                        ? 'text-[#E6F2ED] font-medium'
                        : 'text-[#1B2421] font-medium'
                    }`}
                  >
                    {day.dayNumber}
                  </span>
                </div>

                <div className="mt-1 h-2 flex items-center justify-center gap-0.5">
                  {hwLessons.length > 0 ? (
                    hwLessons.slice(0, 3).map((hwLesson) => {
                      const meta = HOMEWORK_TAG_META[hwLesson.homeworkColorTag];
                      const hex = isDark ? meta.darkHex : meta.lightHex;
                      return (
                        <span
                          key={hwLesson.id}
                          className="w-1.5 h-1.5 rounded-full transition-opacity"
                          style={{
                            backgroundColor: hex,
                            opacity: hwLesson.isHomeworkCompleted ? 0.35 : 1,
                          }}
                        />
                      );
                    })
                  ) : hasClasses ? (
                    <span
                      className={`w-1 h-1 rounded-full ${
                        isSelected
                          ? isDark
                            ? 'bg-[#34D399]/80'
                            : 'bg-[#0E8158]/80'
                          : isDark
                          ? 'bg-[#8AA39B]/35'
                          : 'bg-[#5A6863]/35'
                      }`}
                    />
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
