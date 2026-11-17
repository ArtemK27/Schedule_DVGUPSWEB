import { LessonItem } from './scheduleModels';

export interface AbbreviationRule {
  fullPattern: string;
  shortName: string;
}

const LEADING_TYPE_PREFIX_REGEX =
  /^\s*(?:\(\s*(лекции|лекция|лек\.?|практические\s+занятия|практическое\s+занятие|практика|пр\.?|лабораторные\s+работы|лабораторная\s+работа|лабораторная|лаб\.?|лр|экзамен|экз\.?|зачет\s+с\s+оценкой|дифференцированный\s+зачет|зачет|зач\.?|консультация|конс\.?|курсовой\s+проект|курсовая\s+работа)\s*\)\s*|(?:(лекции|лекция|лек\.?|практические\s+занятия|практическое\s+занятие|практика|пр\.?|лабораторные\s+работы|лабораторная\s+работа|лабораторная|лаб\.?|лр|экзамен|экз\.?|зачет\s+с\s+оценкой|дифференцированный\s+зачет|зачет|зач\.?|консультация|конс\.?|курсовой\s+проект|курсовая\s+работа))(?:\s+|(?=[А-ЯЁA-Z«"(]))\s*)/iu;

const TRAILING_TYPE_PARENS_REGEX =
  /\s*\(\s*(лекции|лекция|лек\.?|практические\s+занятия|практика|пр\.?|лабораторные\s+работы|лабораторная|лаб\.?|лр|экзамен|зачет|консультация)\s*\)\s*$/iu;

export const DEFAULT_ABBREVIATION_RULES: AbbreviationRule[] = [
  { fullPattern: 'Современные технологии прикладного программирования', shortName: 'СТПП' },
  { fullPattern: 'Технологии прикладного программирования', shortName: 'ТПП' },
  { fullPattern: 'Проектирование и разработка пользовательских интерфейсов', shortName: 'ПРПИ' },
  { fullPattern: 'Информационные системы и технологии', shortName: 'ИСиТ' },
  { fullPattern: 'Объектно-ориентированное программирование', shortName: 'ООП' },
  { fullPattern: 'Операционные системы и оболочки', shortName: 'ОСиО' },
  { fullPattern: 'Операционные системы', shortName: 'ОС' },
  { fullPattern: 'Базы данных и экспертные системы', shortName: 'БД' },
  { fullPattern: 'Базы данных', shortName: 'БД' },
  { fullPattern: 'Системы управления базами данных', shortName: 'СУБД' },
  { fullPattern: 'Высшая математика', shortName: 'Вышмат' },
  { fullPattern: 'Математический анализ', shortName: 'Матан' },
  { fullPattern: 'Дискретная математика и математическая логика', shortName: 'Дискретка' },
  { fullPattern: 'Дискретная математика', shortName: 'Дискретка' },
  { fullPattern: 'Теория вероятностей и математическая статистика', shortName: 'Тервер' },
  { fullPattern: 'Теория вероятностей', shortName: 'Тервер' },
  { fullPattern: 'Линейная алгебра и аналитическая геометрия', shortName: 'Линал' },
  { fullPattern: 'Линейная алгебра', shortName: 'Линал' },
  { fullPattern: 'Безопасность жизнедеятельности', shortName: 'БЖД' },
  { fullPattern: 'Элективные курсы по физической культуре и спорту', shortName: 'Физ-ра' },
  { fullPattern: 'Элективные дисциплины по физической культуре и спорту', shortName: 'Физ-ра' },
  { fullPattern: 'Физическая культура и спорт', shortName: 'Физ-ра' },
  { fullPattern: 'Прикладная физическая культура', shortName: 'Физ-ра' },
  { fullPattern: 'Иностранный язык в профессиональной деятельности', shortName: 'Англ (проф)' },
  { fullPattern: 'Иностранный язык в профессиональной сфере', shortName: 'Англ (проф)' },
  { fullPattern: 'Иностранный язык', shortName: 'Англ' },
  { fullPattern: 'Информатика и программирование', shortName: 'Прога' },
  { fullPattern: 'Технологии программирования и алгоритмы', shortName: 'Прога и алгоритмы' },
  { fullPattern: 'Основы алгоритмизации и программирования', shortName: 'ОАиП' },
  { fullPattern: 'Алгоритмы и структуры данных', shortName: 'АиСД' },
  { fullPattern: 'Вычислительные системы, сети и телекоммуникации', shortName: 'ВССиТ' },
  { fullPattern: 'Информационно-коммуникационные технологии', shortName: 'ИКТ' },
  { fullPattern: 'Сети ЭВМ и телекоммуникации', shortName: 'Сети ЭВМ' },
  { fullPattern: 'Компьютерные сети', shortName: 'Сети' },
  { fullPattern: 'Информационная безопасность и защита информации', shortName: 'ИБ' },
  { fullPattern: 'Информационная безопасность', shortName: 'ИБ' },
  { fullPattern: 'Методы оптимизации', shortName: 'МетОпт' },
  { fullPattern: 'Системный анализ и принятие решений', shortName: 'Системный анализ' },
  { fullPattern: 'Разработка мобильных приложений', shortName: 'Мобилки' },
  { fullPattern: 'Web-программирование', shortName: 'Веб-прога' },
  { fullPattern: 'Веб-программирование', shortName: 'Веб-прога' },
  { fullPattern: 'Программная инженерия', shortName: 'Прог. инж.' },
  { fullPattern: 'Архитектура вычислительных систем', shortName: 'Архитектура ВС' },
  { fullPattern: 'Архитектура ЭВМ и систем', shortName: 'Архитектура ЭВМ' },
  { fullPattern: 'Основы российской государственности', shortName: 'ОРГ' },
  { fullPattern: 'История России', shortName: 'История' },
  { fullPattern: 'Общий курс железных дорог', shortName: 'ОКЖД' },
  { fullPattern: 'Инженерная и компьютерная графика', shortName: 'Инжграф' },
  { fullPattern: 'Метрология, стандартизация и сертификация', shortName: 'Метрология' },
  { fullPattern: 'Электротехника и электроника', shortName: 'Электротехника' },
];

export function normalizeLessonTypeLabel(rawType: string): string {
  const lower = rawType.trim().toLowerCase();
  if (lower.startsWith('лек')) return 'Лекция';
  if (lower.startsWith('практ') || lower === 'пр' || lower === 'пр.') return 'Практика';
  if (lower.startsWith('лаб') || lower === 'лр') return 'Лабораторная';
  if (lower.startsWith('экз')) return 'Экзамен';
  if (lower.includes('оценк') || lower.includes('диф')) return 'Зачет с оценкой';
  if (lower.startsWith('зач')) return 'Зачет';
  if (lower.startsWith('конс')) return 'Консультация';
  if (lower.startsWith('курс')) return 'Курсовой проект';
  return rawType.trim();
}

export function extractTypeAndCleanSubject(
  rawSubject: string,
  rawType: string = ''
): [string, string] {
  let text = rawSubject.trim().replace(/\s+/g, ' ');
  let detectedType = rawType.trim();

  const prefixMatch = LEADING_TYPE_PREFIX_REGEX.exec(text);
  const matchedPrefixType = prefixMatch?.[1] || prefixMatch?.[2];
  if (prefixMatch && matchedPrefixType) {
    if (!detectedType) {
      detectedType = normalizeLessonTypeLabel(matchedPrefixType);
    }
    text = text.slice(prefixMatch[0].length).trim();
  }

  const suffixMatch = TRAILING_TYPE_PARENS_REGEX.exec(text);
  if (suffixMatch && suffixMatch[1]) {
    if (!detectedType) {
      detectedType = normalizeLessonTypeLabel(suffixMatch[1]);
    }
    text = text.slice(0, suffixMatch.index).trim();
  }

  const finalSubject = text || rawSubject.trim();
  const finalType = detectedType ? normalizeLessonTypeLabel(detectedType) : '';
  return [finalSubject, finalType];
}

export function cleanSubjectTitle(rawSubject: string): string {
  return extractTypeAndCleanSubject(rawSubject, '')[0];
}

export function shortenSubject(
  rawSubject: string,
  enabled: boolean,
  customMap: Record<string, string> = {}
): string {
  const cleaned = cleanSubjectTitle(rawSubject);
  if (!enabled) return cleaned;

  for (const [pattern, short] of Object.entries(customMap)) {
    const cleanPattern = cleanSubjectTitle(pattern);
    if (cleanPattern && cleaned.toLowerCase().includes(cleanPattern.toLowerCase())) {
      return short;
    }
  }

  for (const rule of DEFAULT_ABBREVIATION_RULES) {
    if (cleaned.toLowerCase().includes(rule.fullPattern.toLowerCase())) {
      return rule.shortName;
    }
  }

  return cleaned;
}

export function formatShortLessonType(rawType: string): string {
  const lower = rawType.trim().toLowerCase();
  if (!lower) return 'ЗАН';
  if (lower.startsWith('практ') || lower === 'пр' || lower === 'пр.') return 'ПР';
  if (lower.startsWith('лек') || lower === 'л' || lower === 'л.') return 'Л';
  if (lower.startsWith('лаб') || lower === 'лр' || lower === 'л.р.') return 'ЛР';
  if (lower.startsWith('экз')) return 'ЭКЗ';
  if (lower.startsWith('зач')) return 'ЗАЧ';
  if (lower.startsWith('конс')) return 'КОНС';
  if (lower.startsWith('курс') || lower === 'кп') return 'КП';
  if (lower.startsWith('атт')) return 'АТТ';
  return rawType.trim().slice(0, 4).toUpperCase();
}

export function formatShortRoom(rawRoom: string): string {
  const cleaned = rawRoom
    .trim()
    .replace(/^(?:ауд\.?|аудитория|а\.|каб\.?)\s*/iu, '')
    .trim();
  if (!cleaned) return '';

  const lower = cleaned.toLowerCase();
  if (lower.includes('спортивный комплекс') || lower.includes('спорткомплекс')) {
    return 'Спорткомплекс';
  }
  if (lower.includes('спортзал') || lower.includes('спортивный зал')) {
    return 'Спортзал';
  }
  return `а. ${cleaned}`;
}

export function formatTeacherWithInitials(rawTeacher: string): string {
  const cleaned = rawTeacher.trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';

  if (cleaned.includes(',') || cleaned.includes(';')) {
    return cleaned
      .split(/[,;]/g)
      .map((part) => formatSingleTeacherName(part.trim()))
      .filter((s) => s.length > 0)
      .join(', ');
  }

  return formatSingleTeacherName(cleaned);
}

function formatSingleTeacherName(text: string): string {
  if (!text) return '';
  const rankNoiseRegex =
    /\b(?:доцент|профессор|ст\.?\s*преп(?:одаватель)?|преподаватель|ассистент|к\.?\s*т\.?\s*н\.?|д\.?\s*т\.?\s*н\.?|к\.?\s*ф\.?-м\.?\s*н\.?|к\.?\s*э\.?\s*н\.?|к\.?\s*и\.?\s*н\.?|к\.?\s*п\.?\s*н\.?|зав\.?\s*каф\.?)\b\.?/giu;
  const stripped = text
    .replace(rankNoiseRegex, ' ')
    .replace(/[()]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  if (!stripped) return text;
  if (/[А-ЯЁA-Z]\.\s*[А-ЯЁA-Z]\./u.test(stripped)) {
    return stripped;
  }

  const words = stripped.split(' ').filter(Boolean);
  if (words.length >= 3) {
    const surname = words[0];
    const firstInitial = words[1][0]?.toUpperCase() || '';
    const middleInitial = words[2][0]?.toUpperCase() || '';
    return `${surname} ${firstInitial}.${middleInitial}.`;
  }
  if (words.length === 2) {
    const surname = words[0];
    const second = words[1];
    if (second.length > 1) {
      return `${surname} ${second[0].toUpperCase()}.`;
    }
    return `${surname} ${second.toUpperCase()}.`;
  }
  return stripped;
}

export function isLessonExcludedByTeacher(
  teacherField: string,
  excludedTeachers: Set<string> | string[]
): boolean {
  const excludedList = Array.isArray(excludedTeachers)
    ? excludedTeachers
    : Array.from(excludedTeachers);
  if (excludedList.length === 0 || !teacherField.trim()) return false;

  const rawNorm = teacherField.trim().replace(/\s+/g, ' ').toLowerCase();
  const formattedNorm = formatTeacherWithInitials(teacherField).toLowerCase();

  return excludedList.some((excluded) => {
    const targetRaw = excluded.trim().replace(/\s+/g, ' ').toLowerCase();
    if (!targetRaw) return false;
    const targetFormatted = formatTeacherWithInitials(excluded).toLowerCase();
    const targetSurname = targetRaw.split(' ')[0] || '';

    return (
      rawNorm.includes(targetRaw) ||
      (targetFormatted.length > 0 && formattedNorm.includes(targetFormatted)) ||
      (targetSurname.length >= 4 &&
        rawNorm.includes(targetSurname) &&
        targetFormatted === formattedNorm)
    );
  });
}

export function mergeParallelDuplicateLessons(lessons: LessonItem[]): LessonItem[] {
  if (lessons.length <= 1) return lessons;

  const groups = new Map<string, LessonItem[]>();
  for (const lesson of lessons) {
    const key = [
      lesson.pairNumber,
      lesson.startTime.trim(),
      lesson.endTime.trim(),
      cleanSubjectTitle(lesson.rawSubject).toLowerCase(),
      formatShortLessonType(lesson.lessonType),
    ].join('|');
    const arr = groups.get(key) || [];
    arr.push(lesson);
    groups.set(key, arr);
  }

  const result: LessonItem[] = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      result.push(group[0]);
      continue;
    }

    const first = group[0];
    const mergedTeachersSet = new Set<string>();
    const mergedRoomsSet = new Set<string>();
    const mergedGroupsSet = new Set<string>();

    for (const item of group) {
      item.teacher
        .split(/[,;]/g)
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((t) => mergedTeachersSet.add(t));
      item.room
        .split(/[,;]/g)
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((r) => mergedRoomsSet.add(r));
      item.groups
        .split(/[,;]/g)
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((g) => mergedGroupsSet.add(g));
    }

    const itemWithHw = group.find((it) => it.homeworkText && it.homeworkText.trim().length > 0);
    const mergedOnlineLink =
      group.map((it) => it.onlineLink.trim()).find((l) => l.length > 0) || '';

    result.push({
      ...first,
      teacher: Array.from(mergedTeachersSet).join(', '),
      room: Array.from(mergedRoomsSet).join(', '),
      groups: Array.from(mergedGroupsSet).join(', '),
      onlineLink: mergedOnlineLink,
      homeworkText: itemWithHw ? itemWithHw.homeworkText : first.homeworkText,
      homeworkColorTag: itemWithHw ? itemWithHw.homeworkColorTag : first.homeworkColorTag,
      isHomeworkCompleted: itemWithHw
        ? itemWithHw.isHomeworkCompleted
        : first.isHomeworkCompleted,
    });
  }

  return result.sort(
    (a, b) => a.startMinutes - b.startMinutes || a.pairNumber - b.pairNumber
  );
}
