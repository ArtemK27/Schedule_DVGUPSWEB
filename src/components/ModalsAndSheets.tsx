import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  Code2,
  ExternalLink,
  GraduationCap,
  MapPin,
  Search,
  Star,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';
import { formatShortDayAndMonth } from '../data/dateUtils';
import {
  AcademicWeekOption,
  AuditoriumDirectoryItem,
  HOMEWORK_TAG_META,
  HomeworkColorTag,
  LESSON_CATEGORY_META,
  LessonItem,
  LookupModeType,
  ScheduleLookupTarget,
  TeacherDirectoryItem,
} from '../data/scheduleModels';
import { cleanSubjectTitle, formatShortRoom } from '../data/subjectAbbreviations';

interface WeekPickerBottomSheetProps {
  weeks: AcademicWeekOption[];
  selectedWeekMondayIso: string;
  isDark: boolean;
  onSelectWeek: (mondayIso: string) => void;
  onJumpToToday: () => void;
  onClose: () => void;
}

export const WeekPickerBottomSheet: React.FC<WeekPickerBottomSheetProps> = ({
  weeks,
  selectedWeekMondayIso,
  isDark,
  onSelectWeek,
  onJumpToToday,
  onClose,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-end justify-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg rounded-t-3xl p-5 pb-safe-sheet border-t ${
          isDark
            ? 'bg-[#111F1A] border-[#264B3E] text-[#E6F2ED]'
            : 'bg-[#FAF9F5] border-[#0E8158]/20 text-[#1B2421]'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#34D399]" />
            <h3 className="text-lg font-extrabold">Учебная неделя</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full opacity-75 hover:opacity-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          {weeks.map((w) => {
            const isSelected = w.startIso === selectedWeekMondayIso;
            return (
              <button
                key={w.startIso}
                type="button"
                onClick={() => {
                  onSelectWeek(w.startIso);
                  onClose();
                }}
                className={`w-full rounded-2xl p-3.5 border text-left flex items-center justify-between transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#0E8158] border-[#34D399] text-white font-bold'
                    : isDark
                    ? 'bg-[#172923] border-[#264B3E] text-[#E6F2ED]'
                    : 'bg-[#EBEAE4] border-[#0E8158]/20 text-[#1B2421]'
                }`}
              >
                <span className="text-sm">{w.bannerText}</span>
                {isSelected && <Check className="w-4 h-4 shrink-0" />}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            onJumpToToday();
            onClose();
          }}
          className="mt-3 w-full rounded-2xl bg-[#0E8158]/20 border border-[#34D399]/40 py-3 text-xs font-extrabold text-[#34D399] cursor-pointer"
        >
          Вернуться к сегодняшнему дню
        </button>
      </div>
    </div>
  );
};

interface GroupSelectorBottomSheetProps {
  groups: string[];
  selectedGroup: string;
  studentDefaultGroup: string;
  isDark: boolean;
  onSelectGroup: (groupName: string) => void;
  onSetDefaultGroup: (groupName: string) => void;
  onClose: () => void;
}

export const GroupSelectorBottomSheet: React.FC<
  GroupSelectorBottomSheetProps
> = ({
  groups,
  selectedGroup,
  studentDefaultGroup,
  isDark,
  onSelectGroup,
  onSetDefaultGroup,
  onClose,
}) => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => g.toLowerCase().includes(q));
  }, [groups, query]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-end justify-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg rounded-t-3xl p-5 pb-safe-sheet border-t max-h-[85dvh] flex flex-col ${
          isDark
            ? 'bg-[#111F1A] border-[#264B3E] text-[#E6F2ED]'
            : 'bg-[#FAF9F5] border-[#0E8158]/20 text-[#1B2421]'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-extrabold">Выбор учебной группы</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full opacity-75 hover:opacity-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative mb-3">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-60" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск группы (например, БОМ21ПИА)..."
            className={`w-full rounded-xl pl-10 pr-4 py-2.5 text-base border focus:outline-none ${
              isDark
                ? 'bg-[#172923] border-[#264B3E] text-[#E6F2ED]'
                : 'bg-[#EBEAE4] border-[#0E8158]/25 text-[#1B2421]'
            }`}
          />
        </div>

        {query.trim().length >= 3 &&
          !groups.some((g) => g.toLowerCase() === query.trim().toLowerCase()) && (
            <button
              type="button"
              onClick={() => {
                onSelectGroup(query.trim().toUpperCase());
                onClose();
              }}
              className="mb-2 w-full rounded-xl bg-[#0E8158] p-3 text-xs font-bold text-white text-left cursor-pointer"
            >
              Открыть расписание группы «{query.trim().toUpperCase()}»
            </button>
          )}

        <div className="flex-1 overflow-y-auto no-scrollbar space-y-1.5 pr-1">
          {filtered.map((group) => {
            const isSelected =
              group.toUpperCase() === selectedGroup.toUpperCase();
            const isMyDefault =
              group.toUpperCase() === studentDefaultGroup.toUpperCase();
            return (
              <div
                key={group}
                className={`rounded-2xl p-3 border flex items-center justify-between gap-2 ${
                  isSelected
                    ? isDark
                      ? 'bg-[#17352B] border-[#34D399]'
                      : 'bg-[#E1EFE9] border-[#0E8158]'
                    : isDark
                    ? 'bg-[#172923]/80 border-[#264B3E]'
                    : 'bg-[#EBEAE4]/80 border-[#0E8158]/15'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelectGroup(group);
                    onClose();
                  }}
                  className="flex-1 text-left flex items-center gap-2.5 cursor-pointer"
                >
                  <span className="text-sm font-extrabold">{group}</span>
                  {isMyDefault && (
                    <span className="rounded-md bg-[#0E8158]/25 px-2 py-0.5 text-[10px] font-bold text-[#34D399]">
                      Моя группа
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onSetDefaultGroup(group)}
                  title="Сделать моей основной группой"
                  className={`p-1.5 rounded-lg cursor-pointer ${
                    isMyDefault
                      ? 'text-[#FBBF24]'
                      : 'opacity-45 hover:opacity-100'
                  }`}
                >
                  <Star
                    className="w-4 h-4"
                    fill={isMyDefault ? 'currentColor' : 'none'}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface LessonDetailBottomSheetProps {
  lesson: LessonItem;
  lessonsByDate: Record<string, LessonItem[]>;
  isDark: boolean;
  onSaveHomework: (
    lesson: LessonItem,
    text: string,
    colorTag: HomeworkColorTag,
    isCompleted: boolean
  ) => void;
  onTransferHomework: (
    fromLesson: LessonItem,
    toLesson: LessonItem,
    text: string,
    colorTag: HomeworkColorTag
  ) => void;
  onClose: () => void;
}

export const LessonDetailBottomSheet: React.FC<
  LessonDetailBottomSheetProps
> = ({
  lesson,
  lessonsByDate,
  isDark,
  onSaveHomework,
  onTransferHomework,
  onClose,
}) => {
  const [hwText, setHwText] = useState(lesson.homeworkText || '');
  const [colorTag, setColorTag] = useState<HomeworkColorTag>(
    lesson.homeworkColorTag || HomeworkColorTag.MINT
  );
  const [isCompleted, setIsCompleted] = useState<boolean>(
    Boolean(lesson.isHomeworkCompleted)
  );

  const categoryMeta = LESSON_CATEGORY_META[lesson.category];
  const shortRoom = formatShortRoom(lesson.room);

  const transferTargets = useMemo(() => {
    const cleanTarget = cleanSubjectTitle(lesson.rawSubject).toLowerCase();
    const dates = Object.keys(lessonsByDate).sort();
    const list: LessonItem[] = [];
    for (const d of dates) {
      for (const item of lessonsByDate[d] || []) {
        if (
          item.id !== lesson.id &&
          item.dateIso >= lesson.dateIso &&
          cleanSubjectTitle(item.rawSubject).toLowerCase() === cleanTarget
        ) {
          list.push(item);
        }
      }
    }
    return list.slice(0, 6);
  }, [lessonsByDate, lesson]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-end justify-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg rounded-t-3xl p-5 pb-safe-sheet border-t max-h-[90dvh] overflow-y-auto ${
          isDark
            ? 'bg-[#111F1A] border-[#264B3E] text-[#E6F2ED]'
            : 'bg-[#FAF9F5] border-[#0E8158]/20 text-[#1B2421]'
        }`}
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="rounded-lg px-2.5 py-1 text-xs font-extrabold"
              style={{
                backgroundColor: `${categoryMeta.colorHex}24`,
                color: categoryMeta.colorHex,
              }}
            >
              {lesson.lessonType || categoryMeta.label}
            </span>
            <span className="text-xs font-bold opacity-80">
              {formatShortDayAndMonth(lesson.dateIso)} • {lesson.pairNumber} пара (
              {lesson.startTime}–{lesson.endTime})
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full opacity-75 hover:opacity-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <h3 className="text-lg font-extrabold leading-snug">
          {lesson.rawSubject}
        </h3>

        <div
          className={`mt-3 rounded-2xl p-3 border space-y-1.5 text-xs ${
            isDark
              ? 'bg-[#172923]/80 border-[#264B3E]'
              : 'bg-[#EBEAE4] border-[#0E8158]/15'
          }`}
        >
          {lesson.teacher && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-[#34D399] shrink-0" />
              <span>{lesson.teacher}</span>
            </div>
          )}
          {shortRoom && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#34D399] shrink-0" />
              <span>{shortRoom}</span>
            </div>
          )}
          {lesson.groups && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#34D399] shrink-0" />
              <span>Группы: {lesson.groups}</span>
            </div>
          )}
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold uppercase tracking-wider opacity-80">
              Домашнее задание к паре
            </span>

            {hwText.trim().length > 0 && (
              <button
                type="button"
                onClick={() => setIsCompleted(!isCompleted)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#34D399] cursor-pointer"
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Circle className="w-4 h-4" />
                )}
                <span>{isCompleted ? 'Выполнено' : 'Отметить выполненным'}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1.5 mb-3">
            {[
              HomeworkColorTag.MINT,
              HomeworkColorTag.ORANGE,
              HomeworkColorTag.RED,
            ].map((tag) => {
              const meta = HOMEWORK_TAG_META[tag];
              const active = colorTag === tag;
              const hex = isDark ? meta.darkHex : meta.lightHex;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setColorTag(tag)}
                  className="rounded-xl py-2 px-2 text-[11px] font-extrabold border transition-all truncate cursor-pointer"
                  style={{
                    backgroundColor: active ? `${hex}28` : 'transparent',
                    borderColor: active ? hex : isDark ? '#264B3E' : '#D1D5DB',
                    color: active ? hex : undefined,
                  }}
                >
                  {meta.shortLabel}
                </button>
              );
            })}
          </div>

          <textarea
            rows={3}
            value={hwText}
            onChange={(e) => setHwText(e.target.value)}
            placeholder="Запишите домашнее задание, вопросы к зачёту или номер лабораторной..."
            className={`w-full rounded-2xl p-3.5 text-base border focus:outline-none ${
              isDark
                ? 'bg-[#172923] border-[#264B3E] text-[#E6F2ED] placeholder-[#8AA39B]/60'
                : 'bg-[#EBEAE4] border-[#0E8158]/25 text-[#1B2421] placeholder-[#5A6863]/60'
            }`}
          />

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onSaveHomework(lesson, hwText.trim(), colorTag, isCompleted);
                onClose();
              }}
              className="flex-1 rounded-2xl bg-[#0E8158] hover:bg-[#0A6343] py-3.5 text-sm font-extrabold text-white cursor-pointer"
            >
              Сохранить
            </button>

            {lesson.homeworkText && (
              <button
                type="button"
                onClick={() => {
                  onSaveHomework(lesson, '', colorTag, false);
                  onClose();
                }}
                aria-label="Удалить домашнее задание"
                className="rounded-2xl bg-[#EF4444]/15 border border-[#EF4444]/35 p-3.5 text-[#EF4444] cursor-pointer"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>

          {hwText.trim().length > 0 && transferTargets.length > 0 && (
            <div className="mt-4 pt-3 border-t border-[#264B3E]/50">
              <div className="text-[11px] font-bold uppercase tracking-wider opacity-75 mb-2">
                Перенести это ДЗ на следующую пару по предмету:
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {transferTargets.map((target) => (
                  <button
                    key={target.id}
                    type="button"
                    onClick={() => {
                      onTransferHomework(lesson, target, hwText.trim(), colorTag);
                      onClose();
                    }}
                    className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold border cursor-pointer ${
                      isDark
                        ? 'bg-[#172923] border-[#264B3E] text-[#34D399]'
                        : 'bg-[#E1EFE9] border-[#0E8158]/25 text-[#0E8158]'
                    }`}
                  >
                    {formatShortDayAndMonth(target.dateIso)} • {target.pairNumber} пара (
                    {target.lessonType})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface ScheduleLookupBottomSheetProps {
  teachers: TeacherDirectoryItem[];
  auditoriums: AuditoriumDirectoryItem[];
  isDark: boolean;
  onSelectLookupTarget: (target: ScheduleLookupTarget) => void;
  onClose: () => void;
}

export const ScheduleLookupBottomSheet: React.FC<
  ScheduleLookupBottomSheetProps
> = ({ teachers, auditoriums, isDark, onSelectLookupTarget, onClose }) => {
  const [tab, setTab] = useState<'TEACHER' | 'AUDITORIUM'>('TEACHER');
  const [query, setQuery] = useState('');

  const filteredTeachers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter((t) => t.name.toLowerCase().includes(q));
  }, [teachers, query]);

  const filteredAuditoriums = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return auditoriums;
    return auditoriums.filter((a) => a.name.toLowerCase().includes(q));
  }, [auditoriums, query]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-end justify-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg rounded-t-3xl p-5 pb-safe-sheet border-t max-h-[85dvh] flex flex-col ${
          isDark
            ? 'bg-[#111F1A] border-[#264B3E] text-[#E6F2ED]'
            : 'bg-[#FAF9F5] border-[#0E8158]/20 text-[#1B2421]'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-extrabold">Поиск по ДВГУПС</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full opacity-75 hover:opacity-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            type="button"
            onClick={() => setTab('TEACHER')}
            className={`rounded-xl py-2.5 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === 'TEACHER'
                ? 'bg-[#0E8158] text-white'
                : isDark
                ? 'bg-[#172923] text-[#8AA39B]'
                : 'bg-[#EBEAE4] text-[#5A6863]'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Преподаватели</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('AUDITORIUM')}
            className={`rounded-xl py-2.5 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === 'AUDITORIUM'
                ? 'bg-[#0E8158] text-white'
                : isDark
                ? 'bg-[#172923] text-[#8AA39B]'
                : 'bg-[#EBEAE4] text-[#5A6863]'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Аудитории</span>
          </button>
        </div>

        <div className="relative mb-3">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-60" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              tab === 'TEACHER'
                ? 'Фамилия преподавателя (напр. Сухобок)...'
                : 'Номер аудитории (напр. 3430)...'
            }
            className={`w-full rounded-xl pl-10 pr-4 py-2.5 text-base border focus:outline-none ${
              isDark
                ? 'bg-[#172923] border-[#264B3E] text-[#E6F2ED]'
                : 'bg-[#EBEAE4] border-[#0E8158]/25 text-[#1B2421]'
            }`}
          />
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar space-y-1.5">
          {tab === 'TEACHER'
            ? filteredTeachers.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    onSelectLookupTarget({
                      type: LookupModeType.TEACHER,
                      id: t.id,
                      title: t.name,
                    });
                    onClose();
                  }}
                  className={`w-full rounded-xl p-3 border text-left flex items-center justify-between cursor-pointer ${
                    isDark
                      ? 'bg-[#172923] border-[#264B3E] hover:border-[#34D399]'
                      : 'bg-[#EBEAE4] border-[#0E8158]/15 hover:border-[#0E8158]'
                  }`}
                >
                  <span className="text-sm font-bold">{t.name}</span>
                  <span className="text-xs font-bold text-[#34D399]">Открыть →</span>
                </button>
              ))
            : filteredAuditoriums.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    onSelectLookupTarget({
                      type: LookupModeType.AUDITORIUM,
                      id: a.id,
                      title: a.name,
                    });
                    onClose();
                  }}
                  className={`w-full rounded-xl p-3 border text-left flex items-center justify-between cursor-pointer ${
                    isDark
                      ? 'bg-[#172923] border-[#264B3E] hover:border-[#34D399]'
                      : 'bg-[#EBEAE4] border-[#0E8158]/15 hover:border-[#0E8158]'
                  }`}
                >
                  <span className="text-sm font-bold">
                    {formatShortRoom(a.name)}
                  </span>
                  <span className="text-xs font-bold text-[#34D399]">Открыть →</span>
                </button>
              ))}
        </div>
      </div>
    </div>
  );
};

interface LookupLessonInfoBottomSheetProps {
  lesson: LessonItem;
  isDark: boolean;
  onClose: () => void;
}

export const LookupLessonInfoBottomSheet: React.FC<
  LookupLessonInfoBottomSheetProps
> = ({ lesson, isDark, onClose }) => {
  const categoryMeta = LESSON_CATEGORY_META[lesson.category];
  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-end justify-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg rounded-t-3xl p-5 pb-safe-sheet border-t ${
          isDark
            ? 'bg-[#111F1A] border-[#264B3E] text-[#E6F2ED]'
            : 'bg-[#FAF9F5] border-[#0E8158]/20 text-[#1B2421]'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span
            className="rounded-lg px-2.5 py-1 text-xs font-extrabold"
            style={{
              backgroundColor: `${categoryMeta.colorHex}24`,
              color: categoryMeta.colorHex,
            }}
          >
            {lesson.lessonType || categoryMeta.label}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full opacity-75 hover:opacity-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <h3 className="text-lg font-extrabold">{lesson.rawSubject}</h3>

        <div className="mt-3 space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#34D399]" />
            <span>
              {formatShortDayAndMonth(lesson.dateIso)} • {lesson.pairNumber} пара (
              {lesson.startTime}–{lesson.endTime})
            </span>
          </div>
          {lesson.teacher && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-[#34D399]" />
              <span>{lesson.teacher}</span>
            </div>
          )}
          {lesson.room && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#34D399]" />
              <span>{formatShortRoom(lesson.room)}</span>
            </div>
          )}
          {lesson.groups && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#34D399]" />
              <span>Группы: {lesson.groups}</span>
            </div>
          )}
          {lesson.onlineLink && (
            <a
              href={lesson.onlineLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[#34D399] font-bold"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Перейти по онлайн-ссылке</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

interface ApiInspectorBottomSheetProps {
  apiBaseUrl: string;
  corsProxyUrl: string;
  selectedGroup: string;
  isFromNetwork: boolean;
  cachedLessonCount: number;
  isDark: boolean;
  onSaveApiSettings: (apiBaseUrl: string, corsProxyUrl: string) => void;
  onClose: () => void;
}

export const ApiInspectorBottomSheet: React.FC<
  ApiInspectorBottomSheetProps
> = ({
  apiBaseUrl,
  corsProxyUrl,
  selectedGroup,
  isFromNetwork,
  cachedLessonCount,
  isDark,
  onSaveApiSettings,
  onClose,
}) => {
  const [draftUrl, setDraftUrl] = useState(apiBaseUrl);
  const [draftProxyUrl, setDraftProxyUrl] = useState(corsProxyUrl);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-end justify-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg rounded-t-3xl p-5 pb-safe-sheet border-t ${
          isDark
            ? 'bg-[#111F1A] border-[#264B3E] text-[#E6F2ED]'
            : 'bg-[#FAF9F5] border-[#0E8158]/20 text-[#1B2421]'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-[#34D399]" />
            <h3 className="text-lg font-extrabold">Сервер расписания и прокси</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full opacity-75 hover:opacity-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div
          className={`rounded-2xl p-3.5 border text-xs space-y-1.5 mb-3.5 ${
            isDark
              ? 'bg-[#172923] border-[#264B3E]'
              : 'bg-[#EBEAE4] border-[#0E8158]/20'
          }`}
        >
          <div>
            Текущая группа: <b>{selectedGroup}</b>
          </div>
          <div>
            Режим синхронизации:{' '}
            <b className="text-[#34D399]">
              {isFromNetwork
                ? 'Онлайн API ДВГУПС + IndexedDB кэш'
                : 'Локальный офлайн-кэш IndexedDB / localStorage'}
            </b>
          </div>
          <div>
            Маршрут запросов:{' '}
            <b>
              {draftProxyUrl.trim()
                ? `Через прокси (${draftProxyUrl.trim()})`
                : 'Напрямую к сайту ДВГУПС'}
            </b>
          </div>
          <div>
            Пар в кэше: <b>{cachedLessonCount}</b>
          </div>
        </div>

        <label className="block text-xs font-bold uppercase tracking-wider opacity-75 mb-1">
          URL прокси-сервера (необязательно)
        </label>
        <input
          type="url"
          value={draftProxyUrl}
          onChange={(e) => setDraftProxyUrl(e.target.value)}
          placeholder="По умолчанию пусто (прямой запрос к ДВГУПС)"
          className={`w-full rounded-xl px-3.5 py-2.5 text-base border mb-1.5 focus:outline-none ${
            isDark
              ? 'bg-[#172923] border-[#264B3E] text-[#E6F2ED]'
              : 'bg-[#EBEAE4] border-[#0E8158]/25 text-[#1B2421]'
          }`}
        />
        <p className="text-[11px] opacity-70 mb-3 leading-snug">
          Оставьте пустым для прямых запросов к сайту ДВГУПС. Если на GitHub Pages в iOS Safari возникает блокировка CORS, укажите URL прокси (например, <code>https://corsproxy.io/?</code> или ваш Vercel <code>/api/schedule</code>).
        </p>

        <label className="block text-xs font-bold uppercase tracking-wider opacity-75 mb-1">
          URL сервера расписания ДВГУПС
        </label>
        <input
          type="url"
          value={draftUrl}
          onChange={(e) => setDraftUrl(e.target.value)}
          className={`w-full rounded-xl px-3.5 py-2.5 text-base border mb-3.5 focus:outline-none ${
            isDark
              ? 'bg-[#172923] border-[#264B3E] text-[#E6F2ED]'
              : 'bg-[#EBEAE4] border-[#0E8158]/25 text-[#1B2421]'
          }`}
        />

        <button
          type="button"
          onClick={() => {
            onSaveApiSettings(
              draftUrl.trim() || 'https://dvgupstimetable.ru',
              draftProxyUrl.trim()
            );
            onClose();
          }}
          className="w-full rounded-2xl bg-[#0E8158] py-3 text-xs font-extrabold text-white cursor-pointer"
        >
          Сохранить и обновить
        </button>
      </div>
    </div>
  );
};
