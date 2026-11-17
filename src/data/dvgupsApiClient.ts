import {
  addDays,
  addDaysIso,
  formatDateToIso,
  getMondayOfCurrentWeek,
  getMondayOfGivenWeek,
  normalizeAnyDateToIso,
  parseIsoLocal,
  parseTimeToMinutes,
} from './dateUtils';
import {
  AuditoriumDirectoryItem,
  DEFAULT_DVGUPS_GROUPS,
  DVGUPS_BELL_SLOTS,
  HomeworkColorTag,
  HomeworkEntity,
  inferLessonCategory,
  LessonItem,
  parseHomeworkColorTag,
  TeacherDirectoryItem,
} from './scheduleModels';
import {
  cleanSubjectTitle,
  extractTypeAndCleanSubject,
  formatShortLessonType,
  isLessonExcludedByTeacher,
  mergeParallelDuplicateLessons,
  shortenSubject,
} from './subjectAbbreviations';

export const DEFAULT_DVGUPS_API_URL = 'https://dvgupstimetable.ru';

export const DEFAULT_TEACHERS_DIRECTORY: TeacherDirectoryItem[] = [
  { id: 'Белозерова Светлана Ивановна', name: 'Белозерова Светлана Ивановна' },
  { id: 'Кругликова Ольга Валерьевна', name: 'Кругликова Ольга Валерьевна' },
  { id: 'Данилушкина Лариса Владимировна', name: 'Данилушкина Лариса Владимировна' },
  { id: 'Сухобок Юрий Андреевич', name: 'Сухобок Юрий Андреевич' },
  { id: 'Левчук Виктор Дмитриевич', name: 'Левчук Виктор Дмитриевич' },
  { id: 'Кобылкин Константин Сергеевич', name: 'Кобылкин Константин Сергеевич' },
  { id: 'Попова Алена Валентиновна', name: 'Попова Алена Валентиновна' },
  { id: 'Богомякова Татьяна Анатольевна', name: 'Богомякова Татьяна Анатольевна' },
];

export const DEFAULT_AUDITORIUMS_DIRECTORY: AuditoriumDirectoryItem[] = [
  { id: 'а. 1801', name: 'а. 1801' },
  { id: 'а.  433', name: 'а.  433' },
  { id: 'а.  413', name: 'а.  413' },
  { id: 'а.  422', name: 'а.  422' },
  { id: 'а.  101', name: 'а.  101' },
  { id: '3430', name: '3430' },
  { id: '3426', name: '3426' },
  { id: '3315', name: '3315' },
];

export function buildHomeworkLessonKey(
  groupName: string,
  dateIso: string,
  pairNumber: number,
  subject: string,
  lessonType: string = ''
): string {
  const cleanGroup = groupName.trim().toUpperCase();
  const cleanSubj = cleanSubjectTitle(subject).trim().toLowerCase();
  const shortType = formatShortLessonType(lessonType);
  return `${cleanGroup}_${dateIso}_${pairNumber}_${cleanSubj}_${shortType}`;
}

export function matchHomeworkToDayLessons(
  lessons: LessonItem[],
  dayHomeworks: HomeworkEntity[]
): Map<string, HomeworkEntity> {
  const result = new Map<string, HomeworkEntity>();
  if (lessons.length === 0 || dayHomeworks.length === 0) return result;

  const matchedLessonIds = new Set<string>();
  const matchedHwKeys = new Set<string>();

  for (const lesson of lessons) {
    const lessonCleanSubj = cleanSubjectTitle(lesson.rawSubject).toLowerCase();
    const lessonShortType = formatShortLessonType(lesson.lessonType);

    const exact = dayHomeworks.find(
      (hw) =>
        !matchedHwKeys.has(hw.lessonKey) &&
        hw.pairNumber === lesson.pairNumber &&
        cleanSubjectTitle(hw.subject).toLowerCase() === lessonCleanSubj &&
        hw.lessonType.trim().length > 0 &&
        formatShortLessonType(hw.lessonType) === lessonShortType
    );
    if (exact) {
      result.set(lesson.id, exact);
      matchedLessonIds.add(lesson.id);
      matchedHwKeys.add(exact.lessonKey);
    }
  }

  for (const lesson of lessons) {
    if (matchedLessonIds.has(lesson.id)) continue;
    const lessonCleanSubj = cleanSubjectTitle(lesson.rawSubject).toLowerCase();

    const pairAndSubj = dayHomeworks.find(
      (hw) =>
        !matchedHwKeys.has(hw.lessonKey) &&
        hw.pairNumber === lesson.pairNumber &&
        (cleanSubjectTitle(hw.subject).toLowerCase() === lessonCleanSubj ||
          lessonCleanSubj.includes(cleanSubjectTitle(hw.subject).toLowerCase()) ||
          cleanSubjectTitle(hw.subject).toLowerCase().includes(lessonCleanSubj))
    );
    if (pairAndSubj) {
      result.set(lesson.id, pairAndSubj);
      matchedLessonIds.add(lesson.id);
      matchedHwKeys.add(pairAndSubj.lessonKey);
    }
  }

  for (const lesson of lessons) {
    if (matchedLessonIds.has(lesson.id)) continue;
    const lessonCleanSubj = cleanSubjectTitle(lesson.rawSubject).toLowerCase();
    const lessonShortType = formatShortLessonType(lesson.lessonType);

    const subjAndType = dayHomeworks.find(
      (hw) =>
        !matchedHwKeys.has(hw.lessonKey) &&
        cleanSubjectTitle(hw.subject).toLowerCase() === lessonCleanSubj &&
        hw.lessonType.trim().length > 0 &&
        formatShortLessonType(hw.lessonType) === lessonShortType
    );
    if (subjAndType) {
      result.set(lesson.id, subjAndType);
      matchedLessonIds.add(lesson.id);
      matchedHwKeys.add(subjAndType.lessonKey);
    }
  }

  for (const lesson of lessons) {
    if (matchedLessonIds.has(lesson.id)) continue;
    const lessonCleanSubj = cleanSubjectTitle(lesson.rawSubject).toLowerCase();

    const subjOnly = dayHomeworks.find(
      (hw) =>
        !matchedHwKeys.has(hw.lessonKey) &&
        (cleanSubjectTitle(hw.subject).toLowerCase() === lessonCleanSubj ||
          lessonCleanSubj.includes(cleanSubjectTitle(hw.subject).toLowerCase()) ||
          cleanSubjectTitle(hw.subject).toLowerCase().includes(lessonCleanSubj))
    );
    if (subjOnly) {
      result.set(lesson.id, subjOnly);
      matchedLessonIds.add(lesson.id);
      matchedHwKeys.add(subjOnly.lessonKey);
    }
  }

  for (const lesson of lessons) {
    if (matchedLessonIds.has(lesson.id)) continue;
    const pairOnly = dayHomeworks.find(
      (hw) => !matchedHwKeys.has(hw.lessonKey) && hw.pairNumber === lesson.pairNumber
    );
    if (pairOnly) {
      result.set(lesson.id, pairOnly);
      matchedLessonIds.add(lesson.id);
      matchedHwKeys.add(pairOnly.lessonKey);
    }
  }

  return result;
}

/**
 * Resolves pairNumber, startTime, endTime, startMinutes, endMinutes from:
 * - explicit pairNumber (1..8)
 * - number field from dvgupstimetable.ru (e.g. "08:05:00", "08:05", "08:05 - 09:35", or "1")
 * - explicit startTime / endTime
 */
function resolveBellTimes(
  rawNumberOrPair: unknown,
  rawStart: string,
  rawEnd: string,
  fallbackIndex: number
): {
  pairNumber: number;
  startTime: string;
  endTime: string;
  startMinutes: number;
  endMinutes: number;
} {
  let detectedPairNum = 0;
  let startStr = rawStart.trim();
  let endStr = rawEnd.trim();

  const numStr = String(rawNumberOrPair ?? '').trim();
  if (numStr) {
    // Check if numStr is a simple pair digit (e.g. "1" .. "8")
    if (/^[1-8]$/.test(numStr)) {
      detectedPairNum = Number(numStr);
    } else {
      // Check if numStr contains a time range "08:05 - 09:35" or single start time "08:05:00" / "08:05"
      const rangeMatch = /(\d{1,2}:\d{2})(?::\d{2})?\s*[-–—]\s*(\d{1,2}:\d{2})(?::\d{2})?/.exec(
        numStr
      );
      if (rangeMatch) {
        if (!startStr) startStr = rangeMatch[1];
        if (!endStr) endStr = rangeMatch[2];
      } else {
        const singleTimeMatch = /(\d{1,2}:\d{2})(?::\d{2})?/.exec(numStr);
        if (singleTimeMatch && !startStr) {
          startStr = singleTimeMatch[1];
        }
      }
    }
  }

  // Normalize H:MM to HH:MM
  if (/^\d:\d{2}$/.test(startStr)) startStr = `0${startStr}`;
  if (/^\d:\d{2}$/.test(endStr)) endStr = `0${endStr}`;

  if (startStr) {
    const startMin = parseTimeToMinutes(startStr);
    const matchedSlot =
      DVGUPS_BELL_SLOTS.find((s) => s.startTime === startStr) ||
      DVGUPS_BELL_SLOTS.find((s) => Math.abs(s.startMinutes - startMin) <= 20);

    if (matchedSlot) {
      const endMin = endStr ? parseTimeToMinutes(endStr) : matchedSlot.endMinutes;
      return {
        pairNumber: detectedPairNum || matchedSlot.pairNumber,
        startTime: startStr,
        endTime: endStr || matchedSlot.endTime,
        startMinutes: startMin || matchedSlot.startMinutes,
        endMinutes: endMin || matchedSlot.endMinutes,
      };
    }

    if (endStr) {
      const endMin = parseTimeToMinutes(endStr);
      return {
        pairNumber: detectedPairNum || fallbackIndex + 1,
        startTime: startStr,
        endTime: endStr,
        startMinutes: startMin,
        endMinutes: endMin || startMin + 90,
      };
    }
  }

  const slotByPair =
    DVGUPS_BELL_SLOTS.find((s) => s.pairNumber === detectedPairNum) ||
    DVGUPS_BELL_SLOTS.find((s) => s.pairNumber === fallbackIndex + 1) ||
    DVGUPS_BELL_SLOTS[0];

  return {
    pairNumber: slotByPair.pairNumber,
    startTime: slotByPair.startTime,
    endTime: slotByPair.endTime,
    startMinutes: slotByPair.startMinutes,
    endMinutes: slotByPair.endMinutes,
  };
}

/**
 * Extracts a normalized Record<dateIso, Array<rawLessonObject>> from any DVGUPS API response:
 * - { date: "26.10.2026", schedule: [ [ {...}, ... ], [ ... ] ] } (2D array from dvgupstimetable.ru)
 * - { days: { "2026-10-26": [ ... ] } }
 * - Array<{ date: "2026-10-26", lessons: [ ... ] }>
 */
export function extractRawDaysMapFromPayload(
  parsed: unknown,
  fallbackBaseDateIso?: string
): Record<string, Array<Record<string, unknown>>> {
  const daysMap: Record<string, Array<Record<string, unknown>>> = {};

  const addLessonToDate = (dateKey: string, lessonObj: Record<string, unknown>) => {
    const iso = normalizeAnyDateToIso(
      dateKey || String(lessonObj.date || lessonObj.day || '')
    );
    if (!iso) return;
    if (!daysMap[iso]) daysMap[iso] = [];
    daysMap[iso].push(lessonObj);
  };

  if (!parsed || typeof parsed !== 'object') return daysMap;

  if (Array.isArray(parsed)) {
    parsed.forEach((entry) => {
      if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
        const rec = entry as Record<string, unknown>;
        const dayKey = String(rec.date || rec.day || '');
        const subArr = (rec.lessons || rec.classes || rec.items) as unknown[];
        if (Array.isArray(subArr)) {
          subArr.forEach((l) => {
            if (l && typeof l === 'object') {
              addLessonToDate(dayKey, l as Record<string, unknown>);
            }
          });
        } else {
          addLessonToDate(dayKey, rec);
        }
      }
    });
    return daysMap;
  }

  const root = parsed as Record<string, unknown>;

  // Case 1: dvgupstimetable.ru 2D schedule array: { date: "26.10.2026", schedule: [ [ {...} ], ... ] }
  if (Array.isArray(root.schedule)) {
    const baseIso =
      normalizeAnyDateToIso(String(root.date || '')) ||
      (fallbackBaseDateIso ? getMondayOfGivenWeek(fallbackBaseDateIso) : null) ||
      getMondayOfCurrentWeek();
    const baseDate = parseIsoLocal(baseIso) || new Date();

    root.schedule.forEach((dayEntry, offset) => {
      const targetIso = formatDateToIso(addDays(baseDate, offset));
      if (Array.isArray(dayEntry)) {
        if (!daysMap[targetIso]) daysMap[targetIso] = [];
        dayEntry.forEach((lessonObj) => {
          if (lessonObj && typeof lessonObj === 'object') {
            daysMap[targetIso].push(lessonObj as Record<string, unknown>);
          }
        });
      } else if (dayEntry && typeof dayEntry === 'object') {
        const rec = dayEntry as Record<string, unknown>;
        const dayKey = String(rec.date || rec.day || targetIso);
        const lessonsArr = (rec.lessons || rec.classes || rec.items) as unknown[];
        if (Array.isArray(lessonsArr)) {
          const normIso = normalizeAnyDateToIso(dayKey) || targetIso;
          if (!daysMap[normIso]) daysMap[normIso] = [];
          lessonsArr.forEach((lessonObj) => {
            if (lessonObj && typeof lessonObj === 'object') {
              daysMap[normIso].push(lessonObj as Record<string, unknown>);
            }
          });
        } else {
          addLessonToDate(targetIso, rec);
        }
      }
    });
  }

  // Case 2: { days: { "YYYY-MM-DD": [...] } } or { data: ... }
  const daysObj =
    (root.days && typeof root.days === 'object' && !Array.isArray(root.days)
      ? (root.days as Record<string, unknown>)
      : null) ||
    (root.data && typeof root.data === 'object' && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : null);

  if (daysObj) {
    for (const [key, val] of Object.entries(daysObj)) {
      const iso = normalizeAnyDateToIso(key);
      if (!iso) continue;
      if (Array.isArray(val)) {
        if (!daysMap[iso]) daysMap[iso] = [];
        val.forEach((lessonObj) => {
          if (lessonObj && typeof lessonObj === 'object') {
            daysMap[iso].push(lessonObj as Record<string, unknown>);
          }
        });
      } else if (val && typeof val === 'object') {
        const rec = val as Record<string, unknown>;
        if (Array.isArray(rec.lessons)) {
          if (!daysMap[iso]) daysMap[iso] = [];
          rec.lessons.forEach((lessonObj) => {
            if (lessonObj && typeof lessonObj === 'object') {
              daysMap[iso].push(lessonObj as Record<string, unknown>);
            }
          });
        }
      }
    }
  }

  return daysMap;
}

export function parseScheduleJsonToMap(
  rawJson: string,
  abbreviationsEnabled: boolean,
  customAbbreviations: Record<string, string>,
  homeworkList: HomeworkEntity[],
  excludedTeachers: Set<string> = new Set()
): Record<string, LessonItem[]> {
  if (!rawJson.trim()) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return {};
  }

  const extractedDays = extractRawDaysMapFromPayload(parsed);
  const rawByDate: Record<string, LessonItem[]> = {};

  for (const [iso, rawLessonObjects] of Object.entries(extractedDays)) {
    rawByDate[iso] = [];
    rawLessonObjects.forEach((obj, idx) => {
      const rawDiscipline = String(
        obj.discipline || obj.subject || obj.name || obj.title || ''
      ).trim();
      if (!rawDiscipline) return;

      const rawTypeField = String(obj.type || obj.lessonType || obj.kind || '').trim();
      const [cleanedSubject, extractedType] = extractTypeAndCleanSubject(
        rawDiscipline,
        rawTypeField
      );

      const rawNumberField =
        obj.pairNumber ?? obj.pair ?? obj.pair_number ?? obj.number ?? '';
      const timeRange = String(obj.time || '').trim();
      let rawStart = String(obj.startTime || obj.timeStart || obj.start || '').trim();
      let rawEnd = String(obj.endTime || obj.timeEnd || obj.end || '').trim();
      if ((!rawStart || !rawEnd) && timeRange.includes('-')) {
        const [s, e] = timeRange.split('-').map((p) => p.trim());
        if (s && e) {
          rawStart = s;
          rawEnd = e;
        }
      }

      const resolvedBell = resolveBellTimes(
        rawNumberField,
        rawStart,
        rawEnd,
        idx
      );

      let teacherStr = '';
      if (Array.isArray(obj.teachers)) {
        teacherStr = obj.teachers
          .map((t) =>
            typeof t === 'string'
              ? t
              : String((t as Record<string, unknown>)?.name || '')
          )
          .filter(Boolean)
          .join(', ');
      } else {
        teacherStr = String(
          obj.teacher || obj.lecturer || obj.teacherName || ''
        )
          .trim()
          .replace(/\s+/g, ' ');
      }

      let roomStr = '';
      if (Array.isArray(obj.auditoriums)) {
        roomStr = obj.auditoriums
          .map((a) =>
            typeof a === 'string'
              ? a
              : String((a as Record<string, unknown>)?.name || '')
          )
          .filter(Boolean)
          .join(', ');
      } else {
        roomStr = String(
          obj.classroom ||
            obj.auditory ||
            obj.auditorium ||
            obj.room ||
            obj.cabinet ||
            ''
        )
          .trim()
          .replace(/\s+/g, ' ');
      }

      let groupsStr = '';
      if (Array.isArray(obj.groups)) {
        groupsStr = obj.groups.map((g) => String(g)).filter(Boolean).join(', ');
      } else {
        groupsStr = String(obj.groups || obj.group || obj.groupName || '').trim();
      }

      const onlineLink = String(
        obj.onlineLink || obj.online_link || obj.online || obj.link || obj.url || ''
      ).trim();
      const category = inferLessonCategory(extractedType, cleanedSubject);
      const shortSubject = shortenSubject(
        cleanedSubject,
        abbreviationsEnabled,
        customAbbreviations
      );

      rawByDate[iso].push({
        id: `${iso}_${resolvedBell.pairNumber}_${idx}_${cleanedSubject.slice(0, 12)}`,
        dateIso: iso,
        pairNumber: resolvedBell.pairNumber,
        startTime: resolvedBell.startTime,
        endTime: resolvedBell.endTime,
        startMinutes: resolvedBell.startMinutes,
        endMinutes: resolvedBell.endMinutes,
        rawSubject: cleanedSubject,
        shortSubject,
        lessonType: extractedType || 'Практика',
        category,
        teacher: teacherStr,
        room: roomStr,
        onlineLink,
        groups: groupsStr,
        homeworkText: null,
        homeworkColorTag: HomeworkColorTag.MINT,
        isHomeworkCompleted: false,
      });
    });
  }

  const hwByDate = new Map<string, HomeworkEntity[]>();
  for (const hw of homeworkList) {
    if (!hw.homeworkText.trim()) continue;
    const arr = hwByDate.get(hw.dateIso) || [];
    arr.push(hw);
    hwByDate.set(hw.dateIso, arr);
  }

  const finalMap: Record<string, LessonItem[]> = {};
  for (const [dateIso, rawLessons] of Object.entries(rawByDate)) {
    const filtered = rawLessons.filter(
      (l) => !isLessonExcludedByTeacher(l.teacher, excludedTeachers)
    );
    const merged = mergeParallelDuplicateLessons(filtered);
    const dayHws = hwByDate.get(dateIso) || [];
    const matchedHwMap = matchHomeworkToDayLessons(merged, dayHws);

    finalMap[dateIso] = merged.map((lesson) => {
      const hw = matchedHwMap.get(lesson.id);
      if (!hw) return lesson;
      return {
        ...lesson,
        homeworkText: hw.homeworkText,
        homeworkColorTag: parseHomeworkColorTag(hw.colorTag),
        isHomeworkCompleted: hw.isCompleted,
      };
    });
  }

  return finalMap;
}

export function buildOfflineFallbackScheduleJson(
  groupName: string = 'БОМ21ПИА',
  centerMondayIso: string = getMondayOfCurrentWeek()
): string {
  const centerMonday = parseIsoLocal(centerMondayIso) || new Date();
  const daysMap: Record<string, Array<Record<string, unknown>>> = {};

  const isItGroup = /ПИА|ИВТ|ПРИ|ИБС/i.test(groupName);
  const groupTag = groupName.trim() || 'БОМ21ПИА';

  for (let weekOffset = -3; weekOffset <= 4; weekOffset++) {
    const weekMonday = addDays(centerMonday, weekOffset * 7);
    const isEvenWeek = Math.abs(weekOffset) % 2 === 1;

    const monIso = formatDateToIso(addDays(weekMonday, 0));
    const tueIso = formatDateToIso(addDays(weekMonday, 1));
    const wedIso = formatDateToIso(addDays(weekMonday, 2));
    const thuIso = formatDateToIso(addDays(weekMonday, 3));
    const friIso = formatDateToIso(addDays(weekMonday, 4));
    const satIso = formatDateToIso(addDays(weekMonday, 5));

    daysMap[monIso] = [
      {
        pairNumber: 1,
        number: '08:05:00',
        name: isItGroup
          ? '(Лекции) Информационные системы и технологии'
          : '(Лекции) Высшая математика',
        teacher: 'Белозерова Светлана Ивановна',
        classroom: 'а.  433',
        group: groupTag,
      },
      {
        pairNumber: 2,
        number: '09:50:00',
        name: '(Практика) Иностранный язык в профессиональной сфере',
        teacher: 'Данилушкина Лариса Владимировна',
        classroom: 'а.  413',
        group: groupTag,
      },
      {
        pairNumber: 3,
        number: '11:35:00',
        name: isItGroup
          ? '(Лабораторные работы) Операционные системы'
          : '(Практика) Высшая математика',
        teacher: 'Сухобок Юрий Андреевич',
        classroom: '3426',
        group: groupTag,
      },
      {
        pairNumber: 4,
        number: '13:35:00',
        name: '(Практика) Информационные системы и технологии',
        teacher: 'Белозерова Светлана Ивановна',
        classroom: 'а.  422',
        group: groupTag,
      },
    ];

    daysMap[tueIso] = [
      {
        pairNumber: 1,
        number: '08:05:00',
        name: '(Лекции) Современные технологии прикладного программирования',
        teacher: 'Левчук Виктор Дмитриевич',
        classroom: '3315',
        group: `${groupTag}, БО911ПИА`,
      },
      {
        pairNumber: 2,
        number: '09:50:00',
        name: '(Лабораторные работы) Современные технологии прикладного программирования',
        teacher: 'Левчук Виктор Дмитриевич',
        classroom: '3426',
        group: groupTag,
      },
      {
        pairNumber: 4,
        number: '13:35:00',
        name: '(Практика) Элективные курсы по физической культуре и спорту',
        teacher: 'Иванов Сергей Петрович',
        classroom: 'Спортивный комплекс',
        group: groupTag,
      },
    ];

    daysMap[wedIso] = [
      {
        pairNumber: 2,
        number: '09:50:00',
        name: '(Лекции) Базы данных и экспертные системы',
        teacher: 'Кобылкин Константин Сергеевич',
        classroom: '3218',
        group: `${groupTag}, БО921ПИА`,
      },
      {
        pairNumber: 3,
        number: '11:35:00',
        name: isEvenWeek
          ? '(Лабораторные работы) Базы данных и экспертные системы'
          : '(Практика) Дискретная математика и математическая логика',
        teacher: isEvenWeek
          ? 'Кобылкин Константин Сергеевич'
          : 'Кругликова Ольга Валерьевна',
        classroom: isEvenWeek ? '3430' : 'а. 1801',
        group: groupTag,
      },
      {
        pairNumber: 4,
        number: '13:35:00',
        name: '(Практика) Высшая математика',
        teacher: 'Кругликова Ольга Валерьевна',
        classroom: 'а. 1801',
        group: groupTag,
      },
    ];

    daysMap[thuIso] = [
      {
        pairNumber: 1,
        number: '08:05:00',
        name: '(Лекции) Вычислительные системы, сети и телекоммуникации',
        teacher: 'Козлов Дмитрий Александрович',
        classroom: '4210',
        group: groupTag,
      },
      {
        pairNumber: 2,
        number: '09:50:00',
        name: '(Лабораторные работы) Вычислительные системы, сети и телекоммуникации',
        teacher: 'Козлов Дмитрий Александрович',
        classroom: '3426',
        group: groupTag,
      },
      {
        pairNumber: 3,
        number: '11:35:00',
        name: '(Практика) Иностранный язык',
        teacher: 'Данилушкина Лариса Владимировна',
        classroom: 'а.  413',
        group: groupTag,
      },
    ];

    daysMap[friIso] = [
      {
        pairNumber: 2,
        number: '09:50:00',
        name: '(Лекции) Информатика и программирование',
        teacher: 'Григорьев Павел Владимирович',
        classroom: '3315',
        group: groupTag,
      },
      {
        pairNumber: 3,
        number: '11:35:00',
        name: '(Лабораторные работы) Информатика и программирование',
        teacher: 'Григорьев Павел Владимирович',
        classroom: '3430',
        group: groupTag,
      },
      {
        pairNumber: 5,
        number: '15:15:00',
        name: '(Практика) Элективные курсы по физической культуре и спорту',
        teacher: 'Иванов Сергей Петрович',
        classroom: 'Спортивный комплекс',
        group: groupTag,
      },
    ];

    daysMap[satIso] = [
      {
        pairNumber: 2,
        number: '09:50:00',
        name: '(Лекции) Безопасность жизнедеятельности',
        teacher: 'Платонова Марина Игоревна',
        classroom: '1205',
        group: `${groupTag}, БО911ИВТ`,
      },
      {
        pairNumber: 3,
        number: '11:35:00',
        name: '(Практика) История России',
        teacher: 'Смирнова Ольга Николаевна',
        classroom: '2304',
        group: groupTag,
      },
    ];
  }

  return JSON.stringify({
    group: groupTag,
    source: 'offline-seed',
    days: daysMap,
  });
}

export function buildTeacherOrRoomFallbackJson(
  mode: 'TEACHER' | 'AUDITORIUM',
  targetTitle: string,
  centerMondayIso: string = getMondayOfCurrentWeek()
): string {
  const baseRaw = buildOfflineFallbackScheduleJson('БОМ21ПИА', centerMondayIso);
  let parsed: { days?: Record<string, Array<Record<string, unknown>>> } = {};
  try {
    parsed = JSON.parse(baseRaw);
  } catch {
    return baseRaw;
  }

  const filteredDays: Record<string, Array<Record<string, unknown>>> = {};
  const queryLower = targetTitle.trim().toLowerCase();

  for (const [dateIso, lessons] of Object.entries(parsed.days || {})) {
    const matches = lessons.filter((l) => {
      if (mode === 'TEACHER') {
        const t = String(l.teacher || '').toLowerCase();
        return t.includes(queryLower) || queryLower.includes(t.split(' ')[0] || '');
      }
      const r = String(l.classroom || l.auditorium || '').toLowerCase();
      return r.includes(queryLower) || queryLower.includes(r);
    });
    if (matches.length > 0) {
      filteredDays[dateIso] = matches;
    }
  }

  if (Object.keys(filteredDays).length === 0 && parsed.days) {
    for (const [dateIso, lessons] of Object.entries(parsed.days)) {
      filteredDays[dateIso] = lessons.slice(0, 2).map((l) => ({
        ...l,
        teacher: mode === 'TEACHER' ? targetTitle : l.teacher,
        classroom: mode === 'AUDITORIUM' ? targetTitle : l.classroom,
      }));
    }
  }

  return JSON.stringify({
    lookup: targetTitle,
    mode,
    days: filteredDays,
  });
}

function buildCustomProxyRequestUrl(
  corsProxyUrl: string,
  cleanBase: string,
  path: string
): { url: string; extraHeaders: Record<string, string> } {
  const trimmedProxy = corsProxyUrl.trim();
  const directTargetUrl = `${cleanBase}${path}`;

  // Case 1: Query-prefix CORS proxy (e.g. "https://corsproxy.io/?" or "https://thingproxy.freeboard.io/fetch/")
  if (trimmedProxy.includes('?') || trimmedProxy.endsWith('=')) {
    return {
      url: `${trimmedProxy}${encodeURIComponent(directTargetUrl)}`,
      extraHeaders: {},
    };
  }

  const cleanProxy = trimmedProxy.replace(/\/+$/, '');

  // Case 2: Vercel /api/schedule Serverless Function proxy
  if (cleanProxy.endsWith('/api/schedule')) {
    const url =
      path === '/api/schedule'
        ? cleanProxy
        : `${cleanProxy}?endpoint=${encodeURIComponent(path)}`;
    return {
      url,
      extraHeaders: {
        'x-dvgups-base': cleanBase,
        'x-dvgups-endpoint': path,
      },
    };
  }

  // Case 3: Reverse proxy base URL (e.g. "https://my-proxy.workers.dev" or "/dvgups-proxy")
  return {
    url: `${cleanProxy}${path}`,
    extraHeaders: {
      'x-dvgups-base': cleanBase,
      'x-dvgups-endpoint': path,
    },
  };
}

async function fetchViaProxyOrDirect(
  baseUrl: string,
  path: string,
  init?: RequestInit,
  corsProxyUrl: string = ''
): Promise<Response> {
  const cleanBase = (baseUrl || DEFAULT_DVGUPS_API_URL).trim().replace(/\/+$/, '');
  const trimmedProxy = corsProxyUrl.trim();

  // 1. If user specified a custom CORS proxy URL in Settings, send request through it first
  if (trimmedProxy.length > 0) {
    try {
      const { url, extraHeaders } = buildCustomProxyRequestUrl(
        trimmedProxy,
        cleanBase,
        path
      );
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      try {
        const proxyRes = await fetch(url, {
          ...init,
          headers: {
            'Content-Type': 'application/json',
            Accept: '*/*',
            ...(init?.headers || {}),
            ...extraHeaders,
          },
          signal: controller.signal,
        });
        if (proxyRes.ok) return proxyRes;
      } finally {
        clearTimeout(timer);
      }
    } catch {
      // Fall through to direct / built-in proxy if custom proxy fails
    }
  }

  // 2. Default: attempt direct request to DVGUPS schedule server (https://dvgupstimetable.ru)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7500);
    try {
      const directRes = await fetch(`${cleanBase}${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          Accept: '*/*',
          ...(init?.headers || {}),
        },
        signal: controller.signal,
      });
      if (directRes.ok) return directRes;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    // Direct fetch blocked by browser CORS (e.g. iOS Safari) -> fall through to local/Vercel proxy
  }

  // 3. Fallback to same-origin /api/schedule (Vercel Serverless Function or Vite dev server)
  const vercelApiUrl =
    path === '/api/schedule'
      ? './api/schedule'
      : `./api/schedule?endpoint=${encodeURIComponent(path)}`;

  try {
    const res = await fetch(vercelApiUrl, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Accept: '*/*',
        ...(init?.headers || {}),
        'x-dvgups-base': cleanBase,
        'x-dvgups-endpoint': path,
      },
    });
    if (res.ok && res.headers.get('content-type')?.includes('json')) {
      return res;
    }
  } catch {
    // Fallback to secondary proxy
  }

  // 4. Secondary fallback via ./dvgups-proxy
  const proxyRes = await fetch(`./dvgups-proxy${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: '*/*',
      ...(init?.headers || {}),
      'x-dvgups-base': cleanBase,
    },
  });
  return proxyRes;
}

export async function fetchAllGroupsFromApi(
  baseUrl: string,
  corsProxyUrl: string = ''
): Promise<string[]> {
  try {
    const res = await fetchViaProxyOrDirect(
      baseUrl,
      '/api/all_groups',
      { method: 'GET' },
      corsProxyUrl
    );
    if (!res.ok) return DEFAULT_DVGUPS_GROUPS;
    const data = await res.json();

    const rawArr: unknown[] = Array.isArray(data)
      ? data
      : Array.isArray((data as Record<string, unknown>)?.groups)
      ? ((data as Record<string, unknown>).groups as unknown[])
      : [];

    const list: string[] = [];
    for (const item of rawArr) {
      if (typeof item === 'string' && item.trim()) {
        list.push(item.trim());
      } else if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        const name = String(
          obj.id || obj.text || obj.name || obj.group || ''
        ).trim();
        if (name) list.push(name);
      }
    }

    if (list.length > 0) {
      return Array.from(new Set([...DEFAULT_DVGUPS_GROUPS, ...list]));
    }
    return DEFAULT_DVGUPS_GROUPS;
  } catch {
    return DEFAULT_DVGUPS_GROUPS;
  }
}

async function fetchSingleWeekGroupSchedule(
  baseUrl: string,
  groupName: string,
  dateIso: string,
  corsProxyUrl: string = ''
): Promise<Record<string, Array<Record<string, unknown>>> | null> {
  try {
    const res = await fetchViaProxyOrDirect(
      baseUrl,
      '/api/schedule',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group: groupName.trim(),
          date: dateIso,
        }),
      },
      corsProxyUrl
    );
    if (!res.ok) return null;
    const text = await res.text();
    if (!text.trim() || text.includes('"Upstream unreachable"')) return null;

    const parsed = JSON.parse(text) as Record<string, unknown>;
    if (parsed.success === false) {
      return null;
    }

    return extractRawDaysMapFromPayload(parsed, dateIso);
  } catch {
    return null;
  }
}

export async function fetchGroupScheduleFromApi(
  baseUrl: string,
  groupName: string,
  targetWeekDateIso: string = getMondayOfCurrentWeek(),
  existingRawJson?: string,
  corsProxyUrl: string = ''
): Promise<{ rawJson: string; isFromNetwork: boolean }> {
  const cleanGroup = groupName.trim();
  const mondayIso = getMondayOfGivenWeek(targetWeekDateIso);
  const nextWeekMondayIso = addDaysIso(mondayIso, 7);

  // Fetch both the requested week and the following week in parallel so both even/odd weeks are ready
  const [week1Days, week2Days] = await Promise.all([
    fetchSingleWeekGroupSchedule(baseUrl, cleanGroup, mondayIso, corsProxyUrl),
    fetchSingleWeekGroupSchedule(
      baseUrl,
      cleanGroup,
      nextWeekMondayIso,
      corsProxyUrl
    ),
  ]);

  if (week1Days || week2Days) {
    let mergedDays: Record<string, Array<Record<string, unknown>>> = {};

    // Keep previously fetched network days for this group if available
    if (existingRawJson) {
      try {
        const prevParsed = JSON.parse(existingRawJson) as Record<string, unknown>;
        if (
          prevParsed.source === 'dvgups-network' &&
          String(prevParsed.group || '').toUpperCase() === cleanGroup.toUpperCase()
        ) {
          mergedDays = extractRawDaysMapFromPayload(prevParsed);
        }
      } catch {
        // Ignore
      }
    }

    if (week1Days) {
      mergedDays = { ...mergedDays, ...week1Days };
    }
    if (week2Days) {
      mergedDays = { ...mergedDays, ...week2Days };
    }

    return {
      rawJson: JSON.stringify({
        success: true,
        group: cleanGroup,
        source: 'dvgups-network',
        days: mergedDays,
      }),
      isFromNetwork: true,
    };
  }

  return {
    rawJson: buildOfflineFallbackScheduleJson(cleanGroup, mondayIso),
    isFromNetwork: false,
  };
}

export async function fetchTeachersDirectoryFromApi(
  baseUrl: string,
  corsProxyUrl: string = ''
): Promise<TeacherDirectoryItem[]> {
  try {
    const res = await fetchViaProxyOrDirect(
      baseUrl,
      '/api/teachers',
      { method: 'GET' },
      corsProxyUrl
    );
    if (res.ok) {
      const data = await res.json();
      const rawArr: unknown[] = Array.isArray(data)
        ? data
        : Array.isArray((data as Record<string, unknown>)?.teachers)
        ? ((data as Record<string, unknown>).teachers as unknown[])
        : [];

      if (rawArr.length > 0) {
        return rawArr
          .map((item, idx) => {
            if (typeof item === 'string') {
              return { id: item.trim(), name: item.trim() };
            }
            const obj = item as Record<string, unknown>;
            const name = String(obj.name || obj.text || obj.teacher || obj.id || '').trim();
            const id = String(obj.id || name || `t_${idx}`).trim();
            return { id, name };
          })
          .filter((t) => t.name.length > 0);
      }
    }
  } catch {
    // Ignore
  }
  return DEFAULT_TEACHERS_DIRECTORY;
}

export async function fetchAuditoriumsDirectoryFromApi(
  baseUrl: string,
  corsProxyUrl: string = ''
): Promise<AuditoriumDirectoryItem[]> {
  try {
    const res = await fetchViaProxyOrDirect(
      baseUrl,
      '/api/auditoriums',
      { method: 'GET' },
      corsProxyUrl
    );
    if (res.ok) {
      const data = await res.json();
      const rawArr: unknown[] = Array.isArray(data)
        ? data
        : Array.isArray((data as Record<string, unknown>)?.auditoriums)
        ? ((data as Record<string, unknown>).auditoriums as unknown[])
        : [];

      if (rawArr.length > 0) {
        return rawArr
          .map((item, idx) => {
            if (typeof item === 'string') {
              return { id: item.trim(), name: item.trim() };
            }
            const obj = item as Record<string, unknown>;
            const name = String(
              obj.name || obj.text || obj.auditorium || obj.id || ''
            ).trim();
            const id = String(obj.id || name || `a_${idx}`).trim();
            return { id, name };
          })
          .filter((a) => a.name.length > 0);
      }
    }
  } catch {
    // Ignore
  }
  return DEFAULT_AUDITORIUMS_DIRECTORY;
}

async function fetchSingleWeekLookupSchedule(
  baseUrl: string,
  mode: 'TEACHER' | 'AUDITORIUM',
  target: { id: string; title: string },
  dateIso: string,
  corsProxyUrl: string = ''
): Promise<Record<string, Array<Record<string, unknown>>> | null> {
  const endpoint =
    mode === 'TEACHER' ? '/api/schedule/teacher' : '/api/schedule/auditorium';
  const payload =
    mode === 'TEACHER'
      ? {
          teacher_id: target.id || target.title,
          teacher: target.title,
          id: target.id || target.title,
          name: target.title,
          date: dateIso,
        }
      : {
          auditorium_id: target.id || target.title,
          auditorium: target.title,
          id: target.id || target.title,
          name: target.title,
          date: dateIso,
        };

  try {
    const res = await fetchViaProxyOrDirect(
      baseUrl,
      endpoint,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      corsProxyUrl
    );
    if (!res.ok) return null;
    const text = await res.text();
    if (!text.trim() || text.includes('"Upstream unreachable"')) return null;

    const parsed = JSON.parse(text) as Record<string, unknown>;
    if (parsed.success === false && !Array.isArray(parsed.schedule)) {
      return null;
    }

    return extractRawDaysMapFromPayload(parsed, dateIso);
  } catch {
    return null;
  }
}

export async function fetchTeacherOrRoomScheduleFromApi(
  baseUrl: string,
  mode: 'TEACHER' | 'AUDITORIUM',
  target: { id: string; title: string },
  startDateIso: string,
  corsProxyUrl: string = ''
): Promise<{ rawJson: string; isFromNetwork: boolean }> {
  const mondayIso = getMondayOfGivenWeek(startDateIso);
  const nextWeekMondayIso = addDaysIso(mondayIso, 7);

  const [week1, week2] = await Promise.all([
    fetchSingleWeekLookupSchedule(
      baseUrl,
      mode,
      target,
      mondayIso,
      corsProxyUrl
    ),
    fetchSingleWeekLookupSchedule(
      baseUrl,
      mode,
      target,
      nextWeekMondayIso,
      corsProxyUrl
    ),
  ]);

  if (week1 || week2) {
    const mergedDays = {
      ...(week1 || {}),
      ...(week2 || {}),
    };
    return {
      rawJson: JSON.stringify({
        success: true,
        lookup: target.title,
        mode,
        source: 'dvgups-network',
        days: mergedDays,
      }),
      isFromNetwork: true,
    };
  }

  return {
    rawJson: buildTeacherOrRoomFallbackJson(mode, target.title, mondayIso),
    isFromNetwork: false,
  };
}
