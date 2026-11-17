import React, { useRef, useState } from 'react';
import {
  ArrowLeft,
  CalendarOff,
  GraduationCap,
  MapPin,
  Search,
  Sparkles,
} from 'lucide-react';
import {
  CurrentStatusInfo,
  DaySchedule,
  LessonItem,
  LookupModeType,
  ScheduleLookupTarget,
} from '../data/scheduleModels';
import { formatDateTimeRu } from '../data/dateUtils';
import { CurrentStatusBanner } from './CurrentStatusBanner';
import { DaySelectorStrip } from './DaySelectorStrip';
import {
  LessonTimelineCard,
  LessonWindowBreakIndicator,
} from './LessonTimelineCard';

interface ScheduleTabProps {
  selectedGroup: string;
  studentDefaultGroup: string;
  isLoading: boolean;
  status: CurrentStatusInfo;
  weekBannerText: string;
  weekDays: DaySchedule[];
  selectedDateIso: string;
  todayIso: string;
  lastUpdatedTimestamp: number;
  activeLookupTarget: ScheduleLookupTarget | null;
  lookupWeekOffset: number;
  isDark: boolean;
  onSelectDateIso: (dateIso: string) => void;
  onGroupClick: () => void;
  onReturnToMyGroupClick: () => void;
  onRefreshClick: () => void;
  onDebugClick: () => void;
  onWeekBarClick: () => void;
  onLessonClick: (lesson: LessonItem) => void;
  onOpenLookupSheet: () => void;
  onClearLookupMode: () => void;
  onSelectLookupWeekOffset: (offset: number) => void;
}

export const ScheduleTab: React.FC<ScheduleTabProps> = ({
  selectedGroup,
  studentDefaultGroup,
  isLoading,
  status,
  weekBannerText,
  weekDays,
  selectedDateIso,
  todayIso,
  lastUpdatedTimestamp,
  activeLookupTarget,
  lookupWeekOffset,
  isDark,
  onSelectDateIso,
  onGroupClick,
  onReturnToMyGroupClick,
  onRefreshClick,
  onDebugClick,
  onWeekBarClick,
  onLessonClick,
  onOpenLookupSheet,
  onClearLookupMode,
  onSelectLookupWeekOffset,
}) => {
  const displayDays = weekDays.slice(0, 6);
  const activeDayIndex = Math.max(
    0,
    displayDays.findIndex((d) => d.dateIso === selectedDateIso)
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; lockedAxis: 'x' | 'y' | null }>({
    x: 0,
    y: 0,
    lockedAxis: null,
  });
  const [dragOffsetPx, setDragOffsetPx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const containerWidth = containerRef.current?.clientWidth || 390;
  const fractionalIndex = Math.max(
    0,
    Math.min(
      Math.max(displayDays.length - 1, 0),
      activeDayIndex - dragOffsetPx / Math.max(containerWidth, 1)
    )
  );

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      lockedAxis: null,
    };
    setIsDragging(false);
    setDragOffsetPx(0);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - touchStartRef.current.x;
    const dy = e.touches[0].clientY - touchStartRef.current.y;

    if (!touchStartRef.current.lockedAxis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      touchStartRef.current.lockedAxis = Math.abs(dx) > Math.abs(dy) * 1.15 ? 'x' : 'y';
    }

    if (touchStartRef.current.lockedAxis === 'x') {
      setIsDragging(true);
      const atStart = activeDayIndex === 0 && dx > 0;
      const atEnd = activeDayIndex === displayDays.length - 1 && dx < 0;
      setDragOffsetPx(atStart || atEnd ? dx * 0.28 : dx);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) {
      setDragOffsetPx(0);
      return;
    }
    const threshold = Math.min(72, containerWidth * 0.18);
    let nextIdx = activeDayIndex;
    if (dragOffsetPx < -threshold && activeDayIndex < displayDays.length - 1) {
      nextIdx = activeDayIndex + 1;
    } else if (dragOffsetPx > threshold && activeDayIndex > 0) {
      nextIdx = activeDayIndex - 1;
    }
    setIsDragging(false);
    setDragOffsetPx(0);
    const targetDay = displayDays[nextIdx];
    if (targetDay && targetDay.dateIso !== selectedDateIso) {
      onSelectDateIso(targetDay.dateIso);
    }
  };

  const formattedUpdatedTime = formatDateTimeRu(lastUpdatedTimestamp);

  return (
    <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden">
      {activeLookupTarget ? (
        <div className="px-4 pt-2 pb-1.5 select-none">
          <div
            className={`rounded-2xl p-3 border ${
              isDark
                ? 'bg-[#132820] border-[#34D399]/40'
                : 'bg-[#E1EFE9] border-[#0E8158]/35'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#0E8158] text-white flex items-center justify-center shrink-0">
                  {activeLookupTarget.type === LookupModeType.TEACHER ? (
                    <GraduationCap className="w-5 h-5" />
                  ) : (
                    <MapPin className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <div
                    className={`text-[11px] font-bold uppercase tracking-wider ${
                      isDark ? 'text-[#34D399]' : 'text-[#0E8158]'
                    }`}
                  >
                    {activeLookupTarget.type === LookupModeType.TEACHER
                      ? 'Расписание преподавателя'
                      : 'Расписание аудитории'}
                  </div>
                  <div
                    className={`text-[15px] font-bold truncate ${
                      isDark ? 'text-[#E6F2ED]' : 'text-[#1B2421]'
                    }`}
                  >
                    {activeLookupTarget.title}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onClearLookupMode}
                className="inline-flex items-center gap-1 rounded-xl bg-[#0E8158] px-3 py-1.5 text-xs font-bold text-white active:scale-95 transition-transform shrink-0 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>К группе</span>
              </button>
            </div>

            <div className="mt-2.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSelectLookupWeekOffset(0)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  lookupWeekOffset === 0
                    ? 'bg-[#0E8158] text-white'
                    : isDark
                    ? 'bg-[#0C1914] text-[#8AA39B]'
                    : 'bg-[#FAF9F5] text-[#5A6863]'
                }`}
              >
                Текущая неделя
              </button>
              <button
                type="button"
                onClick={() => onSelectLookupWeekOffset(1)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  lookupWeekOffset === 1
                    ? 'bg-[#0E8158] text-white'
                    : isDark
                    ? 'bg-[#0C1914] text-[#8AA39B]'
                    : 'bg-[#FAF9F5] text-[#5A6863]'
                }`}
              >
                Следующая неделя
              </button>
            </div>
          </div>
        </div>
      ) : (
        <CurrentStatusBanner
          selectedGroup={selectedGroup}
          studentDefaultGroup={studentDefaultGroup}
          isLoading={isLoading}
          status={status}
          isDark={isDark}
          onGroupClick={onGroupClick}
          onReturnToMyGroupClick={onReturnToMyGroupClick}
          onRefreshClick={onRefreshClick}
          onDebugClick={onDebugClick}
        />
      )}

      <DaySelectorStrip
        weekBannerText={weekBannerText}
        days={displayDays}
        selectedDateIso={selectedDateIso}
        todayIso={todayIso}
        swipeProgressIndex={fractionalIndex}
        isDark={isDark}
        onDaySelect={(dateIso) => onSelectDateIso(dateIso)}
        onWeekBarClick={onWeekBarClick}
      />

      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="flex-1 min-h-0 overflow-hidden relative"
      >
        <div
          className={`h-full flex gpu-swiper-track ${
            isDragging ? '' : 'transition-transform duration-300 ease-out'
          }`}
          style={{
            width: `${displayDays.length * 100}%`,
            transform: `translate3d(calc(${
              -activeDayIndex * (100 / Math.max(displayDays.length, 1))
            }% + ${dragOffsetPx}px), 0, 0)`,
          }}
        >
          {displayDays.map((day) => {
            const dayLessons = day.lessons;
            return (
              <div
                key={day.dateIso}
                style={{ width: `${100 / Math.max(displayDays.length, 1)}%` }}
                className="h-full overflow-y-auto no-scrollbar px-4 pt-1 pb-24 overscroll-y-contain"
              >
                <div className="flex items-baseline justify-between gap-2 mb-3 select-none">
                  <h2
                    className={`text-[17px] font-extrabold tracking-tight ${
                      isDark ? 'text-[#E6F2ED]' : 'text-[#1B2421]'
                    }`}
                  >
                    {day.dayOfWeekFull}, {day.dayMonthFormatted}
                  </h2>
                  <span
                    className={`text-[11px] font-medium shrink-0 ${
                      isDark ? 'text-[#8AA39B]' : 'text-[#5A6863]'
                    }`}
                  >
                    Актуально на: {formattedUpdatedTime}
                  </span>
                </div>

                {dayLessons.length === 0 ? (
                  <div
                    className={`mt-4 rounded-3xl p-8 border flex flex-col items-center justify-center text-center select-none ${
                      isDark
                        ? 'bg-[#111F1A]/75 border-[#264B3E]/60'
                        : 'bg-[#FAF9F5] border-[#0E8158]/15'
                    }`}
                  >
                    <div className="w-16 h-16 rounded-2xl bg-[#0E8158]/15 flex items-center justify-center text-[#34D399] mb-3">
                      <CalendarOff className="w-8 h-8 text-[#0E8158]" />
                    </div>
                    <h3
                      className={`text-base font-bold ${
                        isDark ? 'text-[#E6F2ED]' : 'text-[#1B2421]'
                      }`}
                    >
                      В этот день занятий нет
                    </h3>
                    <p
                      className={`mt-1 text-xs max-w-[240px] leading-relaxed ${
                        isDark ? 'text-[#8AA39B]' : 'text-[#5A6863]'
                      }`}
                    >
                      Свободный от пар день — отличное время для отдыха или закрытия домашних заданий.
                    </p>
                    <div
                      className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${
                        isDark
                          ? 'bg-[#172923] text-[#34D399]'
                          : 'bg-[#E1EFE9] text-[#0E8158]'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Свайпните влево или вправо для других дней</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {dayLessons.map((lesson, idx) => {
                      const prevLesson = idx > 0 ? dayLessons[idx - 1] : null;
                      const gapMinutes = prevLesson
                        ? lesson.startMinutes - prevLesson.endMinutes
                        : 0;
                      const isActiveNow =
                        day.dateIso === todayIso &&
                        status.activeLessonId === lesson.id;

                      return (
                        <React.Fragment key={lesson.id}>
                          {gapMinutes >= 30 && (
                            <LessonWindowBreakIndicator
                              gapMinutes={gapMinutes}
                              isDark={isDark}
                            />
                          )}
                          <LessonTimelineCard
                            lesson={lesson}
                            isActiveNow={isActiveNow}
                            isDark={isDark}
                            onClick={() => onLessonClick(lesson)}
                          />
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenLookupSheet}
        aria-label="Поиск по преподавателю или аудитории"
        className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom,0px)+82px)] z-20 w-13 h-13 rounded-2xl bg-[#0E8158] hover:bg-[#0A6343] active:scale-95 text-white shadow-[0_6px_20px_rgba(14,129,88,0.45)] flex items-center justify-center transition-all cursor-pointer"
      >
        <Search className="w-5 h-5" />
      </button>
    </div>
  );
};
