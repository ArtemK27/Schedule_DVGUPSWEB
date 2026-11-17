import { AcademicWeekOption, DaySchedule, LessonItem } from './scheduleModels';

const SHORT_DAYS_RU = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
const FULL_DAYS_RU = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье',
];
const SHORT_MONTHS_RU = [
  'янв.',
  'февр.',
  'марта',
  'апр.',
  'мая',
  'июня',
  'июля',
  'авг.',
  'сент.',
  'окт.',
  'нояб.',
  'дек.',
];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function parseIsoLocal(dateIso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateIso.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  const d = new Date(year, month, day, 12, 0, 0, 0);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function formatDateToIso(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function getTodayIso(now: Date = new Date()): string {
  return formatDateToIso(now);
}

export function getCurrentMinutesOfDay(now: Date = new Date()): number {
  return now.getHours() * 60 + now.getMinutes();
}

export function getIsoDayOfWeek(date: Date): number {
  const jsDay = date.getDay();
  return jsDay === 0 ? 7 : jsDay;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function addDaysIso(dateIso: string, days: number): string {
  const d = parseIsoLocal(dateIso) || new Date();
  return formatDateToIso(addDays(d, days));
}

export function getMondayOfGivenWeek(dateIso: string): string {
  const d = parseIsoLocal(dateIso) || new Date();
  const isoDow = getIsoDayOfWeek(d);
  const monday = addDays(d, -(isoDow - 1));
  return formatDateToIso(monday);
}

export function getMondayOfCurrentWeek(now: Date = new Date()): string {
  return getMondayOfGivenWeek(formatDateToIso(now));
}

export function normalizeAnyDateToIso(raw: string): string | null {
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const dotMatch = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(trimmed);
  if (dotMatch) {
    return `${dotMatch[3]}-${dotMatch[2]}-${dotMatch[1]}`;
  }
  const isoPrefix = /^(\d{4}-\d{2}-\d{2})/.exec(trimmed);
  if (isoPrefix) {
    return isoPrefix[1];
  }
  return null;
}

export function calculateAcademicWeekNumber(mondayDate: Date): number {
  const year = mondayDate.getFullYear();
  const month = mondayDate.getMonth() + 1;
  const septYear = month >= 9 ? year : year - 1;
  const septFirst = new Date(septYear, 8, 1, 12, 0, 0, 0);
  const septDow = getIsoDayOfWeek(septFirst);
  const firstAcademicMonday = addDays(septFirst, -(septDow - 1));

  const diffMs = mondayDate.getTime() - firstAcademicMonday.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  return Math.max(1, diffWeeks + 1);
}

function formatShortDdMmYy(date: Date): string {
  const dd = pad2(date.getDate());
  const mm = pad2(date.getMonth() + 1);
  const yy = pad2(date.getFullYear() % 100);
  return `${dd}.${mm}.${yy}`;
}

export function formatWeekBanner(
  mondayIso: string,
  currentWeekMondayIso: string = getMondayOfCurrentWeek()
): string {
  const monday = parseIsoLocal(mondayIso) || new Date();
  const currentMonday = parseIsoLocal(currentWeekMondayIso) || new Date();
  const sunday = addDays(monday, 6);
  const weekNumber = calculateAcademicWeekNumber(monday);

  const rangeStr = `${formatShortDdMmYy(monday)}-${formatShortDdMmYy(sunday)}`;
  const diffDays = Math.round(
    (monday.getTime() - currentMonday.getTime()) / (1000 * 60 * 60 * 24)
  );
  const diffWeeks = Math.round(diffDays / 7);

  let suffix = '';
  if (diffWeeks === 0) suffix = ' (текущая)';
  else if (diffWeeks === -1) suffix = ' (предыдущая)';
  else if (diffWeeks === 1) suffix = ' (следующая)';

  return `(${weekNumber} неделя) ${rangeStr}${suffix}`;
}

export function getNearbyAcademicWeeks(
  centerMondayIso: string = getMondayOfCurrentWeek(),
  currentWeekMondayIso: string = getMondayOfCurrentWeek()
): AcademicWeekOption[] {
  const centerMonday = parseIsoLocal(centerMondayIso) || new Date();
  const currentMonday = parseIsoLocal(currentWeekMondayIso) || new Date();

  return [-2, -1, 0, 1, 2].map((offset) => {
    const monday = addDays(centerMonday, offset * 7);
    const sunday = addDays(monday, 6);
    const mondayIso = formatDateToIso(monday);
    const sundayIso = formatDateToIso(sunday);
    const weekNumber = calculateAcademicWeekNumber(monday);
    const diffFromCurrent = Math.round(
      (monday.getTime() - currentMonday.getTime()) / (1000 * 60 * 60 * 24 * 7)
    );

    return {
      weekNumber,
      startIso: mondayIso,
      endIso: sundayIso,
      bannerText: formatWeekBanner(mondayIso, currentWeekMondayIso),
      offsetFromCurrent: diffFromCurrent,
    };
  });
}

export function buildWeekDaysList(
  mondayIso: string,
  lessonsByDate: Record<string, LessonItem[]>
): DaySchedule[] {
  const monday = parseIsoLocal(mondayIso) || new Date();
  const all7Days: DaySchedule[] = [];

  for (let offset = 0; offset < 7; offset++) {
    const date = addDays(monday, offset);
    const iso = formatDateToIso(date);
    const dowIndex = getIsoDayOfWeek(date) - 1;

    let dayLessons = lessonsByDate[iso] || [];
    if (dayLessons.length === 0) {
      for (const weeksBack of [2, 4]) {
        const fallbackDate = addDays(date, -weeksBack * 7);
        const fallbackIso = formatDateToIso(fallbackDate);
        const fallbackLessons = lessonsByDate[fallbackIso];
        if (fallbackLessons && fallbackLessons.length > 0) {
          dayLessons = fallbackLessons.map((lesson) => ({
            ...lesson,
            id: `${iso}_${lesson.pairNumber}_${lesson.rawSubject.slice(0, 12)}`,
            dateIso: iso,
            homeworkText: null,
            isHomeworkCompleted: false,
          }));
          break;
        }
      }
    }

    const sortedLessons = [...dayLessons].sort(
      (a, b) => a.startMinutes - b.startMinutes || a.pairNumber - b.pairNumber
    );

    all7Days.push({
      dateIso: iso,
      dayOfWeekShort: SHORT_DAYS_RU[dowIndex] || 'ДН',
      dayOfWeekFull: FULL_DAYS_RU[dowIndex] || 'День',
      dayMonthFormatted: `${date.getDate()} ${SHORT_MONTHS_RU[date.getMonth()]}`,
      dayNumber: String(date.getDate()),
      lessons: sortedLessons,
    });
  }

  const sundayHasLessons = (all7Days[6]?.lessons.length || 0) > 0;
  return sundayHasLessons ? all7Days : all7Days.slice(0, 6);
}

export function parseTimeToMinutes(timeStr: string): number {
  const m = /(\d{1,2}):(\d{2})/.exec(timeStr.trim());
  if (!m) return 0;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function formatShortDayAndMonth(dateIso: string): string {
  const date = parseIsoLocal(dateIso);
  if (!date) return dateIso;
  const dow = SHORT_DAYS_RU[getIsoDayOfWeek(date) - 1] || '';
  const month = SHORT_MONTHS_RU[date.getMonth()] || '';
  return `${dow}, ${date.getDate()} ${month}`;
}

export function formatDateTimeRu(epochMillis: number): string {
  const d = new Date(epochMillis);
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()} ${pad2(
    d.getHours()
  )}:${pad2(d.getMinutes())}`;
}
