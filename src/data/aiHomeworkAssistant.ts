import {
  formatShortDayAndMonth,
  getIsoDayOfWeek,
  getTodayIso,
  parseIsoLocal,
} from './dateUtils';
import { HomeworkColorTag, LessonCategory, LessonItem } from './scheduleModels';
import { cleanSubjectTitle, shortenSubject } from './subjectAbbreviations';

export type TargetScheduleMode = 'NEXT_LESSON' | 'SPECIFIC_DAY' | 'EXPLICIT_DATE';

export interface AiStructuredHomeworkDraft {
  subjectQuery: string;
  canonicalSubject: string;
  homeworkText: string;
  targetMode: TargetScheduleMode;
  dayOfWeekIso?: number | null;
  explicitDateIso?: string | null;
  pairNumberHint?: number | null;
  lessonTypeHint?: string | null;
  colorTag: HomeworkColorTag;
}

export interface TargetLessonCandidate {
  lesson: LessonItem;
  dayLabel: string;
}

export interface AiResolvedHomeworkDraft {
  draft: AiStructuredHomeworkDraft;
  matchedLesson: LessonItem | null;
  alternativeCandidates: TargetLessonCandidate[];
  warningMessage?: string | null;
  usedRemoteAi: boolean;
}

const SUBJECT_SYNONYMS: Array<{ aliases: string[]; canonical: string }> = [
  {
    aliases: ['вышмат', 'вышке', 'вышка', 'матан', 'математике', 'математика', 'вм'],
    canonical: 'Высшая математика',
  },
  {
    aliases: ['дискретка', 'дискретке', 'дммл', 'дискретная математика'],
    canonical: 'Дискретная математика и математическая логика',
  },
  {
    aliases: ['ос', 'осям', 'операционки', 'операционным системам', 'операционные системы'],
    canonical: 'Операционные системы',
  },
  {
    aliases: ['стпп', 'прикладное программирование', 'современные технологии'],
    canonical: 'Современные технологии прикладного программирования',
  },
  {
    aliases: ['бд', 'базы данных', 'базам данных', 'субд'],
    canonical: 'Базы данных и экспертные системы',
  },
  {
    aliases: ['англ', 'английский', 'английскому', 'иняз', 'иностранный язык'],
    canonical: 'Иностранный язык',
  },
  {
    aliases: ['прога', 'проге', 'информатика', 'инфе', 'программирование'],
    canonical: 'Информатика и программирование',
  },
  {
    aliases: ['вссит', 'сети', 'сетям', 'вычислительные системы'],
    canonical: 'Вычислительные системы, сети и телекоммуникации',
  },
  {
    aliases: ['физра', 'физ-ра', 'физре', 'физкультура', 'спорт'],
    canonical: 'Элективные курсы по физической культуре и спорту',
  },
  {
    aliases: ['бжд', 'безопасность жизнедеятельности'],
    canonical: 'Безопасность жизнедеятельности',
  },
  {
    aliases: ['история', 'истории', 'история россии'],
    canonical: 'История России',
  },
];

const WEEKDAY_PATTERNS: Array<{ regex: RegExp; isoDow: number }> = [
  { regex: /(?<![а-яёa-z0-9])(?:на|в|во)?\s*(?:понедельник|пн)(?![а-яёa-z0-9])/iu, isoDow: 1 },
  { regex: /(?<![а-яёa-z0-9])(?:на|в|во)?\s*(?:вторник|вт)(?![а-яёa-z0-9])/iu, isoDow: 2 },
  { regex: /(?<![а-яёa-z0-9])(?:на|в|во)?\s*(?:среду|среда|ср)(?![а-яёa-z0-9])/iu, isoDow: 3 },
  { regex: /(?<![а-яёa-z0-9])(?:на|в|во)?\s*(?:четверг|чт)(?![а-яёa-z0-9])/iu, isoDow: 4 },
  { regex: /(?<![а-яёa-z0-9])(?:на|в|во)?\s*(?:пятницу|пятница|пт)(?![а-яёa-z0-9])/iu, isoDow: 5 },
  { regex: /(?<![а-яёa-z0-9])(?:на|в|во)?\s*(?:субботу|суббота|сб)(?![а-яёa-z0-9])/iu, isoDow: 6 },
];

export function splitCompoundHomeworkClauses(rawPrompt: string): string[] {
  const normalized = rawPrompt.trim();
  if (!normalized) return [];

  const lines = normalized
    .split(/\n+|;\s*|\s+(?:а\s+также|плюс)\s+|,?\s+а\s+(?=по\s+)/giu)
    .map((s) => s.trim())
    .filter(Boolean);

  const expanded: string[] = [];
  for (const line of lines) {
    const subParts = line
      .split(/,\s*(?=(?:по\s+|на\s+следующ|[а-яёa-z]{2,15}\s*[:—-]))/iu)
      .map((s) => s.trim())
      .filter(Boolean);
    expanded.push(...subParts);
  }
  return expanded.length > 0 ? expanded : [normalized];
}

export function parseSingleHomeworkClause(
  clause: string,
  availableSubjects: string[] = []
): AiStructuredHomeworkDraft {
  const working = clause.trim();

  let lessonTypeHint: string | null = null;
  if (/(?<![а-яёa-z0-9])(?:лаб[ауеы]?|лр|лабораторн[а-яё]*)(?![а-яёa-z0-9])/iu.test(working)) {
    lessonTypeHint = 'LAB';
  } else if (/(?<![а-яёa-z0-9])(?:лекц[ияюи]|лек)(?![а-яёa-z0-9])/iu.test(working)) {
    lessonTypeHint = 'LECTURE';
  } else if (/(?<![а-яёa-z0-9])(?:практ[икауе]?|семинар|пр)(?![а-яёa-z0-9])/iu.test(working)) {
    lessonTypeHint = 'PRACTICE';
  }

  let colorTag = HomeworkColorTag.MINT;
  if (/(?<![а-яёa-z0-9])(?:тест|контрольн[а-яё]*|кр|коллоквиум|экзамен|зачет)(?![а-яёa-z0-9])/iu.test(working)) {
    colorTag = HomeworkColorTag.RED;
  } else if (/(?<![а-яёa-z0-9])(?:лаб[ауеы]?|лр|защит[аыу]|практик[ауе])(?![а-яёa-z0-9])/iu.test(working)) {
    colorTag = HomeworkColorTag.ORANGE;
  } else if (/(?<![а-яёa-z0-9])(?:отчет|реферат|презентац[ияю]|доклад|конспект)(?![а-яёa-z0-9])/iu.test(working)) {
    colorTag = HomeworkColorTag.PURPLE;
  }

  let pairNumberHint: number | null = null;
  const pairMatch = /(?<![а-яёa-z0-9])(\d)\s*(?:-?[яйю]?\s*)?пар[аеуы](?![а-яёa-z0-9])/iu.exec(working);
  if (pairMatch) {
    pairNumberHint = Number(pairMatch[1]);
  }

  let targetMode: TargetScheduleMode = 'NEXT_LESSON';
  let dayOfWeekIso: number | null = null;
  let explicitDateIso: string | null = null;

  const dateMatch = /\b(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?\b/.exec(working);
  if (dateMatch) {
    const dd = String(Number(dateMatch[1])).padStart(2, '0');
    const mm = String(Number(dateMatch[2])).padStart(2, '0');
    const nowYear = new Date().getFullYear();
    const yyyy = dateMatch[3]
      ? dateMatch[3].length === 2
        ? `20${dateMatch[3]}`
        : dateMatch[3]
      : String(nowYear);
    explicitDateIso = `${yyyy}-${mm}-${dd}`;
    targetMode = 'EXPLICIT_DATE';
  } else {
    for (const wp of WEEKDAY_PATTERNS) {
      if (wp.regex.test(working)) {
        dayOfWeekIso = wp.isoDow;
        targetMode = 'SPECIFIC_DAY';
        break;
      }
    }
  }

  let matchedCanonical = '';
  let matchedAlias = '';

  for (const entry of SUBJECT_SYNONYMS) {
    for (const alias of entry.aliases) {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const reg = new RegExp(`(?<![а-яёa-z0-9])${escaped}(?![а-яёa-z0-9])`, 'iu');
      if (reg.test(working)) {
        matchedCanonical = entry.canonical;
        matchedAlias = alias;
        break;
      }
    }
    if (matchedCanonical) break;
  }

  if (!matchedCanonical && availableSubjects.length > 0) {
    for (const subj of availableSubjects) {
      const cleaned = cleanSubjectTitle(subj);
      const short = shortenSubject(cleaned, true);
      if (
        working.toLowerCase().includes(cleaned.toLowerCase()) ||
        (short.length >= 2 && working.toLowerCase().includes(short.toLowerCase()))
      ) {
        matchedCanonical = cleaned;
        matchedAlias = short;
        break;
      }
    }
  }

  let hwText = working;
  if (matchedAlias) {
    const escaped = matchedAlias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    hwText = hwText.replace(
      new RegExp(`^(?:по\\s+)?${escaped}\\s*[:—-]?\\s*`, 'iu'),
      ''
    );
  }
  hwText = hwText
    .replace(
      /^(?:на\s+следующ[уюийе]+\s+(?:пару|лабу|лекцию|практику|занятие|неделю)\s*)/iu,
      ''
    )
    .replace(/^(?:по\s+[а-яёa-z0-9-]+\s+)/iu, (m) => (matchedCanonical ? '' : m))
    .trim();

  if (!hwText) {
    hwText = working;
  }

  return {
    subjectQuery: matchedAlias || matchedCanonical || 'Предмет',
    canonicalSubject: matchedCanonical || availableSubjects[0] || 'Операционные системы',
    homeworkText: hwText.charAt(0).toUpperCase() + hwText.slice(1),
    targetMode,
    dayOfWeekIso,
    explicitDateIso,
    pairNumberHint,
    lessonTypeHint,
    colorTag,
  };
}

export function parseLocallyToStructuredJsonBatch(
  rawPrompt: string,
  availableSubjects: string[] = []
): AiStructuredHomeworkDraft[] {
  const clauses = splitCompoundHomeworkClauses(rawPrompt);
  return clauses.map((c) => parseSingleHomeworkClause(c, availableSubjects));
}

export function resolveAgainstSchedule(
  draft: AiStructuredHomeworkDraft,
  lessonsByDate: Record<string, LessonItem[]>,
  todayIso: string = getTodayIso()
): AiResolvedHomeworkDraft {
  const sortedDates = Object.keys(lessonsByDate)
    .filter((d) => d >= todayIso)
    .sort();

  const matchingSubjectLessons: LessonItem[] = [];
  const targetSubjNorm = cleanSubjectTitle(draft.canonicalSubject).toLowerCase();

  for (const dateIso of sortedDates) {
    const dayLessons = lessonsByDate[dateIso] || [];
    for (const lesson of dayLessons) {
      const lessonNorm = cleanSubjectTitle(lesson.rawSubject).toLowerCase();
      const shortNorm = lesson.shortSubject.toLowerCase();
      if (
        lessonNorm === targetSubjNorm ||
        lessonNorm.includes(targetSubjNorm) ||
        targetSubjNorm.includes(lessonNorm) ||
        shortNorm === draft.subjectQuery.toLowerCase()
      ) {
        matchingSubjectLessons.push(lesson);
      }
    }
  }

  const candidatePool =
    matchingSubjectLessons.length > 0
      ? matchingSubjectLessons
      : sortedDates.flatMap((d) => lessonsByDate[d] || []);

  let filteredPool = [...candidatePool];
  let warningMessage: string | null = null;

  if (draft.lessonTypeHint) {
    const byType = filteredPool.filter((l) => {
      if (draft.lessonTypeHint === 'LAB') return l.category === LessonCategory.LAB;
      if (draft.lessonTypeHint === 'LECTURE') return l.category === LessonCategory.LECTURE;
      if (draft.lessonTypeHint === 'PRACTICE') return l.category === LessonCategory.PRACTICE;
      return true;
    });
    if (byType.length > 0) {
      filteredPool = byType;
    }
  }

  let matchedLesson: LessonItem | null = null;

  if (draft.targetMode === 'EXPLICIT_DATE' && draft.explicitDateIso) {
    matchedLesson =
      filteredPool.find((l) => l.dateIso === draft.explicitDateIso) ||
      candidatePool.find((l) => l.dateIso === draft.explicitDateIso) ||
      null;
    if (!matchedLesson && filteredPool.length > 0) {
      matchedLesson = filteredPool[0];
      warningMessage = `На дату ${draft.explicitDateIso} пар по предмету не найдено — выбрана ближайшая пара.`;
    }
  } else if (draft.targetMode === 'SPECIFIC_DAY' && draft.dayOfWeekIso) {
    matchedLesson =
      filteredPool.find((l) => {
        const d = parseIsoLocal(l.dateIso);
        return d && getIsoDayOfWeek(d) === draft.dayOfWeekIso && l.dateIso > todayIso;
      }) || null;
    if (!matchedLesson && filteredPool.length > 0) {
      matchedLesson = filteredPool.find((l) => l.dateIso > todayIso) || filteredPool[0];
      warningMessage =
        'В указанный день недели пары по этому предмету нет — выбрана ближайшая пара по расписанию.';
    }
  } else {
    matchedLesson =
      filteredPool.find((l) => l.dateIso > todayIso) || filteredPool[0] || null;
  }

  if (draft.pairNumberHint && matchedLesson) {
    const exactPairSameDay = candidatePool.find(
      (l) =>
        l.dateIso === matchedLesson?.dateIso && l.pairNumber === draft.pairNumberHint
    );
    if (exactPairSameDay) {
      matchedLesson = exactPairSameDay;
    }
  }

  const alternativeCandidates: TargetLessonCandidate[] = candidatePool
    .slice(0, 8)
    .map((lesson) => ({
      lesson,
      dayLabel: `${formatShortDayAndMonth(lesson.dateIso)} • ${lesson.pairNumber} пара`,
    }));

  return {
    draft,
    matchedLesson,
    alternativeCandidates,
    warningMessage,
    usedRemoteAi: false,
  };
}

export async function analyzeHomeworkPromptBatch(
  rawPrompt: string,
  lessonsByDate: Record<string, LessonItem[]>,
  aiConfig?: { baseUrl: string; apiKey: string; model: string },
  todayIso: string = getTodayIso()
): Promise<AiResolvedHomeworkDraft[]> {
  const uniqueSubjects = Array.from(
    new Set(
      Object.values(lessonsByDate)
        .flat()
        .map((l) => cleanSubjectTitle(l.rawSubject))
    )
  );

  if (aiConfig && aiConfig.apiKey.trim() && aiConfig.baseUrl.trim()) {
    try {
      const cleanBase = aiConfig.baseUrl.trim().replace(/\/+$/, '');
      const endpoint = cleanBase.endsWith('/chat/completions')
        ? cleanBase
        : `${cleanBase}/chat/completions`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${aiConfig.apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: aiConfig.model.trim() || 'gpt-4o-mini',
          temperature: 0.1,
          messages: [
            {
              role: 'system',
              content: `Ты помощник расписания ДВГУПС. Доступные предметы: ${uniqueSubjects.join(
                ', '
              )}. Верни JSON массив объектов с полями: canonicalSubject, homeworkText, lessonTypeHint (LAB|LECTURE|PRACTICE|null), colorTag (MINT|ORANGE|RED|PURPLE).`,
            },
            { role: 'user', content: rawPrompt },
          ],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const content = String(data?.choices?.[0]?.message?.content || '');
        const jsonMatch = /\[[\s\S]*\]/.exec(content);
        if (jsonMatch) {
          const parsedArr = JSON.parse(jsonMatch[0]) as Array<Record<string, unknown>>;
          if (Array.isArray(parsedArr) && parsedArr.length > 0) {
            return parsedArr.map((item) => {
              const draft: AiStructuredHomeworkDraft = {
                subjectQuery: String(item.canonicalSubject || ''),
                canonicalSubject: String(item.canonicalSubject || uniqueSubjects[0] || ''),
                homeworkText: String(item.homeworkText || rawPrompt),
                targetMode: 'NEXT_LESSON',
                lessonTypeHint: item.lessonTypeHint ? String(item.lessonTypeHint) : null,
                colorTag:
                  (item.colorTag as HomeworkColorTag) || HomeworkColorTag.MINT,
              };
              const resolved = resolveAgainstSchedule(draft, lessonsByDate, todayIso);
              return { ...resolved, usedRemoteAi: true };
            });
          }
        }
      }
    } catch {
      // Fallback to local NLP
    }
  }

  const localDrafts = parseLocallyToStructuredJsonBatch(rawPrompt, uniqueSubjects);
  return localDrafts.map((draft) =>
    resolveAgainstSchedule(draft, lessonsByDate, todayIso)
  );
}
