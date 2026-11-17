import React from 'react';
import { CheckCircle2, Circle, Coffee, ExternalLink, MapPin, User, Users } from 'lucide-react';
import {
  HOMEWORK_TAG_META,
  LESSON_CATEGORY_META,
  LessonItem,
} from '../data/scheduleModels';
import {
  formatShortRoom,
  formatTeacherWithInitials,
} from '../data/subjectAbbreviations';

interface LessonTimelineCardProps {
  lesson: LessonItem;
  isActiveNow: boolean;
  isDark: boolean;
  onClick: () => void;
}

export const LessonTimelineCard: React.FC<LessonTimelineCardProps> = ({
  lesson,
  isActiveNow,
  isDark,
  onClick,
}) => {
  const categoryMeta = LESSON_CATEGORY_META[lesson.category];
  const shortTeacher = formatTeacherWithInitials(lesson.teacher);
  const shortRoom = formatShortRoom(lesson.room);
  const hasHomework = Boolean(lesson.homeworkText && lesson.homeworkText.trim().length > 0);
  const hwMeta = HOMEWORK_TAG_META[lesson.homeworkColorTag];
  const hwHex = isDark ? hwMeta.darkHex : hwMeta.lightHex;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="w-full flex items-stretch gap-3 text-left select-none cursor-pointer group active:scale-[0.992] transition-transform"
    >
      <div className="w-[54px] shrink-0 pt-1 flex flex-col items-end">
        <span
          className={`font-mono text-[15px] font-bold leading-tight ${
            isActiveNow
              ? isDark
                ? 'text-[#34D399]'
                : 'text-[#0E8158]'
              : isDark
              ? 'text-[#E6F2ED]'
              : 'text-[#1B2421]'
          }`}
        >
          {lesson.startTime}
        </span>
        <span
          className={`font-mono text-[12px] mt-0.5 ${
            isDark ? 'text-[#8AA39B]' : 'text-[#5A6863]'
          }`}
        >
          {lesson.endTime}
        </span>

        <span
          className={`mt-2 inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
            isActiveNow
              ? 'bg-[#0E8158] text-white'
              : isDark
              ? 'bg-[#172923] text-[#8AA39B]'
              : 'bg-[#EBEAE4] text-[#5A6863]'
          }`}
        >
          {lesson.pairNumber} пара
        </span>
      </div>

      <div
        className="w-[4.5px] shrink-0 rounded-full my-1"
        style={{ backgroundColor: categoryMeta.colorHex }}
      />

      <div
        className={`flex-1 min-w-0 rounded-2xl p-3.5 border transition-colors ${
          isActiveNow
            ? isDark
              ? 'bg-[#152D24]/90 border-[#34D399]/60 shadow-[0_4px_20px_rgba(14,129,88,0.2)]'
              : 'bg-[#FAF9F5] border-[#0E8158]/60 shadow-sm'
            : isDark
            ? 'bg-[#14241E]/80 border-[#28473C]/65 hover:border-[#34D399]/35'
            : 'bg-[#FAF9F5] border-[#0E8158]/15 hover:border-[#0E8158]/35 shadow-[0_1px_4px_rgba(0,0,0,0.03)]'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            <span
              className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold"
              style={{
                backgroundColor: `${categoryMeta.colorHex}22`,
                color: categoryMeta.colorHex,
              }}
            >
              {lesson.lessonType || categoryMeta.label}
            </span>

            {isActiveNow && (
              <span className="inline-flex items-center gap-1 rounded-md bg-[#0E8158] px-2 py-0.5 text-[10px] font-bold text-white">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                СЕЙЧАС
              </span>
            )}
          </div>

          {shortRoom && (
            <span
              className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-semibold shrink-0 ${
                isDark
                  ? 'bg-[#1D352C] text-[#A7F3D0]'
                  : 'bg-[#E1EFE9] text-[#0A6343]'
              }`}
            >
              <MapPin className="w-3 h-3 opacity-80" />
              {shortRoom}
            </span>
          )}
        </div>

        <h3
          className={`mt-2 text-[16px] font-bold leading-snug break-words ${
            isDark ? 'text-[#E6F2ED]' : 'text-[#1B2421]'
          }`}
        >
          {lesson.shortSubject}
        </h3>

        <div className="mt-2 flex flex-col gap-1">
          {shortTeacher && (
            <div
              className={`flex items-center gap-1.5 text-[12px] ${
                isDark ? 'text-[#8AA39B]' : 'text-[#5A6863]'
              }`}
            >
              <User className="w-3.5 h-3.5 shrink-0 opacity-75" />
              <span className="truncate">{shortTeacher}</span>
            </div>
          )}

          {lesson.groups && (
            <div
              className={`flex items-center gap-1.5 text-[11px] ${
                isDark ? 'text-[#8AA39B]/80' : 'text-[#5A6863]/85'
              }`}
            >
              <Users className="w-3 h-3 shrink-0 opacity-70" />
              <span className="truncate">{lesson.groups}</span>
            </div>
          )}
        </div>

        {lesson.onlineLink && (
          <div className="mt-2.5">
            <a
              href={lesson.onlineLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0E8158]/20 border border-[#0E8158]/40 px-2.5 py-1 text-xs font-semibold text-[#34D399] hover:bg-[#0E8158]/30"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Онлайн-ссылка</span>
            </a>
          </div>
        )}

        {hasHomework && (
          <div
            className="mt-2.5 rounded-xl px-2.5 py-2 border flex items-start gap-2"
            style={{
              backgroundColor: `${hwHex}16`,
              borderColor: `${hwHex}45`,
              opacity: lesson.isHomeworkCompleted ? 0.65 : 1,
            }}
          >
            {lesson.isHomeworkCompleted ? (
              <CheckCircle2
                className="w-4 h-4 shrink-0 mt-0.5"
                style={{ color: hwHex }}
              />
            ) : (
              <Circle
                className="w-4 h-4 shrink-0 mt-0.5"
                style={{ color: hwHex }}
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span
                  className="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.2 rounded"
                  style={{
                    backgroundColor: `${hwHex}28`,
                    color: hwHex,
                  }}
                >
                  {hwMeta.badgeLabel}
                </span>
                {lesson.isHomeworkCompleted && (
                  <span
                    className={`text-[10px] font-medium ${
                      isDark ? 'text-[#8AA39B]' : 'text-[#5A6863]'
                    }`}
                  >
                    Выполнено
                  </span>
                )}
              </div>
              <p
                className={`mt-0.5 text-[12.5px] font-medium leading-snug line-clamp-2 ${
                  lesson.isHomeworkCompleted ? 'line-through opacity-75' : ''
                } ${isDark ? 'text-[#E6F2ED]' : 'text-[#1B2421]'}`}
              >
                {lesson.homeworkText}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface LessonWindowBreakIndicatorProps {
  gapMinutes: number;
  isDark: boolean;
}

export const LessonWindowBreakIndicator: React.FC<
  LessonWindowBreakIndicatorProps
> = ({ gapMinutes, isDark }) => {
  const hours = Math.floor(gapMinutes / 60);
  const mins = gapMinutes % 60;
  const formatted =
    hours > 0 && mins > 0
      ? `${hours} ч ${mins} мин`
      : hours > 0
      ? `${hours} ч`
      : `${mins} мин`;

  return (
    <div className="w-full flex items-center gap-3 py-1 pl-[66px] select-none">
      <div
        className={`flex-1 flex items-center justify-center gap-2 rounded-xl border border-dashed py-1.5 px-3 text-xs font-semibold ${
          isDark
            ? 'border-[#264B3E] bg-[#10211B]/60 text-[#8AA39B]'
            : 'border-[#0E8158]/25 bg-[#E1EFE9]/50 text-[#5A6863]'
        }`}
      >
        <Coffee className="w-3.5 h-3.5 text-[#D97706]" />
        <span>Окно между парами • {formatted}</span>
      </div>
    </div>
  );
};
