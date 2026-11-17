export enum LessonCategory {
  LECTURE = 'LECTURE',
  PRACTICE = 'PRACTICE',
  LAB = 'LAB',
  EXAM = 'EXAM',
}

export const LESSON_CATEGORY_META: Record<
  LessonCategory,
  { label: string; colorHex: string }
> = {
  [LessonCategory.LECTURE]: { label: 'Лекция', colorHex: '#0E8158' },
  [LessonCategory.PRACTICE]: { label: 'Практика', colorHex: '#D97706' },
  [LessonCategory.LAB]: { label: 'Лабораторная', colorHex: '#7C3AED' },
  [LessonCategory.EXAM]: { label: 'Аттестация', colorHex: '#DC2626' },
};

export enum HomeworkColorTag {
  MINT = 'MINT',
  ORANGE = 'ORANGE',
  RED = 'RED',
  PURPLE = 'PURPLE',
}

export const HOMEWORK_TAG_META: Record<
  HomeworkColorTag,
  {
    label: string;
    shortLabel: string;
    badgeLabel: string;
    darkHex: string;
    lightHex: string;
  }
> = {
  [HomeworkColorTag.MINT]: {
    label: 'Обычное ДЗ',
    shortLabel: 'Обычное ДЗ',
    badgeLabel: 'ДЗ',
    darkHex: '#28A976',
    lightHex: '#148858',
  },
  [HomeworkColorTag.ORANGE]: {
    label: 'Сдача лабы / практика',
    shortLabel: 'Лаба / практ.',
    badgeLabel: 'Лаба',
    darkHex: '#E59446',
    lightHex: '#D97706',
  },
  [HomeworkColorTag.RED]: {
    label: 'Тест / контрольная',
    shortLabel: 'Тест / КР',
    badgeLabel: 'Тест',
    darkHex: '#E05252',
    lightHex: '#DC2626',
  },
  [HomeworkColorTag.PURPLE]: {
    label: 'Другое / отчет',
    shortLabel: 'Другое / отчет',
    badgeLabel: 'Отчет',
    darkHex: '#A86ADD',
    lightHex: '#7C3AED',
  },
};

export function parseHomeworkColorTag(raw?: string | null): HomeworkColorTag {
  if (!raw) return HomeworkColorTag.MINT;
  const upper = raw.trim().toUpperCase();
  if (upper in HomeworkColorTag) {
    return upper as HomeworkColorTag;
  }
  return HomeworkColorTag.MINT;
}

export interface BellSlot {
  pairNumber: number;
  startTime: string;
  endTime: string;
  startMinutes: number;
  endMinutes: number;
}

export const DVGUPS_BELL_SLOTS: BellSlot[] = [
  { pairNumber: 1, startTime: '08:05', endTime: '09:35', startMinutes: 485, endMinutes: 575 },
  { pairNumber: 2, startTime: '09:50', endTime: '11:20', startMinutes: 590, endMinutes: 680 },
  { pairNumber: 3, startTime: '11:35', endTime: '13:05', startMinutes: 695, endMinutes: 785 },
  { pairNumber: 4, startTime: '13:35', endTime: '15:05', startMinutes: 815, endMinutes: 905 },
  { pairNumber: 5, startTime: '15:15', endTime: '16:45', startMinutes: 915, endMinutes: 1005 },
  { pairNumber: 6, startTime: '16:55', endTime: '18:25', startMinutes: 1015, endMinutes: 1105 },
  { pairNumber: 7, startTime: '18:30', endTime: '20:00', startMinutes: 1110, endMinutes: 1200 },
  { pairNumber: 8, startTime: '20:05', endTime: '21:35', startMinutes: 1205, endMinutes: 1295 },
];

export interface LessonItem {
  id: string;
  dateIso: string;
  pairNumber: number;
  startTime: string;
  endTime: string;
  startMinutes: number;
  endMinutes: number;
  rawSubject: string;
  shortSubject: string;
  lessonType: string;
  category: LessonCategory;
  teacher: string;
  room: string;
  onlineLink: string;
  groups: string;
  homeworkText?: string | null;
  homeworkColorTag: HomeworkColorTag;
  isHomeworkCompleted: boolean;
}

export interface DaySchedule {
  dateIso: string;
  dayOfWeekShort: string;
  dayOfWeekFull: string;
  dayMonthFormatted: string;
  dayNumber: string;
  lessons: LessonItem[];
}

export interface AcademicWeekOption {
  weekNumber: number;
  startIso: string;
  endIso: string;
  bannerText: string;
  offsetFromCurrent: number;
}

export enum CurrentStatusType {
  ACTIVE_LESSON = 'ACTIVE_LESSON',
  UPCOMING_BREAK = 'UPCOMING_BREAK',
  CLASSES_FINISHED = 'CLASSES_FINISHED',
  NO_CLASSES_TODAY = 'NO_CLASSES_TODAY',
}

export interface CurrentStatusInfo {
  type: CurrentStatusType;
  headline: string;
  subline: string;
  remainingMinutes?: number | null;
  progressFraction?: number | null;
  activeLessonId?: string | null;
}

export interface HomeworkEntity {
  lessonKey: string;
  groupName: string;
  dateIso: string;
  pairNumber: number;
  subject: string;
  lessonType: string;
  homeworkText: string;
  colorTag: string;
  isCompleted: boolean;
  isOrphaned: boolean;
  updatedAtEpochMillis: number;
}

export interface HomeworkTaskItem {
  lessonKey: string;
  groupName: string;
  dateIso: string;
  dayFormatted: string;
  pairNumber: number;
  startTime: string;
  endTime: string;
  subject: string;
  shortSubject: string;
  lessonType: string;
  homeworkText: string;
  colorTag: HomeworkColorTag;
  isCompleted: boolean;
  isOrphaned: boolean;
  updatedAtEpochMillis: number;
}

export interface TeacherDirectoryItem {
  id: string;
  name: string;
}

export interface AuditoriumDirectoryItem {
  id: string;
  name: string;
}

export enum LookupModeType {
  GROUP = 'GROUP',
  TEACHER = 'TEACHER',
  AUDITORIUM = 'AUDITORIUM',
}

export interface ScheduleLookupTarget {
  type: LookupModeType;
  id: string;
  title: string;
  subtitle?: string;
}

export enum HomeworkFilterMode {
  UPCOMING = 'UPCOMING',
  CURRENT_WEEK = 'CURRENT_WEEK',
}

export enum MainAppTab {
  SCHEDULE = 'SCHEDULE',
  HOMEWORK = 'HOMEWORK',
  ABBREVIATIONS = 'ABBREVIATIONS',
}

export enum AppThemeMode {
  SYSTEM = 'SYSTEM',
  DARK = 'DARK',
  LIGHT = 'LIGHT',
}

export const DEFAULT_DVGUPS_GROUPS: string[] = [
  'БОМ21ПИА',
  'БОМ11ПИА',
  'БОМ31ПИА',
  'БОМ41ПИА',
  'БОМ11ПРИ',
  'БОМ21ПРИ',
  'БОМ31ПРИ',
  'БОМ41ПРИ',
  'БОМ11САТ',
  'БОМ21САТ',
  'БОС11ИВТ',
  'БВИ11МЕН',
  'БВИ11ПГС',
  'БВИ11ПСИ',
  'БВИ11ЦТС',
];

export function inferLessonCategory(typeStr: string, subjectStr: string): LessonCategory {
  const combined = `${typeStr} ${subjectStr}`.toLowerCase();
  if (
    combined.includes('лаб') ||
    combined.includes('лр') ||
    combined.includes('л.р.')
  ) {
    return LessonCategory.LAB;
  }
  if (
    combined.includes('экз') ||
    combined.includes('зач') ||
    combined.includes('атт') ||
    combined.includes('конс') ||
    combined.includes('курсов') ||
    combined.includes('кп')
  ) {
    return LessonCategory.EXAM;
  }
  if (
    combined.includes('практ') ||
    combined.includes('пр.') ||
    combined.includes('семинар') ||
    typeStr.trim().toLowerCase() === 'пр'
  ) {
    return LessonCategory.PRACTICE;
  }
  if (combined.includes('лек') || typeStr.trim().toLowerCase() === 'л') {
    return LessonCategory.LECTURE;
  }
  return LessonCategory.PRACTICE;
}
