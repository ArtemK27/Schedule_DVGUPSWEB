import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanSubjectTitle,
  extractTypeAndCleanSubject,
  formatShortLessonType,
  formatShortRoom,
  formatTeacherWithInitials,
  isLessonExcludedByTeacher,
  shortenSubject,
} from './subjectAbbreviations';
import {
  buildWeekDaysList,
  calculateAcademicWeekNumber,
  formatWeekBanner,
  getMondayOfGivenWeek,
  parseIsoLocal,
} from './dateUtils';
import {
  buildHomeworkLessonKey,
  buildOfflineFallbackScheduleJson,
  matchHomeworkToDayLessons,
  parseScheduleJsonToMap,
} from './dvgupsApiClient';
import {
  parseLocallyToStructuredJsonBatch,
  resolveAgainstSchedule,
} from './aiHomeworkAssistant';
import { HomeworkColorTag, HomeworkEntity } from './scheduleModels';

test('SubjectAbbreviations extracts lesson type and shortens DVGUPS subjects', () => {
  const [cleaned, type] = extractTypeAndCleanSubject(
    'Лабораторные работы Современные технологии прикладного программирования',
    ''
  );
  assert.equal(cleaned, 'Современные технологии прикладного программирования');
  assert.equal(type, 'Лабораторная');

  assert.equal(shortenSubject(cleaned, true), 'СТПП');
  assert.equal(shortenSubject('Высшая математика', true), 'Вышмат');
  assert.equal(shortenSubject('Операционные системы', true), 'ОС');
  assert.equal(shortenSubject('Элективные курсы по физической культуре и спорту', true), 'Физ-ра');
  assert.equal(formatTeacherWithInitials('Сухобок Юрий Андреевич'), 'Сухобок Ю.А.');
  assert.equal(formatShortRoom('3430'), 'а. 3430');
  assert.equal(formatShortRoom('Спортивный комплекс'), 'Спорткомплекс');
  assert.equal(formatShortLessonType('Лабораторная'), 'ЛР');
  assert.equal(
    isLessonExcludedByTeacher('Сухобок Ю.А.', new Set(['Сухобок Юрий Андреевич'])),
    true
  );
});

test('DateUtils computes academic week number and builds 6-day week list', () => {
  const mondayIso = getMondayOfGivenWeek('2026-10-27');
  assert.equal(mondayIso, '2026-10-26');
  const mondayDate = parseIsoLocal(mondayIso)!;
  const weekNum = calculateAcademicWeekNumber(mondayDate);
  assert.equal(weekNum, 9);

  const banner = formatWeekBanner('2026-10-26', '2026-10-26');
  assert.equal(banner, '(9 неделя) 26.10.26-01.11.26 (текущая)');

  const rawJson = buildOfflineFallbackScheduleJson('БОМ21ПИА', '2026-10-26');
  const map = parseScheduleJsonToMap(rawJson, true, {}, []);
  const weekDays = buildWeekDaysList('2026-10-26', map);
  assert.equal(weekDays.length, 6);
  assert.equal(weekDays[0].dayOfWeekShort, 'ПН');
  assert.equal(weekDays[5].dayOfWeekShort, 'СБ');
  assert.ok(weekDays[0].lessons.length > 0);
});

test('Homework 1-to-1 matching attaches homework to specific pair and lesson type', () => {
  const rawJson = buildOfflineFallbackScheduleJson('БОМ21ПИА', '2026-10-26');
  const map = parseScheduleJsonToMap(rawJson, true, {}, []);
  const monLessons = map['2026-10-26'];
  assert.ok(monLessons && monLessons.length >= 2);

  const labHw: HomeworkEntity = {
    lessonKey: buildHomeworkLessonKey(
      'БОМ21ПИА',
      '2026-10-26',
      3,
      'Операционные системы',
      'Лабораторная'
    ),
    groupName: 'БОМ21ПИА',
    dateIso: '2026-10-26',
    pairNumber: 3,
    subject: cleanSubjectTitle('Операционные системы'),
    lessonType: 'Лабораторная',
    homeworkText: 'Защитить лабу №2 по процессам',
    colorTag: HomeworkColorTag.ORANGE,
    isCompleted: false,
    isOrphaned: false,
    updatedAtEpochMillis: Date.now(),
  };

  const matched = matchHomeworkToDayLessons(monLessons, [labHw]);
  assert.equal(matched.size, 1);
  const labLesson = monLessons.find((l) => l.pairNumber === 3)!;
  assert.equal(matched.get(labLesson.id)?.homeworkText, 'Защитить лабу №2 по процессам');
});

test('AI/NLP homework batch parser splits multi-task input and resolves against schedule', () => {
  const rawJson = buildOfflineFallbackScheduleJson('БОМ21ПИА', '2026-10-26');
  const map = parseScheduleJsonToMap(rawJson, true, {}, []);

  const drafts = parseLocallyToStructuredJsonBatch(
    'Англ упр 4-5 стр 18, а по ОС на следующую лабу защитить отчет №3'
  );
  assert.equal(drafts.length, 2);
  assert.equal(drafts[0].canonicalSubject, 'Иностранный язык');
  assert.equal(drafts[1].canonicalSubject, 'Операционные системы');
  assert.equal(drafts[1].lessonTypeHint, 'LAB');

  const resolved = resolveAgainstSchedule(drafts[1], map, '2026-10-25');
  assert.ok(resolved.matchedLesson);
  assert.equal(resolved.matchedLesson.shortSubject, 'ОС');
});

test('parseScheduleJsonToMap parses real 2D schedule array from dvgupstimetable.ru', () => {
  const realApiPayload = JSON.stringify({
    success: true,
    date: '26.10.2026',
    group: 'БОМ21ПИА',
    schedule: [
      [
        {
          classroom: 'а.  433',
          group: '',
          name: '(Лекции) Информационные системы и технологии',
          number: '08:05:00',
          teacher: 'Белозерова Светлана Ивановна',
        },
        {
          classroom: 'а.  413',
          group: '',
          name: '(Практика) Иностранный язык в профессиональной сфере',
          number: '09:50:00',
          teacher: 'Данилушкина Лариса Владимировна',
        },
      ],
      [
        {
          classroom: 'а. 1801',
          group: '',
          name: '(Практика) Высшая математика',
          number: '11:35:00',
          teacher: 'Кругликова Ольга Валерьевна',
        },
      ],
    ],
  });

  const map = parseScheduleJsonToMap(realApiPayload, true, {}, []);
  assert.ok(map['2026-10-26'], 'Monday 2026-10-26 should be parsed');
  assert.equal(map['2026-10-26'].length, 2);
  assert.equal(map['2026-10-26'][0].pairNumber, 1);
  assert.equal(map['2026-10-26'][0].startTime, '08:05');
  assert.equal(map['2026-10-26'][0].endTime, '09:35');
  assert.equal(map['2026-10-26'][0].lessonType, 'Лекция');
  assert.equal(map['2026-10-26'][0].rawSubject, 'Информационные системы и технологии');
  assert.equal(map['2026-10-26'][0].shortSubject, 'ИСиТ');

  assert.equal(map['2026-10-26'][1].pairNumber, 2);
  assert.equal(map['2026-10-26'][1].startTime, '09:50');
  assert.equal(map['2026-10-26'][1].shortSubject, 'Англ (проф)');

  assert.ok(map['2026-10-27'], 'Tuesday 2026-10-27 (offset 1) should be parsed');
  assert.equal(map['2026-10-27'][0].pairNumber, 3);
  assert.equal(map['2026-10-27'][0].startTime, '11:35');
  assert.equal(map['2026-10-27'][0].shortSubject, 'Вышмат');
});

