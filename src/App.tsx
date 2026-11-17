import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckSquare, User } from 'lucide-react';
import {
  addDaysIso,
  buildWeekDaysList,
  formatShortDayAndMonth,
  formatWeekBanner,
  getCurrentMinutesOfDay,
  getMondayOfCurrentWeek,
  getMondayOfGivenWeek,
  getNearbyAcademicWeeks,
  getTodayIso,
} from './data/dateUtils';
import {
  buildHomeworkLessonKey,
  buildOfflineFallbackScheduleJson,
  DEFAULT_AUDITORIUMS_DIRECTORY,
  DEFAULT_TEACHERS_DIRECTORY,
  fetchAllGroupsFromApi,
  fetchAuditoriumsDirectoryFromApi,
  fetchGroupScheduleFromApi,
  fetchTeacherOrRoomScheduleFromApi,
  fetchTeachersDirectoryFromApi,
  matchHomeworkToDayLessons,
  parseScheduleJsonToMap,
} from './data/dvgupsApiClient';
import {
  AppThemeMode,
  AuditoriumDirectoryItem,
  CurrentStatusInfo,
  CurrentStatusType,
  DEFAULT_DVGUPS_GROUPS,
  DVGUPS_BELL_SLOTS,
  HomeworkColorTag,
  HomeworkEntity,
  HomeworkFilterMode,
  HomeworkTaskItem,
  LessonItem,
  LookupModeType,
  MainAppTab,
  parseHomeworkColorTag,
  ScheduleLookupTarget,
  TeacherDirectoryItem,
} from './data/scheduleModels';
import {
  loadAllHomeworkEntities,
  loadCachedDirectoriesSync,
  loadCachedGroupsList,
  loadCachedScheduleJson,
  loadUserPreferences,
  saveAllHomeworkEntities,
  saveCachedDirectories,
  saveCachedGroupsList,
  saveCachedScheduleJson,
  saveUserPreferences,
  UserPreferencesState,
} from './data/storage';
import {
  cleanSubjectTitle,
  shortenSubject,
} from './data/subjectAbbreviations';
import { HomeworkTab } from './components/HomeworkTab';
import {
  ApiInspectorBottomSheet,
  GroupSelectorBottomSheet,
  LessonDetailBottomSheet,
  LookupLessonInfoBottomSheet,
  ScheduleLookupBottomSheet,
  WeekPickerBottomSheet,
} from './components/ModalsAndSheets';
import { ProfileTab } from './components/ProfileTab';
import { ScheduleTab } from './components/ScheduleTab';

export const App: React.FC = () => {
  // User Preferences & Persistent State
  const [prefs, setPrefs] = useState<UserPreferencesState>(() =>
    loadUserPreferences()
  );
  const [activeTab, setActiveTab] = useState<MainAppTab>(MainAppTab.SCHEDULE);

  // Date & Week Navigation
  const [todayIso, setTodayIso] = useState<string>(() => getTodayIso());
  const [currentMinutes, setCurrentMinutes] = useState<number>(() =>
    getCurrentMinutesOfDay()
  );
  const [selectedWeekMondayIso, setSelectedWeekMondayIso] = useState<string>(() =>
    getMondayOfCurrentWeek()
  );
  const [selectedDateIso, setSelectedDateIso] = useState<string>(() => {
    const today = getTodayIso();
    const monday = getMondayOfCurrentWeek();
    const saturday = addDaysIso(monday, 5);
    return today > saturday ? monday : today;
  });

  // Schedule & Homework Entities
  const [rawScheduleJson, setRawScheduleJson] = useState<string>(() =>
    buildOfflineFallbackScheduleJson(prefs.selectedGroup)
  );
  const [homeworkEntities, setHomeworkEntities] = useState<HomeworkEntity[]>([]);
  const [availableGroups, setAvailableGroups] =
    useState<string[]>(DEFAULT_DVGUPS_GROUPS);
  const [teachersDir, setTeachersDir] = useState<TeacherDirectoryItem[]>(
    DEFAULT_TEACHERS_DIRECTORY
  );
  const [auditoriumsDir, setAuditoriumsDir] = useState<AuditoriumDirectoryItem[]>(
    DEFAULT_AUDITORIUMS_DIRECTORY
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFromNetwork, setIsFromNetwork] = useState<boolean>(false);

  // Teacher / Auditorium Lookup Mode
  const [activeLookupTarget, setActiveLookupTarget] =
    useState<ScheduleLookupTarget | null>(null);
  const [lookupWeekOffset, setLookupWeekOffset] = useState<number>(0);
  const [rawLookupJson, setRawLookupJson] = useState<string>('');

  // Homework Tab Filter
  const [homeworkFilterMode, setHomeworkFilterMode] =
    useState<HomeworkFilterMode>(HomeworkFilterMode.UPCOMING);

  // Modals & Bottom Sheets
  const [showWeekPicker, setShowWeekPicker] = useState(false);
  const [showGroupSelector, setShowGroupSelector] = useState(false);
  const [showLookupSheet, setShowLookupSheet] = useState(false);
  const [showApiInspector, setShowApiInspector] = useState(false);
  const [selectedLessonForSheet, setSelectedLessonForSheet] =
    useState<LessonItem | null>(null);
  const [selectedLookupLesson, setSelectedLookupLesson] =
    useState<LessonItem | null>(null);

  // System dark mode listener
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : true
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const isDark =
    prefs.appThemeMode === AppThemeMode.DARK ||
    (prefs.appThemeMode === AppThemeMode.SYSTEM && systemPrefersDark);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    document.body.style.backgroundColor = isDark ? '#09120F' : '#F3F1EC';
    document.body.style.color = isDark ? '#E6F2ED' : '#1B2421';
  }, [isDark]);

  // Save prefs whenever updated
  const updatePrefs = useCallback(
    (updater: (prev: UserPreferencesState) => UserPreferencesState) => {
      setPrefs((prev) => {
        const next = updater(prev);
        saveUserPreferences(next);
        return next;
      });
    },
    []
  );

  // Clock ticker every 30s to keep live pair status fresh
  useEffect(() => {
    const interval = setInterval(() => {
      setTodayIso(getTodayIso());
      setCurrentMinutes(getCurrentMinutesOfDay());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load cached data first for instant display, then always sync live schedule from dvgupstimetable.ru
  const refreshSchedule = useCallback(
    async (
      groupToFetch: string = prefs.selectedGroup,
      weekMondayIso: string = selectedWeekMondayIso,
      existingJson?: string,
      overrideBaseUrl: string = prefs.apiBaseUrl,
      overrideProxyUrl: string = prefs.corsProxyUrl
    ) => {
      setIsLoading(true);
      try {
        const schedRes = await fetchGroupScheduleFromApi(
          overrideBaseUrl,
          groupToFetch,
          weekMondayIso,
          existingJson,
          overrideProxyUrl
        );

        const nowTs = Date.now();
        setRawScheduleJson(schedRes.rawJson);
        setIsFromNetwork(schedRes.isFromNetwork);
        await saveCachedScheduleJson(groupToFetch, schedRes.rawJson, nowTs);
        updatePrefs((p) => ({ ...p, lastUpdatedTimestamp: nowTs }));
      } finally {
        setIsLoading(false);
      }
    },
    [
      prefs.apiBaseUrl,
      prefs.corsProxyUrl,
      prefs.selectedGroup,
      selectedWeekMondayIso,
      updatePrefs,
    ]
  );

  // Sync directories (all groups, teachers, auditoriums) on mount or when server/proxy changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [cachedHw, cachedGroups] = await Promise.all([
        loadAllHomeworkEntities(),
        loadCachedGroupsList(),
      ]);
      if (cancelled) return;
      if (cachedHw.length > 0) setHomeworkEntities(cachedHw);
      if (cachedGroups.length > 0) setAvailableGroups(cachedGroups);

      const syncDirs = loadCachedDirectoriesSync();
      if (syncDirs.teachers?.length) setTeachersDir(syncDirs.teachers);
      if (syncDirs.auditoriums?.length) setAuditoriumsDir(syncDirs.auditoriums);

      const [groupsRes, teachersRes, roomsRes] = await Promise.all([
        fetchAllGroupsFromApi(prefs.apiBaseUrl, prefs.corsProxyUrl),
        fetchTeachersDirectoryFromApi(prefs.apiBaseUrl, prefs.corsProxyUrl),
        fetchAuditoriumsDirectoryFromApi(prefs.apiBaseUrl, prefs.corsProxyUrl),
      ]);
      if (cancelled) return;

      if (groupsRes.length > 0) {
        setAvailableGroups(groupsRes);
        await saveCachedGroupsList(groupsRes);
      }
      if (teachersRes.length > 0 && roomsRes.length > 0) {
        setTeachersDir(teachersRes);
        setAuditoriumsDir(roomsRes);
        await saveCachedDirectories(teachersRes, roomsRes);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [prefs.apiBaseUrl, prefs.corsProxyUrl]);

  // Whenever selectedGroup, selectedWeekMondayIso, apiBaseUrl, or corsProxyUrl changes: load cached schedule immediately and fetch live from API
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    (async () => {
      try {
        const cachedSched = await loadCachedScheduleJson(prefs.selectedGroup);
        if (cancelled) return;

        let currentRaw = '';
        if (cachedSched && cachedSched.rawJson.trim()) {
          try {
            const parsedCache = JSON.parse(cachedSched.rawJson) as Record<
              string,
              unknown
            >;
            if (
              parsedCache.source === 'dvgups-network' &&
              String(parsedCache.group || '').toUpperCase() ===
                prefs.selectedGroup.trim().toUpperCase()
            ) {
              currentRaw = cachedSched.rawJson;
              setRawScheduleJson(cachedSched.rawJson);
              setIsFromNetwork(true);
            }
          } catch {
            // Ignore malformed cache
          }
        }

        const schedRes = await fetchGroupScheduleFromApi(
          prefs.apiBaseUrl,
          prefs.selectedGroup,
          selectedWeekMondayIso,
          currentRaw,
          prefs.corsProxyUrl
        );
        if (cancelled) return;

        const nowTs = Date.now();
        setRawScheduleJson(schedRes.rawJson);
        setIsFromNetwork(schedRes.isFromNetwork);
        await saveCachedScheduleJson(
          prefs.selectedGroup,
          schedRes.rawJson,
          nowTs
        );
        updatePrefs((p) => ({ ...p, lastUpdatedTimestamp: nowTs }));
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    prefs.selectedGroup,
    selectedWeekMondayIso,
    prefs.apiBaseUrl,
    prefs.corsProxyUrl,
    updatePrefs,
  ]);

  // Group schedule map (parsed with abbreviations, teacher exclusions, and homework)
  const groupHomeworkEntities = useMemo(
    () =>
      homeworkEntities.filter(
        (hw) =>
          hw.groupName.trim().toUpperCase() ===
          prefs.selectedGroup.trim().toUpperCase()
      ),
    [homeworkEntities, prefs.selectedGroup]
  );

  const lessonsByDate = useMemo(
    () =>
      parseScheduleJsonToMap(
        rawScheduleJson,
        prefs.abbreviationsEnabled,
        prefs.customAbbreviations,
        groupHomeworkEntities,
        new Set(prefs.excludedTeachers)
      ),
    [
      rawScheduleJson,
      prefs.abbreviationsEnabled,
      prefs.customAbbreviations,
      groupHomeworkEntities,
      prefs.excludedTeachers,
    ]
  );

  // Lookup schedule map when viewing a Teacher or Auditorium
  const lookupLessonsByDate = useMemo(() => {
    if (!activeLookupTarget || !rawLookupJson) return {};
    return parseScheduleJsonToMap(
      rawLookupJson,
      prefs.abbreviationsEnabled,
      prefs.customAbbreviations,
      [],
      new Set()
    );
  }, [
    activeLookupTarget,
    rawLookupJson,
    prefs.abbreviationsEnabled,
    prefs.customAbbreviations,
  ]);

  const effectiveWeekMondayIso = useMemo(() => {
    if (activeLookupTarget) {
      return addDaysIso(getMondayOfCurrentWeek(), lookupWeekOffset * 7);
    }
    return selectedWeekMondayIso;
  }, [activeLookupTarget, lookupWeekOffset, selectedWeekMondayIso]);

  const activeScheduleMap = activeLookupTarget
    ? lookupLessonsByDate
    : lessonsByDate;

  const weekDays = useMemo(
    () => buildWeekDaysList(effectiveWeekMondayIso, activeScheduleMap),
    [effectiveWeekMondayIso, activeScheduleMap]
  );

  // Keep selectedDateIso aligned inside current weekDays
  useEffect(() => {
    if (weekDays.length === 0) return;
    const exists = weekDays.some((d) => d.dateIso === selectedDateIso);
    if (!exists) {
      const todayInWeek = weekDays.find((d) => d.dateIso === todayIso);
      setSelectedDateIso(todayInWeek ? todayInWeek.dateIso : weekDays[0].dateIso);
    }
  }, [weekDays, selectedDateIso, todayIso]);

  const weekBannerText = useMemo(
    () => formatWeekBanner(effectiveWeekMondayIso, getMondayOfCurrentWeek()),
    [effectiveWeekMondayIso]
  );

  const nearbyWeeks = useMemo(
    () =>
      getNearbyAcademicWeeks(
        selectedWeekMondayIso,
        getMondayOfCurrentWeek()
      ),
    [selectedWeekMondayIso]
  );

  // Live Current Status Calculation (Active Pair or Break)
  const currentStatus: CurrentStatusInfo = useMemo(() => {
    const todayLessons = lessonsByDate[todayIso] || [];
    if (todayLessons.length === 0) {
      return {
        type: CurrentStatusType.NO_CLASSES_TODAY,
        headline: 'Сегодня пар нет',
        subline: 'Свободный день',
      };
    }

    for (const lesson of todayLessons) {
      if (
        currentMinutes >= lesson.startMinutes &&
        currentMinutes < lesson.endMinutes
      ) {
        const rem = lesson.endMinutes - currentMinutes;
        const total = Math.max(1, lesson.endMinutes - lesson.startMinutes);
        return {
          type: CurrentStatusType.ACTIVE_LESSON,
          headline: `Сейчас: ${lesson.shortSubject}`,
          subline: `${lesson.pairNumber} пара • до ${lesson.endTime}`,
          remainingMinutes: rem,
          progressFraction: (currentMinutes - lesson.startMinutes) / total,
          activeLessonId: lesson.id,
        };
      }
    }

    const nextLesson = todayLessons.find((l) => l.startMinutes > currentMinutes);
    if (nextLesson) {
      const rem = nextLesson.startMinutes - currentMinutes;
      return {
        type: CurrentStatusType.UPCOMING_BREAK,
        headline: `Далее: ${nextLesson.shortSubject}`,
        subline: `Начало в ${nextLesson.startTime}`,
        remainingMinutes: rem,
      };
    }

    return {
      type: CurrentStatusType.CLASSES_FINISHED,
      headline: 'Пары на сегодня завершены',
      subline: 'Хорошего отдыха!',
    };
  }, [lessonsByDate, todayIso, currentMinutes]);

  // Build HomeworkTaskItem list and detect orphaned homework
  const { activeGroupTasks, orphanedGroupTasks } = useMemo(() => {
    const matchedKeys = new Set<string>();
    for (const [dateIso, dayLessons] of Object.entries(lessonsByDate)) {
      const dayHws = groupHomeworkEntities.filter((h) => h.dateIso === dateIso);
      const map = matchHomeworkToDayLessons(dayLessons, dayHws);
      for (const hw of map.values()) {
        matchedKeys.add(hw.lessonKey);
      }
    }

    const tasks: HomeworkTaskItem[] = [];
    const orphaned: HomeworkTaskItem[] = [];

    for (const entity of groupHomeworkEntities) {
      if (!entity.homeworkText.trim()) continue;
      const slot =
        DVGUPS_BELL_SLOTS.find((s) => s.pairNumber === entity.pairNumber) ||
        DVGUPS_BELL_SLOTS[0];
      const isOrphaned = !matchedKeys.has(entity.lessonKey);

      const item: HomeworkTaskItem = {
        lessonKey: entity.lessonKey,
        groupName: entity.groupName,
        dateIso: entity.dateIso,
        dayFormatted: formatShortDayAndMonth(entity.dateIso),
        pairNumber: entity.pairNumber,
        startTime: slot.startTime,
        endTime: slot.endTime,
        subject: entity.subject,
        shortSubject: shortenSubject(
          entity.subject,
          prefs.abbreviationsEnabled,
          prefs.customAbbreviations
        ),
        lessonType: entity.lessonType,
        homeworkText: entity.homeworkText,
        colorTag: parseHomeworkColorTag(entity.colorTag),
        isCompleted: entity.isCompleted,
        isOrphaned,
        updatedAtEpochMillis: entity.updatedAtEpochMillis,
      };

      if (isOrphaned) {
        orphaned.push(item);
      }
      tasks.push(item);
    }

    return { activeGroupTasks: tasks, orphanedGroupTasks: orphaned };
  }, [
    groupHomeworkEntities,
    lessonsByDate,
    prefs.abbreviationsEnabled,
    prefs.customAbbreviations,
  ]);

  // Save / Update / Delete Homework Handler
  const handleSaveHomeworkForLesson = useCallback(
    async (
      lesson: LessonItem,
      text: string,
      colorTag: HomeworkColorTag,
      isCompleted: boolean,
      oldLessonKeyToRemove?: string
    ) => {
      const cleanText = text.trim();
      const lessonKey = buildHomeworkLessonKey(
        prefs.selectedGroup,
        lesson.dateIso,
        lesson.pairNumber,
        lesson.rawSubject,
        lesson.lessonType
      );

      setHomeworkEntities((prev) => {
        const filtered = prev.filter((item) => {
          if (oldLessonKeyToRemove && item.lessonKey === oldLessonKeyToRemove) {
            return false;
          }
          if (item.lessonKey === lessonKey) return false;
          // Also replace any existing homework matched to this exact pair on the same day
          if (
            item.groupName.toUpperCase() === prefs.selectedGroup.toUpperCase() &&
            item.dateIso === lesson.dateIso &&
            item.pairNumber === lesson.pairNumber &&
            cleanSubjectTitle(item.subject).toLowerCase() ===
              cleanSubjectTitle(lesson.rawSubject).toLowerCase()
          ) {
            return false;
          }
          return true;
        });

        const next = cleanText
          ? [
              ...filtered,
              {
                lessonKey,
                groupName: prefs.selectedGroup.toUpperCase(),
                dateIso: lesson.dateIso,
                pairNumber: lesson.pairNumber,
                subject: cleanSubjectTitle(lesson.rawSubject),
                lessonType: lesson.lessonType,
                homeworkText: cleanText,
                colorTag,
                isCompleted,
                isOrphaned: false,
                updatedAtEpochMillis: Date.now(),
              },
            ]
          : filtered;

        void saveAllHomeworkEntities(next);
        return next;
      });
    },
    [prefs.selectedGroup]
  );

  const handleToggleTaskCompleted = useCallback((task: HomeworkTaskItem) => {
    setHomeworkEntities((prev) => {
      const next = prev.map((item) =>
        item.lessonKey === task.lessonKey
          ? {
              ...item,
              isCompleted: !item.isCompleted,
              updatedAtEpochMillis: Date.now(),
            }
          : item
      );
      void saveAllHomeworkEntities(next);
      return next;
    });
  }, []);

  const handleDeleteTask = useCallback((lessonKey: string) => {
    setHomeworkEntities((prev) => {
      const next = prev.filter((item) => item.lessonKey !== lessonKey);
      void saveAllHomeworkEntities(next);
      return next;
    });
  }, []);

  const handleSelectLookupTarget = useCallback(
    async (target: ScheduleLookupTarget) => {
      setActiveLookupTarget(target);
      setLookupWeekOffset(0);
      setIsLoading(true);
      try {
        const startIso = selectedWeekMondayIso || getMondayOfCurrentWeek();
        const res = await fetchTeacherOrRoomScheduleFromApi(
          prefs.apiBaseUrl,
          target.type === LookupModeType.TEACHER ? 'TEACHER' : 'AUDITORIUM',
          { id: target.id, title: target.title },
          startIso,
          prefs.corsProxyUrl
        );
        setRawLookupJson(res.rawJson);
        setIsFromNetwork(res.isFromNetwork);
      } finally {
        setIsLoading(false);
      }
    },
    [prefs.apiBaseUrl, prefs.corsProxyUrl, selectedWeekMondayIso]
  );

  const pendingHomeworkBadgeCount = useMemo(
    () =>
      activeGroupTasks.filter((t) => !t.isCompleted && t.dateIso >= todayIso)
        .length,
    [activeGroupTasks, todayIso]
  );

  const cachedLessonCount = useMemo(
    () => Object.values(lessonsByDate).reduce((acc, arr) => acc + arr.length, 0),
    [lessonsByDate]
  );

  return (
    <div
      className={`relative w-full h-dvh flex flex-col overflow-hidden select-none ${
        isDark ? 'bg-[#09120F] text-[#E6F2ED]' : 'bg-[#F3F1EC] text-[#1B2421]'
      }`}
    >
      {/* Subtle Dark-Emerald Ambient Background & Wave Lines (exact match to ScheduleScreen.kt) */}
      {isDark && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 overflow-hidden z-0"
        >
          <div
            className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-25 blur-3xl"
            style={{ backgroundColor: '#0E6F4E' }}
          />
          <div
            className="absolute -bottom-28 -right-24 w-96 h-96 rounded-full opacity-20 blur-3xl"
            style={{ backgroundColor: '#0E7A56' }}
          />
          <svg
            className="absolute inset-0 w-full h-full opacity-[0.06]"
            viewBox="0 0 400 800"
            preserveAspectRatio="none"
          >
            <path
              d="M-40,140 C120,90 260,210 440,130"
              fill="none"
              stroke="#34D399"
              strokeWidth="2"
            />
            <path
              d="M-40,420 C140,360 240,490 440,410"
              fill="none"
              stroke="#34D399"
              strokeWidth="1.5"
            />
            <path
              d="M-40,680 C120,630 280,740 440,660"
              fill="none"
              stroke="#34D399"
              strokeWidth="2"
            />
          </svg>
        </div>
      )}

      {/* Safe Area Top Container (iPhone Notch / Dynamic Island) */}
      <div className="pt-safe relative z-10 flex-1 flex flex-col min-h-0 max-w-xl w-full mx-auto">
        {activeTab === MainAppTab.SCHEDULE && (
          <ScheduleTab
            selectedGroup={prefs.selectedGroup}
            studentDefaultGroup={prefs.studentDefaultGroup}
            isLoading={isLoading}
            status={currentStatus}
            weekBannerText={weekBannerText}
            weekDays={weekDays}
            selectedDateIso={selectedDateIso}
            todayIso={todayIso}
            lastUpdatedTimestamp={prefs.lastUpdatedTimestamp}
            activeLookupTarget={activeLookupTarget}
            lookupWeekOffset={lookupWeekOffset}
            isDark={isDark}
            onSelectDateIso={(iso) => setSelectedDateIso(iso)}
            onGroupClick={() => setShowGroupSelector(true)}
            onReturnToMyGroupClick={() => {
              const myGroup = prefs.studentDefaultGroup || 'БОМ21ПИА';
              setActiveLookupTarget(null);
              if (myGroup.toUpperCase() === prefs.selectedGroup.toUpperCase()) {
                void refreshSchedule(myGroup, selectedWeekMondayIso, rawScheduleJson);
              } else {
                updatePrefs((p) => ({ ...p, selectedGroup: myGroup }));
              }
            }}
            onRefreshClick={() =>
              void refreshSchedule(
                prefs.selectedGroup,
                selectedWeekMondayIso,
                rawScheduleJson
              )
            }
            onDebugClick={() => setShowApiInspector(true)}
            onWeekBarClick={() => setShowWeekPicker(true)}
            onLessonClick={(lesson) => {
              if (activeLookupTarget) {
                setSelectedLookupLesson(lesson);
              } else {
                setSelectedLessonForSheet(lesson);
              }
            }}
            onOpenLookupSheet={() => setShowLookupSheet(true)}
            onClearLookupMode={() => setActiveLookupTarget(null)}
            onSelectLookupWeekOffset={(offset) => setLookupWeekOffset(offset)}
          />
        )}

        {activeTab === MainAppTab.HOMEWORK && (
          <HomeworkTab
            selectedGroup={prefs.selectedGroup}
            tasks={activeGroupTasks}
            orphanedTasks={orphanedGroupTasks}
            filterMode={homeworkFilterMode}
            lessonsByDate={lessonsByDate}
            todayIso={todayIso}
            currentWeekMondayIso={getMondayOfCurrentWeek()}
            currentWeekSundayIso={addDaysIso(getMondayOfCurrentWeek(), 6)}
            abbreviationsEnabled={prefs.abbreviationsEnabled}
            customAbbreviations={prefs.customAbbreviations}
            aiConfig={{
              baseUrl: prefs.aiApiBaseUrl,
              apiKey: prefs.aiApiKey,
              model: prefs.aiModelName,
            }}
            isDark={isDark}
            onChangeFilterMode={setHomeworkFilterMode}
            onToggleTaskCompleted={handleToggleTaskCompleted}
            onDeleteTask={handleDeleteTask}
            onEditTaskInLessonSheet={(task) => {
              const dayLessons = lessonsByDate[task.dateIso] || [];
              const found =
                dayLessons.find((l) => l.pairNumber === task.pairNumber) || {
                  id: task.lessonKey,
                  dateIso: task.dateIso,
                  pairNumber: task.pairNumber,
                  startTime: task.startTime,
                  endTime: task.endTime,
                  startMinutes: 485,
                  endMinutes: 575,
                  rawSubject: task.subject,
                  shortSubject: task.shortSubject,
                  lessonType: task.lessonType,
                  category: 'PRACTICE' as LessonItem['category'],
                  teacher: '',
                  room: '',
                  onlineLink: '',
                  groups: task.groupName,
                  homeworkText: task.homeworkText,
                  homeworkColorTag: task.colorTag,
                  isHomeworkCompleted: task.isCompleted,
                };
              setSelectedLessonForSheet(found);
            }}
            onAssignHomeworkToLesson={(
              lesson,
              text,
              colorTag,
              oldLessonKeyToRemove
            ) => {
              void handleSaveHomeworkForLesson(
                lesson,
                text,
                colorTag,
                false,
                oldLessonKeyToRemove
              );
            }}
          />
        )}

        {activeTab === MainAppTab.ABBREVIATIONS && (
          <ProfileTab
            studentFullName={prefs.studentFullName}
            studentDefaultGroup={prefs.studentDefaultGroup}
            studentAvatarUri={prefs.studentAvatarUri}
            availableGroups={availableGroups}
            appThemeMode={prefs.appThemeMode}
            abbreviationsEnabled={prefs.abbreviationsEnabled}
            customAbbreviations={prefs.customAbbreviations}
            excludedTeachers={prefs.excludedTeachers}
            apiBaseUrl={prefs.apiBaseUrl}
            corsProxyUrl={prefs.corsProxyUrl}
            aiApiBaseUrl={prefs.aiApiBaseUrl}
            aiApiKey={prefs.aiApiKey}
            aiModelName={prefs.aiModelName}
            lessonsByDate={lessonsByDate}
            isDark={isDark}
            onSaveProfile={(name, defaultGroup, avatarUri) => {
              setActiveLookupTarget(null);
              updatePrefs((p) => ({
                ...p,
                studentFullName: name,
                studentDefaultGroup: defaultGroup,
                selectedGroup: defaultGroup,
                studentAvatarUri: avatarUri,
              }));
            }}
            onChangeThemeMode={(mode) =>
              updatePrefs((p) => ({ ...p, appThemeMode: mode }))
            }
            onToggleAbbreviations={(enabled) =>
              updatePrefs((p) => ({ ...p, abbreviationsEnabled: enabled }))
            }
            onSaveCustomAbbreviation={(full, short) =>
              updatePrefs((p) => ({
                ...p,
                customAbbreviations: { ...p.customAbbreviations, [full]: short },
              }))
            }
            onRemoveCustomAbbreviation={(full) =>
              updatePrefs((p) => {
                const next = { ...p.customAbbreviations };
                delete next[full];
                return { ...p, customAbbreviations: next };
              })
            }
            onToggleExcludedTeacher={(teacher) =>
              updatePrefs((p) => {
                const exists = p.excludedTeachers.some(
                  (t) => t.toLowerCase() === teacher.toLowerCase()
                );
                const next = exists
                  ? p.excludedTeachers.filter(
                      (t) => t.toLowerCase() !== teacher.toLowerCase()
                    )
                  : [...p.excludedTeachers, teacher];
                return { ...p, excludedTeachers: next };
              })
            }
            onSaveScheduleServerConfig={(apiBaseUrl, corsProxyUrl) => {
              updatePrefs((p) => ({
                ...p,
                apiBaseUrl,
                corsProxyUrl,
              }));
              void refreshSchedule(
                prefs.selectedGroup,
                selectedWeekMondayIso,
                rawScheduleJson,
                apiBaseUrl,
                corsProxyUrl
              );
            }}
            onSaveAiConfig={(baseUrl, apiKey, modelName) =>
              updatePrefs((p) => ({
                ...p,
                aiApiBaseUrl: baseUrl,
                aiApiKey: apiKey,
                aiModelName: modelName,
              }))
            }
          />
        )}
      </div>

      {/* Bottom Navigation Bar with iPhone Safe Area Inset Bottom (Home Indicator) */}
      <nav
        aria-label="Основная навигация"
        className={`relative z-30 border-t pb-safe transition-colors ${
          isDark
            ? 'bg-[#0E1B16]/96 border-[#244539]'
            : 'bg-[#FAF9F5]/96 border-[#0E8158]/20'
        }`}
      >
        <div className="max-w-xl mx-auto px-3 pt-1.5 pb-1 grid grid-cols-3 gap-1">
          {[
            {
              tab: MainAppTab.SCHEDULE,
              label: 'Расписание',
              icon: CalendarDays,
              badge: 0,
            },
            {
              tab: MainAppTab.HOMEWORK,
              label: 'Задания',
              icon: CheckSquare,
              badge: pendingHomeworkBadgeCount,
            },
            {
              tab: MainAppTab.ABBREVIATIONS,
              label: 'Профиль',
              icon: User,
              badge: 0,
            },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = activeTab === item.tab;
            return (
              <button
                key={item.tab}
                type="button"
                onClick={() => setActiveTab(item.tab)}
                className="flex flex-col items-center justify-center py-1 cursor-pointer focus:outline-none"
              >
                <div
                  className={`relative px-5 py-1.5 rounded-full flex items-center justify-center transition-all ${
                    isSelected
                      ? isDark
                        ? 'bg-gradient-to-b from-[#1A4335] to-[#102A21] border border-[#2E6B56] text-[#34D399]'
                        : 'bg-[#0E8158]/15 border border-[#0E8158]/35 text-[#0E8158]'
                      : isDark
                      ? 'text-[#7F9E92]'
                      : 'text-[#647870]'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-[#0E8158] text-white text-[10px] font-extrabold flex items-center justify-center px-1">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span
                  className={`mt-1 text-[11px] leading-none transition-colors ${
                    isSelected
                      ? isDark
                        ? 'text-[#E6F4EE] font-bold'
                        : 'text-[#0A6343] font-bold'
                      : isDark
                      ? 'text-[#7F9E92] font-medium'
                      : 'text-[#647870] font-medium'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Bottom Sheets */}
      {showWeekPicker && (
        <WeekPickerBottomSheet
          weeks={nearbyWeeks}
          selectedWeekMondayIso={selectedWeekMondayIso}
          isDark={isDark}
          onSelectWeek={(mondayIso) => {
            setSelectedWeekMondayIso(mondayIso);
            setSelectedDateIso(mondayIso);
          }}
          onJumpToToday={() => {
            const curMon = getMondayOfCurrentWeek();
            setSelectedWeekMondayIso(curMon);
            const today = getTodayIso();
            const sat = addDaysIso(curMon, 5);
            setSelectedDateIso(today > sat ? curMon : today);
          }}
          onClose={() => setShowWeekPicker(false)}
        />
      )}

      {showGroupSelector && (
        <GroupSelectorBottomSheet
          groups={availableGroups}
          selectedGroup={prefs.selectedGroup}
          studentDefaultGroup={prefs.studentDefaultGroup}
          isDark={isDark}
          onSelectGroup={(groupName) => {
            setActiveLookupTarget(null);
            if (groupName.toUpperCase() === prefs.selectedGroup.toUpperCase()) {
              void refreshSchedule(groupName, selectedWeekMondayIso, rawScheduleJson);
            } else {
              updatePrefs((p) => ({ ...p, selectedGroup: groupName }));
            }
          }}
          onSetDefaultGroup={(groupName) => {
            setActiveLookupTarget(null);
            updatePrefs((p) => ({
              ...p,
              studentDefaultGroup: groupName,
              selectedGroup: groupName,
            }));
          }}
          onClose={() => setShowGroupSelector(false)}
        />
      )}

      {selectedLessonForSheet && (
        <LessonDetailBottomSheet
          lesson={selectedLessonForSheet}
          lessonsByDate={lessonsByDate}
          isDark={isDark}
          onSaveHomework={(lesson, text, colorTag, isCompleted) => {
            void handleSaveHomeworkForLesson(
              lesson,
              text,
              colorTag,
              isCompleted
            );
          }}
          onTransferHomework={(fromLesson, toLesson, text, colorTag) => {
            const oldKey = buildHomeworkLessonKey(
              prefs.selectedGroup,
              fromLesson.dateIso,
              fromLesson.pairNumber,
              fromLesson.rawSubject,
              fromLesson.lessonType
            );
            void handleSaveHomeworkForLesson(
              toLesson,
              text,
              colorTag,
              false,
              oldKey
            );
            setSelectedWeekMondayIso(getMondayOfGivenWeek(toLesson.dateIso));
            setSelectedDateIso(toLesson.dateIso);
          }}
          onClose={() => setSelectedLessonForSheet(null)}
        />
      )}

      {showLookupSheet && (
        <ScheduleLookupBottomSheet
          teachers={teachersDir}
          auditoriums={auditoriumsDir}
          isDark={isDark}
          onSelectLookupTarget={(target) => {
            void handleSelectLookupTarget(target);
          }}
          onClose={() => setShowLookupSheet(false)}
        />
      )}

      {selectedLookupLesson && (
        <LookupLessonInfoBottomSheet
          lesson={selectedLookupLesson}
          isDark={isDark}
          onClose={() => setSelectedLookupLesson(null)}
        />
      )}

      {showApiInspector && (
        <ApiInspectorBottomSheet
          apiBaseUrl={prefs.apiBaseUrl}
          corsProxyUrl={prefs.corsProxyUrl}
          selectedGroup={prefs.selectedGroup}
          isFromNetwork={isFromNetwork}
          cachedLessonCount={cachedLessonCount}
          isDark={isDark}
          onSaveApiSettings={(apiBaseUrl, corsProxyUrl) => {
            updatePrefs((p) => ({ ...p, apiBaseUrl, corsProxyUrl }));
            void refreshSchedule(
              prefs.selectedGroup,
              selectedWeekMondayIso,
              rawScheduleJson,
              apiBaseUrl,
              corsProxyUrl
            );
          }}
          onClose={() => setShowApiInspector(false)}
        />
      )}
    </div>
  );
};

export default App;
