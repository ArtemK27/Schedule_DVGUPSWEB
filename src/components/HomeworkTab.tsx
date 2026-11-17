import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  Calendar,
  CheckCircle2,
  Circle,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  AiResolvedHomeworkDraft,
  analyzeHomeworkPromptBatch,
} from '../data/aiHomeworkAssistant';
import { formatShortDayAndMonth } from '../data/dateUtils';
import {
  HOMEWORK_TAG_META,
  HomeworkColorTag,
  HomeworkFilterMode,
  HomeworkTaskItem,
  LessonItem,
} from '../data/scheduleModels';
import { cleanSubjectTitle, shortenSubject } from '../data/subjectAbbreviations';

interface HomeworkTabProps {
  selectedGroup: string;
  tasks: HomeworkTaskItem[];
  orphanedTasks: HomeworkTaskItem[];
  filterMode: HomeworkFilterMode;
  lessonsByDate: Record<string, LessonItem[]>;
  todayIso: string;
  currentWeekMondayIso: string;
  currentWeekSundayIso: string;
  abbreviationsEnabled: boolean;
  customAbbreviations: Record<string, string>;
  aiConfig: { baseUrl: string; apiKey: string; model: string };
  isDark: boolean;
  onChangeFilterMode: (mode: HomeworkFilterMode) => void;
  onToggleTaskCompleted: (task: HomeworkTaskItem) => void;
  onDeleteTask: (lessonKey: string) => void;
  onEditTaskInLessonSheet: (task: HomeworkTaskItem) => void;
  onAssignHomeworkToLesson: (
    lesson: LessonItem,
    text: string,
    colorTag: HomeworkColorTag,
    oldLessonKeyToRemove?: string
  ) => void;
}

export const HomeworkTab: React.FC<HomeworkTabProps> = ({
  selectedGroup,
  tasks,
  orphanedTasks,
  filterMode,
  lessonsByDate,
  todayIso,
  currentWeekMondayIso,
  currentWeekSundayIso,
  abbreviationsEnabled,
  customAbbreviations,
  aiConfig,
  isDark,
  onChangeFilterMode,
  onToggleTaskCompleted,
  onDeleteTask,
  onEditTaskInLessonSheet,
  onAssignHomeworkToLesson,
}) => {
  const [showManualSheet, setShowManualSheet] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [manualText, setManualText] = useState('');
  const [manualColorTag, setManualColorTag] = useState<HomeworkColorTag>(
    HomeworkColorTag.MINT
  );

  const [reassigningTask, setReassigningTask] = useState<HomeworkTaskItem | null>(
    null
  );

  const [showAiSheet, setShowAiSheet] = useState(false);
  const [aiPromptText, setAiPromptText] = useState('');
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [resolvedDrafts, setResolvedDrafts] = useState<AiResolvedHomeworkDraft[]>(
    []
  );

  const upcomingLessons = useMemo(() => {
    const dates = Object.keys(lessonsByDate)
      .filter((d) => d >= todayIso)
      .sort();
    const list: LessonItem[] = [];
    for (const d of dates) {
      for (const l of lessonsByDate[d] || []) {
        list.push(l);
      }
    }
    return list;
  }, [lessonsByDate, todayIso]);

  const availableSubjects = useMemo(() => {
    const set = new Set<string>();
    for (const l of upcomingLessons) {
      set.add(cleanSubjectTitle(l.rawSubject));
    }
    return Array.from(set);
  }, [upcomingLessons]);

  const lessonsForSelectedSubject = useMemo(() => {
    const subj = selectedSubject || availableSubjects[0] || '';
    return upcomingLessons
      .filter(
        (l) => cleanSubjectTitle(l.rawSubject).toLowerCase() === subj.toLowerCase()
      )
      .slice(0, 10);
  }, [upcomingLessons, selectedSubject, availableSubjects]);

  const upcomingCount = useMemo(
    () => tasks.filter((t) => !t.isCompleted && t.dateIso >= todayIso).length,
    [tasks, todayIso]
  );

  const weekCount = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.dateIso >= currentWeekMondayIso && t.dateIso <= currentWeekSundayIso
      ).length,
    [tasks, currentWeekMondayIso, currentWeekSundayIso]
  );

  const filteredTasks = useMemo(() => {
    if (filterMode === HomeworkFilterMode.CURRENT_WEEK) {
      return tasks.filter(
        (t) =>
          t.dateIso >= currentWeekMondayIso && t.dateIso <= currentWeekSundayIso
      );
    }
    return tasks;
  }, [tasks, filterMode, currentWeekMondayIso, currentWeekSundayIso]);

  const activeTasks = useMemo(
    () =>
      filteredTasks
        .filter((t) => !t.isCompleted)
        .sort((a, b) => a.dateIso.localeCompare(b.dateIso) || a.pairNumber - b.pairNumber),
    [filteredTasks]
  );

  const completedTasks = useMemo(
    () =>
      filteredTasks
        .filter((t) => t.isCompleted)
        .sort((a, b) => b.dateIso.localeCompare(a.dateIso) || a.pairNumber - b.pairNumber),
    [filteredTasks]
  );

  const groupedActiveByDate = useMemo(() => {
    const map = new Map<string, HomeworkTaskItem[]>();
    for (const t of activeTasks) {
      const arr = map.get(t.dateIso) || [];
      arr.push(t);
      map.set(t.dateIso, arr);
    }
    return Array.from(map.entries());
  }, [activeTasks]);

  const handleOpenManualSheet = () => {
    const firstSubj = availableSubjects[0] || '';
    setSelectedSubject(firstSubj);
    const firstLesson = upcomingLessons.find(
      (l) => cleanSubjectTitle(l.rawSubject).toLowerCase() === firstSubj.toLowerCase()
    );
    setSelectedLessonId(firstLesson?.id || '');
    setManualText('');
    setManualColorTag(HomeworkColorTag.MINT);
    setShowManualSheet(true);
  };

  const handleSaveManualHomework = () => {
    if (!manualText.trim()) return;
    const targetLesson =
      lessonsForSelectedSubject.find((l) => l.id === selectedLessonId) ||
      lessonsForSelectedSubject[0] ||
      upcomingLessons[0];
    if (!targetLesson) return;

    onAssignHomeworkToLesson(targetLesson, manualText.trim(), manualColorTag);
    setShowManualSheet(false);
    setManualText('');
  };

  const handleRunAiParser = async () => {
    if (!aiPromptText.trim()) return;
    setIsAiAnalyzing(true);
    try {
      const results = await analyzeHomeworkPromptBatch(
        aiPromptText,
        lessonsByDate,
        aiConfig,
        todayIso
      );
      setResolvedDrafts(results);
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const handleConfirmAiBatch = () => {
    for (const item of resolvedDrafts) {
      if (item.matchedLesson && item.draft.homeworkText.trim()) {
        onAssignHomeworkToLesson(
          item.matchedLesson,
          item.draft.homeworkText.trim(),
          item.draft.colorTag
        );
      }
    }
    setShowAiSheet(false);
    setAiPromptText('');
    setResolvedDrafts([]);
  };

  return (
    <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-2 select-none">
        <div className="flex items-center gap-2.5">
          <h1
            className={`text-xl font-extrabold tracking-tight ${
              isDark ? 'text-[#E6F2ED]' : 'text-[#1B2421]'
            }`}
          >
            Задания
          </h1>
          <span className="inline-flex items-center justify-center rounded-full bg-[#0E8158] px-2.5 py-0.5 text-xs font-bold text-white">
            {activeTasks.length}
          </span>
        </div>

        <button
          type="button"
          onClick={handleOpenManualSheet}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#0E8158] hover:bg-[#0A6343] active:scale-95 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Вручную</span>
        </button>
      </div>

      <div className="px-4 pb-2.5 flex items-center gap-2 select-none">
        <button
          type="button"
          onClick={() => onChangeFilterMode(HomeworkFilterMode.UPCOMING)}
          className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
            filterMode === HomeworkFilterMode.UPCOMING
              ? 'bg-[#0E8158] text-white shadow-sm'
              : isDark
              ? 'bg-[#14241E] text-[#8AA39B] border border-[#264B3E]'
              : 'bg-[#EBEAE4] text-[#5A6863]'
          }`}
        >
          Актуальные • {upcomingCount}
        </button>

        <button
          type="button"
          onClick={() => onChangeFilterMode(HomeworkFilterMode.CURRENT_WEEK)}
          className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
            filterMode === HomeworkFilterMode.CURRENT_WEEK
              ? 'bg-[#0E8158] text-white shadow-sm'
              : isDark
              ? 'bg-[#14241E] text-[#8AA39B] border border-[#264B3E]'
              : 'bg-[#EBEAE4] text-[#5A6863]'
          }`}
        >
          На неделе • {weekCount}
        </button>

        <span
          className={`ml-auto text-[11px] font-semibold ${
            isDark ? 'text-[#8AA39B]' : 'text-[#5A6863]'
          }`}
        >
          Группа: {selectedGroup}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pt-1 pb-28 overscroll-y-contain space-y-4">
        {orphanedTasks.length > 0 && (
          <div
            className={`rounded-2xl p-3.5 border ${
              isDark
                ? 'bg-[#D97706]/12 border-[#D97706]/40'
                : 'bg-[#FEF3C7] border-[#D97706]/40'
            }`}
          >
            <div className="flex items-center gap-2 text-[#D97706] font-bold text-xs uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Без привязки к паре • {orphanedTasks.length}</span>
            </div>
            <p
              className={`mt-1 text-xs ${
                isDark ? 'text-[#E6F2ED]/85' : 'text-[#1B2421]/85'
              }`}
            >
              В расписании изменилось время или тип занятия. Перенесите ДЗ на актуальную пару:
            </p>
            <div className="mt-2.5 space-y-2">
              {orphanedTasks.map((orph) => (
                <div
                  key={orph.lessonKey}
                  className={`rounded-xl p-2.5 border flex items-center justify-between gap-2 ${
                    isDark
                      ? 'bg-[#111F1A] border-[#264B3E]'
                      : 'bg-white border-[#D97706]/30'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">
                      {orph.shortSubject} • {orph.dayFormatted}
                    </div>
                    <div
                      className={`text-xs truncate ${
                        isDark ? 'text-[#8AA39B]' : 'text-[#5A6863]'
                      }`}
                    >
                      {orph.homeworkText}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setReassigningTask(orph)}
                      className="rounded-lg bg-[#0E8158] px-2.5 py-1.5 text-[11px] font-bold text-white cursor-pointer"
                    >
                      Привязать
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteTask(orph.lessonKey)}
                      className="p-1.5 text-[#EF4444] hover:bg-[#EF4444]/15 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {groupedActiveByDate.length === 0 && completedTasks.length === 0 && (
          <div
            className={`mt-4 rounded-3xl p-8 border flex flex-col items-center text-center select-none ${
              isDark
                ? 'bg-[#111F1A]/80 border-[#264B3E]/60'
                : 'bg-[#FAF9F5] border-[#0E8158]/15'
            }`}
          >
            <div className="w-16 h-16 rounded-2xl bg-[#0E8158]/15 flex items-center justify-center mb-3">
              <Sparkles className="w-8 h-8 text-[#0E8158]" />
            </div>
            <h3
              className={`text-base font-bold ${
                isDark ? 'text-[#E6F2ED]' : 'text-[#1B2421]'
              }`}
            >
              Домашних заданий пока нет
            </h3>
            <p
              className={`mt-1 text-xs max-w-[260px] leading-relaxed ${
                isDark ? 'text-[#8AA39B]' : 'text-[#5A6863]'
              }`}
            >
              Нажмите на любую пару в расписании, кнопку «+ Вручную» или умного помощника «✨», чтобы быстро записать ДЗ.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenManualSheet}
                className="rounded-xl bg-[#0E8158] px-4 py-2 text-xs font-bold text-white cursor-pointer"
              >
                + Добавить вручную
              </button>
              <button
                type="button"
                onClick={() => setShowAiSheet(true)}
                className={`rounded-xl px-4 py-2 text-xs font-bold border cursor-pointer ${
                  isDark
                    ? 'bg-[#172923] border-[#34D399]/40 text-[#34D399]'
                    : 'bg-[#E1EFE9] border-[#0E8158]/30 text-[#0E8158]'
                }`}
              >
                ✨ Умный ввод
              </button>
            </div>
          </div>
        )}

        {groupedActiveByDate.map(([dateIso, dateTasks]) => {
          const isOverdue = dateIso < todayIso;
          const headerLabel = isOverdue
            ? `Просрочено • ${formatShortDayAndMonth(dateIso)}`
            : dateIso === todayIso
            ? `На сегодня • ${formatShortDayAndMonth(dateIso)}`
            : `На ${formatShortDayAndMonth(dateIso)}`;

          return (
            <div key={dateIso} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <Calendar
                  className={`w-3.5 h-3.5 ${
                    isOverdue
                      ? 'text-[#EF4444]'
                      : isDark
                      ? 'text-[#34D399]'
                      : 'text-[#0E8158]'
                  }`}
                />
                <span
                  className={`text-xs font-extrabold uppercase tracking-wider ${
                    isOverdue
                      ? 'text-[#EF4444]'
                      : isDark
                      ? 'text-[#8AA39B]'
                      : 'text-[#5A6863]'
                  }`}
                >
                  {headerLabel}
                </span>
              </div>

              {dateTasks.map((task) => {
                const tagMeta = HOMEWORK_TAG_META[task.colorTag];
                const hex = isDark ? tagMeta.darkHex : tagMeta.lightHex;
                return (
                  <div
                    key={task.lessonKey}
                    className={`rounded-2xl p-3.5 border transition-all ${
                      isDark
                        ? 'bg-[#14241E]/90 border-[#28473C]'
                        : 'bg-[#FAF9F5] border-[#0E8158]/20 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => onToggleTaskCompleted(task)}
                        aria-label="Отметить выполненным"
                        className="mt-0.5 shrink-0 cursor-pointer"
                      >
                        <Circle className="w-5 h-5" style={{ color: hex }} />
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase"
                              style={{
                                backgroundColor: `${hex}24`,
                                color: hex,
                              }}
                            >
                              {tagMeta.shortLabel}
                            </span>
                            <span
                              className={`text-[11px] font-semibold ${
                                isDark ? 'text-[#8AA39B]' : 'text-[#5A6863]'
                              }`}
                            >
                              {task.pairNumber} пара ({task.startTime})
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setReassigningTask(task)}
                              title="Перенести на другую пару"
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isDark
                                  ? 'text-[#8AA39B] hover:bg-[#1D352C] hover:text-[#E6F2ED]'
                                  : 'text-[#5A6863] hover:bg-[#EBEAE4]'
                              }`}
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onEditTaskInLessonSheet(task)}
                              title="Редактировать"
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isDark
                                  ? 'text-[#8AA39B] hover:bg-[#1D352C] hover:text-[#E6F2ED]'
                                  : 'text-[#5A6863] hover:bg-[#EBEAE4]'
                              }`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteTask(task.lessonKey)}
                              title="Удалить"
                              className="p-1.5 rounded-lg text-[#EF4444]/80 hover:bg-[#EF4444]/15 hover:text-[#EF4444] transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <h4
                          className={`mt-1 text-[15px] font-bold ${
                            isDark ? 'text-[#E6F2ED]' : 'text-[#1B2421]'
                          }`}
                        >
                          {task.shortSubject}
                        </h4>

                        <p
                          className={`mt-1 text-[13.5px] leading-relaxed whitespace-pre-wrap break-words ${
                            isDark ? 'text-[#D0E4DC]' : 'text-[#2D3B36]'
                          }`}
                        >
                          {task.homeworkText}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {completedTasks.length > 0 && (
          <div className="pt-2 space-y-2">
            <div
              className={`text-xs font-extrabold uppercase tracking-wider px-1 ${
                isDark ? 'text-[#8AA39B]' : 'text-[#5A6863]'
              }`}
            >
              Выполнено • {completedTasks.length}
            </div>
            {completedTasks.map((task) => {
              const tagMeta = HOMEWORK_TAG_META[task.colorTag];
              const hex = isDark ? tagMeta.darkHex : tagMeta.lightHex;
              return (
                <div
                  key={task.lessonKey}
                  className={`rounded-2xl p-3 border opacity-65 transition-opacity ${
                    isDark
                      ? 'bg-[#111F1A]/70 border-[#244237]'
                      : 'bg-[#EBEAE4]/60 border-[#0E8158]/15'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => onToggleTaskCompleted(task)}
                      className="mt-0.5 shrink-0 cursor-pointer"
                    >
                      <CheckCircle2 className="w-5 h-5" style={{ color: hex }} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-xs font-bold ${
                            isDark ? 'text-[#E6F2ED]' : 'text-[#1B2421]'
                          }`}
                        >
                          {task.shortSubject} • {formatShortDayAndMonth(task.dateIso)}
                        </span>
                        <button
                          type="button"
                          onClick={() => onDeleteTask(task.lessonKey)}
                          className="p-1 text-[#EF4444]/80 hover:text-[#EF4444] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="mt-0.5 text-xs line-through truncate">
                        {task.homeworkText}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowAiSheet(true)}
        aria-label="Умное добавление ДЗ с ИИ"
        className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom,0px)+82px)] z-20 inline-flex items-center gap-2 rounded-2xl bg-[#0E8158] hover:bg-[#0A6343] active:scale-95 px-4 py-3.5 text-white font-bold text-xs shadow-[0_6px_20px_rgba(14,129,88,0.45)] transition-all cursor-pointer"
      >
        <Sparkles className="w-4 h-4" />
        <span>✨ ИИ-разбор ДЗ</span>
      </button>

      {showManualSheet && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-end justify-center"
          onClick={() => setShowManualSheet(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-lg rounded-t-3xl p-5 pb-safe-sheet border-t max-h-[88dvh] overflow-y-auto ${
              isDark
                ? 'bg-[#111F1A] border-[#264B3E] text-[#E6F2ED]'
                : 'bg-[#FAF9F5] border-[#0E8158]/20 text-[#1B2421]'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold">Новое задание</h3>
              <button
                type="button"
                onClick={() => setShowManualSheet(false)}
                className="p-1.5 rounded-full opacity-70 hover:opacity-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <label className="block text-xs font-bold uppercase tracking-wider opacity-75 mb-1.5">
              Предмет
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => {
                const subj = e.target.value;
                setSelectedSubject(subj);
                const firstMatch = upcomingLessons.find(
                  (l) => cleanSubjectTitle(l.rawSubject).toLowerCase() === subj.toLowerCase()
                );
                setSelectedLessonId(firstMatch?.id || '');
              }}
              className={`w-full rounded-xl px-3.5 py-2.5 text-base font-semibold border mb-3.5 focus:outline-none ${
                isDark
                  ? 'bg-[#172923] border-[#264B3E] text-[#E6F2ED]'
                  : 'bg-[#EBEAE4] border-[#0E8158]/25 text-[#1B2421]'
              }`}
            >
              {availableSubjects.map((subj) => (
                <option key={subj} value={subj}>
                  {shortenSubject(subj, abbreviationsEnabled, customAbbreviations)} — {subj}
                </option>
              ))}
            </select>

            <label className="block text-xs font-bold uppercase tracking-wider opacity-75 mb-1.5">
              На какую пару привязать
            </label>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-3">
              {lessonsForSelectedSubject.map((lesson) => {
                const selected = lesson.id === selectedLessonId;
                return (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => setSelectedLessonId(lesson.id)}
                    className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold border transition-all cursor-pointer ${
                      selected
                        ? 'bg-[#0E8158] border-[#34D399] text-white'
                        : isDark
                        ? 'bg-[#172923] border-[#264B3E] text-[#8AA39B]'
                        : 'bg-[#EBEAE4] border-[#0E8158]/20 text-[#5A6863]'
                    }`}
                  >
                    <div>{formatShortDayAndMonth(lesson.dateIso)}</div>
                    <div className="text-[10px] opacity-85">
                      {lesson.pairNumber} пара • {lesson.lessonType}
                    </div>
                  </button>
                );
              })}
            </div>

            <label className="block text-xs font-bold uppercase tracking-wider opacity-75 mb-1.5">
              Категория задания
            </label>
            <div className="grid grid-cols-2 gap-2 mb-3.5">
              {(Object.keys(HOMEWORK_TAG_META) as HomeworkColorTag[]).map((tag) => {
                const meta = HOMEWORK_TAG_META[tag];
                const active = manualColorTag === tag;
                const hex = isDark ? meta.darkHex : meta.lightHex;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setManualColorTag(tag)}
                    className="rounded-xl px-3 py-2 text-xs font-bold border flex items-center gap-2 transition-all cursor-pointer"
                    style={{
                      backgroundColor: active ? `${hex}28` : 'transparent',
                      borderColor: active ? hex : isDark ? '#264B3E' : '#D1D5DB',
                      color: active ? hex : undefined,
                    }}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: hex }}
                    />
                    <span className="truncate">{meta.shortLabel}</span>
                  </button>
                );
              })}
            </div>

            <label className="block text-xs font-bold uppercase tracking-wider opacity-75 mb-1.5">
              Текст домашнего задания
            </label>
            <textarea
              rows={3}
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Например: решить задачи №14–18, подготовить отчёт к лабораторной..."
              className={`w-full rounded-2xl p-3.5 text-base border focus:outline-none ${
                isDark
                  ? 'bg-[#172923] border-[#264B3E] text-[#E6F2ED] placeholder-[#8AA39B]/60'
                  : 'bg-[#EBEAE4] border-[#0E8158]/25 text-[#1B2421] placeholder-[#5A6863]/60'
              }`}
            />

            <button
              type="button"
              onClick={handleSaveManualHomework}
              disabled={!manualText.trim()}
              className="mt-4 w-full rounded-2xl bg-[#0E8158] disabled:opacity-40 py-3.5 text-sm font-extrabold text-white cursor-pointer"
            >
              Сохранить задание
            </button>
          </div>
        </div>
      )}

      {reassigningTask && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-end justify-center"
          onClick={() => setReassigningTask(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-lg rounded-t-3xl p-5 pb-safe-sheet border-t max-h-[80dvh] overflow-y-auto ${
              isDark
                ? 'bg-[#111F1A] border-[#264B3E] text-[#E6F2ED]'
                : 'bg-[#FAF9F5] border-[#0E8158]/20 text-[#1B2421]'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-extrabold">
                Перенести ДЗ • {reassigningTask.shortSubject}
              </h3>
              <button
                type="button"
                onClick={() => setReassigningTask(null)}
                className="p-1.5 rounded-full opacity-70 hover:opacity-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs opacity-80 mb-3">{reassigningTask.homeworkText}</p>
            <div className="space-y-2">
              {upcomingLessons
                .filter(
                  (l) =>
                    cleanSubjectTitle(l.rawSubject).toLowerCase() ===
                    cleanSubjectTitle(reassigningTask.subject).toLowerCase()
                )
                .slice(0, 8)
                .map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => {
                      onAssignHomeworkToLesson(
                        candidate,
                        reassigningTask.homeworkText,
                        reassigningTask.colorTag,
                        reassigningTask.lessonKey
                      );
                      setReassigningTask(null);
                    }}
                    className={`w-full rounded-xl p-3 border text-left flex items-center justify-between cursor-pointer ${
                      isDark
                        ? 'bg-[#172923] border-[#264B3E] hover:border-[#34D399]'
                        : 'bg-[#EBEAE4] border-[#0E8158]/20 hover:border-[#0E8158]'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">
                        {formatShortDayAndMonth(candidate.dateIso)} • {candidate.pairNumber} пара
                      </div>
                      <div className="text-[11px] opacity-75">
                        {candidate.lessonType} ({candidate.startTime}–{candidate.endTime})
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#34D399]">Выбрать →</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {showAiSheet && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-end justify-center"
          onClick={() => setShowAiSheet(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-lg rounded-t-3xl p-5 pb-safe-sheet border-t max-h-[90dvh] overflow-y-auto ${
              isDark
                ? 'bg-[#111F1A] border-[#264B3E] text-[#E6F2ED]'
                : 'bg-[#FAF9F5] border-[#0E8158]/20 text-[#1B2421]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#34D399]" />
                <h3 className="text-lg font-extrabold">ИИ-помощник домашних заданий</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAiSheet(false)}
                className="p-1.5 rounded-full opacity-70 hover:opacity-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs opacity-80 mb-3 leading-relaxed">
              Напишите одно или сразу несколько заданий обычным текстом — система сама распознает предметы ДВГУПС, тип пары (лаба/лекция/практика) и подберёт нужную дату в расписании.
            </p>

            <textarea
              rows={3}
              value={aiPromptText}
              onChange={(e) => setAiPromptText(e.target.value)}
              placeholder="Например: Англ упр 4 стр 18, а по ОС на следующую лабу защитить отчет №3"
              className={`w-full rounded-2xl p-3.5 text-base border focus:outline-none ${
                isDark
                  ? 'bg-[#172923] border-[#264B3E] text-[#E6F2ED] placeholder-[#8AA39B]/60'
                  : 'bg-[#EBEAE4] border-[#0E8158]/25 text-[#1B2421] placeholder-[#5A6863]/60'
              }`}
            />

            <div className="mt-2.5 flex items-center gap-2">
              <button
                type="button"
                onClick={handleRunAiParser}
                disabled={isAiAnalyzing || !aiPromptText.trim()}
                className="flex-1 rounded-xl bg-[#0E8158] disabled:opacity-40 py-2.5 text-xs font-extrabold text-white cursor-pointer"
              >
                {isAiAnalyzing ? 'Разбираем...' : 'Разобрать по расписанию'}
              </button>
              <button
                type="button"
                onClick={() =>
                  setAiPromptText(
                    'Англ упр 4 стр 18, а по ОС на следующую лабу защитить отчет №3'
                  )
                }
                className={`rounded-xl px-3 py-2.5 text-xs font-bold border cursor-pointer ${
                  isDark
                    ? 'bg-[#172923] border-[#264B3E] text-[#34D399]'
                    : 'bg-[#E1EFE9] border-[#0E8158]/25 text-[#0E8158]'
                }`}
              >
                Пример
              </button>
            </div>

            {resolvedDrafts.length > 0 && (
              <div className="mt-4 space-y-3">
                <div className="text-xs font-extrabold uppercase tracking-wider opacity-80">
                  Найдено заданий: {resolvedDrafts.length}
                </div>
                {resolvedDrafts.map((item, idx) => {
                  const tagMeta = HOMEWORK_TAG_META[item.draft.colorTag];
                  const hex = isDark ? tagMeta.darkHex : tagMeta.lightHex;
                  return (
                    <div
                      key={idx}
                      className={`rounded-2xl p-3.5 border ${
                        isDark
                          ? 'bg-[#172923] border-[#264B3E]'
                          : 'bg-[#EBEAE4] border-[#0E8158]/20'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-extrabold">
                          {shortenSubject(
                            item.draft.canonicalSubject,
                            abbreviationsEnabled,
                            customAbbreviations
                          )}
                        </span>
                        <span
                          className="rounded-md px-2 py-0.5 text-[10px] font-bold"
                          style={{ backgroundColor: `${hex}25`, color: hex }}
                        >
                          {tagMeta.shortLabel}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-medium">{item.draft.homeworkText}</p>
                      {item.warningMessage && (
                        <p className="mt-1 text-[11px] text-[#FBBF24]">
                          ⚠️ {item.warningMessage}
                        </p>
                      )}

                      <div className="mt-2 flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                        {item.alternativeCandidates.map((cand) => {
                          const isSelected =
                            item.matchedLesson?.id === cand.lesson.id;
                          return (
                            <button
                              key={cand.lesson.id}
                              type="button"
                              onClick={() => {
                                setResolvedDrafts((prev) =>
                                  prev.map((r, rIdx) =>
                                    rIdx === idx
                                      ? { ...r, matchedLesson: cand.lesson }
                                      : r
                                  )
                                );
                              }}
                              className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold border cursor-pointer ${
                                isSelected
                                  ? 'bg-[#0E8158] border-[#34D399] text-white'
                                  : isDark
                                  ? 'bg-[#111F1A] border-[#264B3E] text-[#8AA39B]'
                                  : 'bg-white border-[#0E8158]/20 text-[#5A6863]'
                              }`}
                            >
                              {cand.dayLabel} ({cand.lesson.lessonType})
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={handleConfirmAiBatch}
                  className="w-full rounded-2xl bg-[#0E8158] py-3.5 text-sm font-extrabold text-white shadow-md cursor-pointer"
                >
                  Сохранить все ({resolvedDrafts.length}) в расписание
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
