import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  BookOpen,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Cpu,
  Download,
  Globe,
  Palette,
  Plus,
  Share,
  Smartphone,
  Sparkles,
  Trash2,
  UserCheck,
  UserMinus,
  X,
} from 'lucide-react';
import { getCurrentMinutesOfDay } from '../data/dateUtils';
import {
  AppThemeMode,
  DVGUPS_BELL_SLOTS,
  LessonItem,
} from '../data/scheduleModels';
import {
  cleanSubjectTitle,
  DEFAULT_ABBREVIATION_RULES,
  formatTeacherWithInitials,
} from '../data/subjectAbbreviations';
import { usePWAInstall } from '../hooks/usePWAInstall';

type ProfileSubScreen =
  | 'ROOT'
  | 'THEME'
  | 'TEACHER_FILTER'
  | 'ABBREVIATIONS'
  | 'SERVER_PROXY'
  | 'AI_API';

interface ProfileTabProps {
  studentFullName: string;
  studentDefaultGroup: string;
  studentAvatarUri: string;
  availableGroups: string[];
  appThemeMode: AppThemeMode;
  abbreviationsEnabled: boolean;
  customAbbreviations: Record<string, string>;
  excludedTeachers: string[];
  apiBaseUrl: string;
  corsProxyUrl: string;
  aiApiBaseUrl: string;
  aiApiKey: string;
  aiModelName: string;
  lessonsByDate: Record<string, LessonItem[]>;
  isDark: boolean;
  onSaveProfile: (name: string, defaultGroup: string, avatarUri: string) => void;
  onChangeThemeMode: (mode: AppThemeMode) => void;
  onToggleAbbreviations: (enabled: boolean) => void;
  onSaveCustomAbbreviation: (fullSubject: string, shortName: string) => void;
  onRemoveCustomAbbreviation: (fullSubject: string) => void;
  onToggleExcludedTeacher: (teacherName: string) => void;
  onSaveScheduleServerConfig: (apiBaseUrl: string, corsProxyUrl: string) => void;
  onSaveAiConfig: (baseUrl: string, apiKey: string, modelName: string) => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  studentFullName,
  studentDefaultGroup,
  studentAvatarUri,
  availableGroups,
  appThemeMode,
  abbreviationsEnabled,
  customAbbreviations,
  excludedTeachers,
  apiBaseUrl,
  corsProxyUrl,
  aiApiBaseUrl,
  aiApiKey,
  aiModelName,
  lessonsByDate,
  isDark,
  onSaveProfile,
  onChangeThemeMode,
  onToggleAbbreviations,
  onSaveCustomAbbreviation,
  onRemoveCustomAbbreviation,
  onToggleExcludedTeacher,
  onSaveScheduleServerConfig,
  onSaveAiConfig,
}) => {
  const [subScreen, setSubScreen] = useState<ProfileSubScreen>('ROOT');
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [draftName, setDraftName] = useState(studentFullName);
  const [draftGroup, setDraftGroup] = useState(studentDefaultGroup);
  const [draftAvatar, setDraftAvatar] = useState(studentAvatarUri);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [newFullSubject, setNewFullSubject] = useState('');
  const [newShortSubject, setNewShortSubject] = useState('');
  const [showBuiltInDict, setShowBuiltInDict] = useState(false);
  const [customTeacherInput, setCustomTeacherInput] = useState('');

  const [draftApiBaseUrl, setDraftApiBaseUrl] = useState(apiBaseUrl);
  const [draftCorsProxyUrl, setDraftCorsProxyUrl] = useState(corsProxyUrl);
  const [proxySavedToast, setProxySavedToast] = useState(false);

  const [draftAiUrl, setDraftAiUrl] = useState(aiApiBaseUrl);
  const [draftAiKey, setDraftAiKey] = useState(aiApiKey);
  const [draftAiModel, setDraftAiModel] = useState(aiModelName);
  const [aiSavedToast, setAiSavedToast] = useState(false);

  const {
    isInstalled,
    showIOSGuideModal,
    setShowIOSGuideModal,
    triggerInstall,
  } = usePWAInstall();

  const currentMinutes = getCurrentMinutesOfDay();

  const scheduleTeachers = useMemo(() => {
    const set = new Set<string>();
    for (const dayLessons of Object.values(lessonsByDate)) {
      for (const l of dayLessons) {
        l.teacher
          .split(/[,;]/g)
          .map((t) => t.trim())
          .filter(Boolean)
          .forEach((t) => set.add(t));
      }
    }
    return Array.from(set).sort();
  }, [lessonsByDate]);

  const scheduleSubjects = useMemo(() => {
    const set = new Set<string>();
    for (const dayLessons of Object.values(lessonsByDate)) {
      for (const l of dayLessons) {
        const clean = cleanSubjectTitle(l.rawSubject);
        if (clean) set.add(clean);
      }
    }
    return Array.from(set).sort();
  }, [lessonsByDate]);

  const initials = useMemo(() => {
    const parts = studentFullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
    }
    return (studentFullName.slice(0, 2) || 'СТ').toUpperCase();
  }, [studentFullName]);

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setDraftAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const themeLabel =
    appThemeMode === AppThemeMode.DARK
      ? 'Тёмная'
      : appThemeMode === AppThemeMode.LIGHT
      ? 'Светлая'
      : 'Как в системе';

  if (subScreen !== 'ROOT') {
    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="px-4 pt-3 pb-2.5 flex items-center gap-3 select-none">
          <button
            type="button"
            onClick={() => setSubScreen('ROOT')}
            className={`w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer ${
              isDark
                ? 'bg-[#172923] text-[#E6F2ED]'
                : 'bg-[#EBEAE4] text-[#1B2421]'
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-extrabold">
            {subScreen === 'THEME' && 'Тема оформления'}
            {subScreen === 'TEACHER_FILTER' && 'Фильтр преподавателей'}
            {subScreen === 'ABBREVIATIONS' && 'Сокращения предметов'}
            {subScreen === 'SERVER_PROXY' && 'Сервер расписания и прокси'}
            {subScreen === 'AI_API' && 'Настройки ИИ API'}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar px-4 pt-1 pb-24 space-y-4">
          {subScreen === 'THEME' && (
            <div
              className={`rounded-2xl p-2 border ${
                isDark
                  ? 'bg-[#111F1A] border-[#264B3E]'
                  : 'bg-[#FAF9F5] border-[#0E8158]/20'
              }`}
            >
              {[
                {
                  mode: AppThemeMode.SYSTEM,
                  title: 'Как в системе (iOS Авто)',
                  desc: 'Автоматически переключается вслед за системной темой iPhone',
                },
                {
                  mode: AppThemeMode.DARK,
                  title: 'Тёмная (Изумрудная ДВГУПС)',
                  desc: 'Фирменная глубокая тёмно-изумрудная палитра для OLED-экранов',
                },
                {
                  mode: AppThemeMode.LIGHT,
                  title: 'Светлая',
                  desc: 'Тёплая бумажно-изумрудная тема для яркого дневного света',
                },
              ].map((opt) => {
                const active = appThemeMode === opt.mode;
                return (
                  <button
                    key={opt.mode}
                    type="button"
                    onClick={() => onChangeThemeMode(opt.mode)}
                    className={`w-full rounded-xl p-3.5 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      active ? (isDark ? 'bg-[#172923]' : 'bg-[#E1EFE9]') : ''
                    }`}
                  >
                    <div>
                      <div className="text-sm font-bold">{opt.title}</div>
                      <div
                        className={`text-xs mt-0.5 ${
                          isDark ? 'text-[#8AA39B]' : 'text-[#5A6863]'
                        }`}
                      >
                        {opt.desc}
                      </div>
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                        active
                          ? 'bg-[#0E8158] text-white'
                          : isDark
                          ? 'border border-[#264B3E]'
                          : 'border border-[#0E8158]/30'
                      }`}
                    >
                      {active && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {subScreen === 'TEACHER_FILTER' && (
            <>
              <div
                className={`rounded-2xl p-4 border ${
                  isDark
                    ? 'bg-[#111F1A] border-[#264B3E]'
                    : 'bg-[#FAF9F5] border-[#0E8158]/20'
                }`}
              >
                <p className="text-xs leading-relaxed opacity-85">
                  Если в расписании стоят пары другой подгруппы (например, второй преподаватель по иностранному языку или лабораторным), отметьте его здесь — его пары будут автоматически скрыты из вашего расписания.
                </p>

                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={customTeacherInput}
                    onChange={(e) => setCustomTeacherInput(e.target.value)}
                    placeholder="Фамилия И.О. преподавателя..."
                    className={`flex-1 rounded-xl px-3.5 py-2 text-base border focus:outline-none ${
                      isDark
                        ? 'bg-[#172923] border-[#264B3E] text-[#E6F2ED]'
                        : 'bg-[#EBEAE4] border-[#0E8158]/25 text-[#1B2421]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customTeacherInput.trim()) {
                        onToggleExcludedTeacher(customTeacherInput.trim());
                        setCustomTeacherInput('');
                      }
                    }}
                    className="rounded-xl bg-[#0E8158] px-3.5 py-2 text-xs font-bold text-white cursor-pointer"
                  >
                    Скрыть
                  </button>
                </div>
              </div>

              <div
                className={`rounded-2xl p-3.5 border space-y-2 ${
                  isDark
                    ? 'bg-[#111F1A] border-[#264B3E]'
                    : 'bg-[#FAF9F5] border-[#0E8158]/20'
                }`}
              >
                <div className="text-xs font-extrabold uppercase tracking-wider opacity-75">
                  Преподаватели вашей группы ({scheduleTeachers.length})
                </div>
                {scheduleTeachers.map((teacher) => {
                  const isExcluded = excludedTeachers.some(
                    (t) => t.toLowerCase() === teacher.toLowerCase()
                  );
                  return (
                    <button
                      key={teacher}
                      type="button"
                      onClick={() => onToggleExcludedTeacher(teacher)}
                      className={`w-full rounded-xl p-3 border flex items-center justify-between gap-2 text-left transition-all cursor-pointer ${
                        isExcluded
                          ? 'bg-[#EF4444]/12 border-[#EF4444]/40'
                          : isDark
                          ? 'bg-[#172923] border-[#264B3E]'
                          : 'bg-[#EBEAE4] border-[#0E8158]/15'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-bold">
                          {formatTeacherWithInitials(teacher)}
                        </div>
                        <div className="text-[11px] opacity-75">{teacher}</div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold ${
                          isExcluded
                            ? 'bg-[#EF4444] text-white'
                            : 'bg-[#0E8158]/20 text-[#34D399]'
                        }`}
                      >
                        {isExcluded ? (
                          <>
                            <UserMinus className="w-3.5 h-3.5" />
                            <span>Скрыт</span>
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Показан</span>
                          </>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {subScreen === 'ABBREVIATIONS' && (
            <>
              <div
                className={`rounded-2xl p-4 border flex items-center justify-between gap-3 ${
                  isDark
                    ? 'bg-[#111F1A] border-[#264B3E]'
                    : 'bg-[#FAF9F5] border-[#0E8158]/20'
                }`}
              >
                <div>
                  <div className="text-sm font-extrabold">
                    Умные сокращения предметов
                  </div>
                  <div className="text-xs opacity-75 mt-0.5">
                    Заменять длинные названия («Высшая математика» → «Вышмат», «СТПП»)
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleAbbreviations(!abbreviationsEnabled)}
                  className={`w-12 h-7 rounded-full p-1 transition-colors cursor-pointer ${
                    abbreviationsEnabled ? 'bg-[#0E8158]' : 'bg-gray-600'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      abbreviationsEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div
                className={`rounded-2xl p-4 border space-y-3 ${
                  isDark
                    ? 'bg-[#111F1A] border-[#264B3E]'
                    : 'bg-[#FAF9F5] border-[#0E8158]/20'
                }`}
              >
                <div className="text-xs font-extrabold uppercase tracking-wider opacity-80">
                  Добавить своё сокращение
                </div>

                {scheduleSubjects.length > 0 && (
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    {scheduleSubjects.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setNewFullSubject(s)}
                        className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold border cursor-pointer ${
                          newFullSubject === s
                            ? 'bg-[#0E8158] border-[#34D399] text-white'
                            : isDark
                            ? 'bg-[#172923] border-[#264B3E] text-[#8AA39B]'
                            : 'bg-[#EBEAE4] border-[#0E8158]/20 text-[#5A6863]'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                <input
                  type="text"
                  value={newFullSubject}
                  onChange={(e) => setNewFullSubject(e.target.value)}
                  placeholder="Полное название предмета..."
                  className={`w-full rounded-xl px-3.5 py-2.5 text-base border focus:outline-none ${
                    isDark
                      ? 'bg-[#172923] border-[#264B3E] text-[#E6F2ED]'
                      : 'bg-[#EBEAE4] border-[#0E8158]/25 text-[#1B2421]'
                  }`}
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newShortSubject}
                    onChange={(e) => setNewShortSubject(e.target.value)}
                    placeholder="Короткое имя (напр. Вышмат)"
                    className={`flex-1 rounded-xl px-3.5 py-2.5 text-base border focus:outline-none ${
                      isDark
                        ? 'bg-[#172923] border-[#264B3E] text-[#E6F2ED]'
                        : 'bg-[#EBEAE4] border-[#0E8158]/25 text-[#1B2421]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newFullSubject.trim() && newShortSubject.trim()) {
                        onSaveCustomAbbreviation(
                          newFullSubject.trim(),
                          newShortSubject.trim()
                        );
                        setNewFullSubject('');
                        setNewShortSubject('');
                      }
                    }}
                    className="rounded-xl bg-[#0E8158] px-4 py-2.5 text-xs font-extrabold text-white inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Сохранить</span>
                  </button>
                </div>

                {Object.keys(customAbbreviations).length > 0 && (
                  <div className="pt-2 space-y-1.5">
                    <div className="text-[11px] font-bold opacity-75">
                      Ваши правила ({Object.keys(customAbbreviations).length}):
                    </div>
                    {Object.entries(customAbbreviations).map(([full, short]) => (
                      <div
                        key={full}
                        className={`rounded-xl px-3 py-2 border flex items-center justify-between gap-2 ${
                          isDark
                            ? 'bg-[#172923] border-[#264B3E]'
                            : 'bg-[#EBEAE4] border-[#0E8158]/20'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#34D399]">
                            {short}
                          </div>
                          <div className="text-[11px] opacity-75 truncate">
                            {full}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemoveCustomAbbreviation(full)}
                          className="p-1 text-[#EF4444] cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div
                className={`rounded-2xl p-4 border ${
                  isDark
                    ? 'bg-[#111F1A] border-[#264B3E]'
                    : 'bg-[#FAF9F5] border-[#0E8158]/20'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setShowBuiltInDict(!showBuiltInDict)}
                  className="w-full flex items-center justify-between text-left cursor-pointer"
                >
                  <div>
                    <div className="text-sm font-extrabold">
                      Встроенный словарь ДВГУПС ({DEFAULT_ABBREVIATION_RULES.length})
                    </div>
                    <div className="text-xs opacity-75">
                      Нажмите, чтобы посмотреть все стандартные сокращения
                    </div>
                  </div>
                  {showBuiltInDict ? (
                    <ChevronUp className="w-5 h-5 opacity-75" />
                  ) : (
                    <ChevronDown className="w-5 h-5 opacity-75" />
                  )}
                </button>

                {showBuiltInDict && (
                  <div className="mt-3 space-y-1.5 border-t border-[#264B3E]/50 pt-3">
                    {DEFAULT_ABBREVIATION_RULES.map((rule) => (
                      <div
                        key={rule.fullPattern}
                        className="flex items-center justify-between gap-2 text-xs py-1"
                      >
                        <span className="opacity-80 truncate">
                          {rule.fullPattern}
                        </span>
                        <span className="font-bold text-[#34D399] shrink-0">
                          → {rule.shortName}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {subScreen === 'SERVER_PROXY' && (
            <div
              className={`rounded-2xl p-4 border space-y-3.5 ${
                isDark
                  ? 'bg-[#111F1A] border-[#264B3E]'
                  : 'bg-[#FAF9F5] border-[#0E8158]/20'
              }`}
            >
              <p className="text-xs leading-relaxed opacity-85">
                По умолчанию приложение запрашивает расписание напрямую с сайта ДВГУПС (<code>https://dvgupstimetable.ru</code>). Если при размещении на GitHub Pages браузер iOS Safari блокирует загрузку по CORS, укажите здесь URL прокси-сервера.
              </p>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider opacity-75 mb-1">
                  URL прокси-сервера (необязательно)
                </label>
                <input
                  type="url"
                  value={draftCorsProxyUrl}
                  onChange={(e) => setDraftCorsProxyUrl(e.target.value)}
                  placeholder="По умолчанию пусто (прямой запрос к ДВГУПС)"
                  className={`w-full rounded-xl px-3.5 py-2.5 text-base border focus:outline-none ${
                    isDark
                      ? 'bg-[#172923] border-[#264B3E] text-[#E6F2ED]'
                      : 'bg-[#EBEAE4] border-[#0E8158]/25 text-[#1B2421]'
                  }`}
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[
                    { label: 'Напрямую (без прокси)', value: '' },
                    { label: 'CORS Proxy (corsproxy.io)', value: 'https://corsproxy.io/?' },
                    { label: 'Vercel /api/schedule', value: './api/schedule' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setDraftCorsProxyUrl(preset.value)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-bold border cursor-pointer ${
                        draftCorsProxyUrl.trim() === preset.value
                          ? 'bg-[#0E8158] border-[#34D399] text-white'
                          : isDark
                          ? 'bg-[#172923] border-[#264B3E] text-[#8AA39B]'
                          : 'bg-[#EBEAE4] border-[#0E8158]/20 text-[#5A6863]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider opacity-75 mb-1">
                  URL сайта расписания ДВГУПС
                </label>
                <input
                  type="url"
                  value={draftApiBaseUrl}
                  onChange={(e) => setDraftApiBaseUrl(e.target.value)}
                  placeholder="https://dvgupstimetable.ru"
                  className={`w-full rounded-xl px-3.5 py-2.5 text-base border focus:outline-none ${
                    isDark
                      ? 'bg-[#172923] border-[#264B3E] text-[#E6F2ED]'
                      : 'bg-[#EBEAE4] border-[#0E8158]/25 text-[#1B2421]'
                  }`}
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  onSaveScheduleServerConfig(
                    draftApiBaseUrl.trim() || 'https://dvgupstimetable.ru',
                    draftCorsProxyUrl.trim()
                  );
                  setProxySavedToast(true);
                  setTimeout(() => setProxySavedToast(false), 2000);
                }}
                className="w-full rounded-xl bg-[#0E8158] py-3 text-xs font-extrabold text-white cursor-pointer"
              >
                {proxySavedToast
                  ? '✓ Настройки сохранены и расписание обновлено'
                  : 'Сохранить настройки подключения'}
              </button>
            </div>
          )}

          {subScreen === 'AI_API' && (
            <div
              className={`rounded-2xl p-4 border space-y-3.5 ${
                isDark
                  ? 'bg-[#111F1A] border-[#264B3E]'
                  : 'bg-[#FAF9F5] border-[#0E8158]/20'
              }`}
            >
              <p className="text-xs leading-relaxed opacity-85">
                По умолчанию в приложении работает быстрый локальный NLP-парсер домашних заданий, который понимает сленг ДВГУПС без интернета. При желании вы можете подключить внешний OpenAI-совместимый LLM эндпоинт.
              </p>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider opacity-75 mb-1">
                  Base URL (OpenAI-compatible)
                </label>
                <input
                  type="url"
                  value={draftAiUrl}
                  onChange={(e) => setDraftAiUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className={`w-full rounded-xl px-3.5 py-2.5 text-base border focus:outline-none ${
                    isDark
                      ? 'bg-[#172923] border-[#264B3E] text-[#E6F2ED]'
                      : 'bg-[#EBEAE4] border-[#0E8158]/25 text-[#1B2421]'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider opacity-75 mb-1">
                  API Key (необязательно)
                </label>
                <input
                  type="password"
                  value={draftAiKey}
                  onChange={(e) => setDraftAiKey(e.target.value)}
                  placeholder="sk-..."
                  className={`w-full rounded-xl px-3.5 py-2.5 text-base border focus:outline-none ${
                    isDark
                      ? 'bg-[#172923] border-[#264B3E] text-[#E6F2ED]'
                      : 'bg-[#EBEAE4] border-[#0E8158]/25 text-[#1B2421]'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider opacity-75 mb-1">
                  Модель
                </label>
                <input
                  type="text"
                  value={draftAiModel}
                  onChange={(e) => setDraftAiModel(e.target.value)}
                  placeholder="gpt-4o-mini"
                  className={`w-full rounded-xl px-3.5 py-2.5 text-base border focus:outline-none ${
                    isDark
                      ? 'bg-[#172923] border-[#264B3E] text-[#E6F2ED]'
                      : 'bg-[#EBEAE4] border-[#0E8158]/25 text-[#1B2421]'
                  }`}
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  onSaveAiConfig(draftAiUrl, draftAiKey, draftAiModel);
                  setAiSavedToast(true);
                  setTimeout(() => setAiSavedToast(false), 2000);
                }}
                className="w-full rounded-xl bg-[#0E8158] py-3 text-xs font-extrabold text-white cursor-pointer"
              >
                {aiSavedToast ? '✓ Настройки сохранены' : 'Сохранить настройки ИИ'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar px-4 pt-3 pb-28 overscroll-y-contain space-y-4">
      <div
        className={`rounded-3xl p-4 border relative overflow-hidden ${
          isDark
            ? 'bg-gradient-to-br from-[#142B22] via-[#111F1A] to-[#0D1914] border-[#284D3E]'
            : 'bg-gradient-to-br from-[#E1EFE9] via-[#FAF9F5] to-[#EBEAE4] border-[#0E8158]/25'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div className="relative w-16 h-16 rounded-2xl bg-[#0E8158] text-white font-extrabold text-xl flex items-center justify-center overflow-hidden shadow-md shrink-0">
            {studentAvatarUri ? (
              <img
                src={studentAvatarUri}
                alt={studentFullName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{initials}</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-1 rounded-full bg-[#0E8158]/20 px-2.5 py-0.5 text-[10px] font-extrabold text-[#34D399] uppercase tracking-wider">
              Профиль студента
            </div>
            <h2
              className={`mt-1 text-lg font-extrabold truncate ${
                isDark ? 'text-[#E6F2ED]' : 'text-[#1B2421]'
              }`}
            >
              {studentFullName}
            </h2>
            <p
              className={`text-xs font-semibold ${
                isDark ? 'text-[#8AA39B]' : 'text-[#5A6863]'
              }`}
            >
              Моя группа:{' '}
              <span className="font-bold text-[#34D399]">{studentDefaultGroup}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setDraftName(studentFullName);
              setDraftGroup(studentDefaultGroup);
              setDraftAvatar(studentAvatarUri);
              setShowEditProfileModal(true);
            }}
            className="rounded-xl bg-[#0E8158] hover:bg-[#0A6343] px-3 py-2 text-xs font-bold text-white shrink-0 cursor-pointer"
          >
            Изменить
          </button>
        </div>
      </div>

      {!isInstalled && (
        <div
          className={`rounded-2xl p-3.5 border flex items-center justify-between gap-3 ${
            isDark
              ? 'bg-[#122820] border-[#34D399]/40'
              : 'bg-[#E1EFE9] border-[#0E8158]/35'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#0E8158] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-extrabold">
                Установить на экран «Домой» iPhone
              </div>
              <div
                className={`text-[11px] leading-snug ${
                  isDark ? 'text-[#8AA39B]' : 'text-[#4A6B5D]'
                }`}
              >
                Полноэкранный режим без рамок Safari и работа без интернета
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={triggerInstall}
            className="inline-flex items-center gap-1 rounded-xl bg-[#0E8158] px-3 py-2 text-xs font-extrabold text-white shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Как добавить</span>
          </button>
        </div>
      )}

      <div
        className={`rounded-3xl p-2 border divide-y ${
          isDark
            ? 'bg-[#111F1A] border-[#264B3E] divide-[#264B3E]/50'
            : 'bg-[#FAF9F5] border-[#0E8158]/20 divide-[#0E8158]/10'
        }`}
      >
        <button
          type="button"
          onClick={() => setSubScreen('THEME')}
          className="w-full p-3 flex items-center justify-between gap-3 text-left rounded-t-2xl hover:opacity-90 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0E8158]/20 text-[#34D399] flex items-center justify-center">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold">Тема оформления</div>
              <div className="text-xs opacity-70">{themeLabel}</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 opacity-60" />
        </button>

        <button
          type="button"
          onClick={() => setSubScreen('TEACHER_FILTER')}
          className="w-full p-3 flex items-center justify-between gap-3 text-left hover:opacity-90 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#D97706]/20 text-[#FBBF24] flex items-center justify-center">
              <UserMinus className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold">Фильтр преподавателей</div>
              <div className="text-xs opacity-70">
                {excludedTeachers.length > 0
                  ? `Скрыто: ${excludedTeachers.length} («Не моя подгруппа»)`
                  : 'Скрыть чужую подгруппу'}
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 opacity-60" />
        </button>

        <button
          type="button"
          onClick={() => setSubScreen('ABBREVIATIONS')}
          className="w-full p-3 flex items-center justify-between gap-3 text-left hover:opacity-90 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#7C3AED]/20 text-[#A78BFA] flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold">Сокращения предметов</div>
              <div className="text-xs opacity-70">
                {abbreviationsEnabled ? 'Включены' : 'Выключены'} •{' '}
                {DEFAULT_ABBREVIATION_RULES.length +
                  Object.keys(customAbbreviations).length}{' '}
                правил
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 opacity-60" />
        </button>

        <button
          type="button"
          onClick={() => {
            setDraftApiBaseUrl(apiBaseUrl);
            setDraftCorsProxyUrl(corsProxyUrl);
            setSubScreen('SERVER_PROXY');
          }}
          className="w-full p-3 flex items-center justify-between gap-3 text-left hover:opacity-90 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0E8158]/20 text-[#34D399] flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold">URL прокси-сервера (CORS)</div>
              <div className="text-xs opacity-70 truncate max-w-[220px]">
                {corsProxyUrl.trim()
                  ? `Прокси: ${corsProxyUrl.trim()}`
                  : 'По умолчанию: напрямую с сайта ДВГУПС'}
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 opacity-60" />
        </button>

        <button
          type="button"
          onClick={() => setSubScreen('AI_API')}
          className="w-full p-3 flex items-center justify-between gap-3 text-left rounded-b-2xl hover:opacity-90 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0E8158]/20 text-[#34D399] flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold">Настройки ИИ API</div>
              <div className="text-xs opacity-70">
                {aiApiKey.trim()
                  ? `Внешний LLM (${aiModelName})`
                  : 'Локальный офлайн NLP-движок'}
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 opacity-60" />
        </button>
      </div>

      <div
        className={`rounded-3xl p-4 border ${
          isDark
            ? 'bg-[#111F1A] border-[#264B3E]'
            : 'bg-[#FAF9F5] border-[#0E8158]/20'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#34D399]" />
            <h3 className="text-sm font-extrabold">Расписание звонков ДВГУПС</h3>
          </div>
          <span className="text-[11px] font-semibold opacity-70">
            Хабаровск (UTC+10)
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {DVGUPS_BELL_SLOTS.map((slot) => {
            const isNow =
              currentMinutes >= slot.startMinutes &&
              currentMinutes <= slot.endMinutes;
            return (
              <div
                key={slot.pairNumber}
                className={`rounded-xl px-3 py-2 border flex items-center justify-between ${
                  isNow
                    ? 'bg-[#0E8158]/25 border-[#34D399] text-[#34D399]'
                    : isDark
                    ? 'bg-[#172923]/75 border-[#264B3E]/70'
                    : 'bg-[#EBEAE4]/80 border-[#0E8158]/15'
                }`}
              >
                <span className="text-xs font-extrabold">
                  {slot.pairNumber} пара
                </span>
                <span className="font-mono text-xs font-semibold">
                  {slot.startTime}–{slot.endTime}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-2 pb-4 text-center select-none opacity-65">
        <div className="text-xs font-bold">ДВГУПС Расписание • iOS PWA Edition</div>
        <div className="text-[11px] mt-0.5">
          Офлайн-кэш IndexedDB • Аппаратное ускорение свайпов
        </div>
      </div>

      {showEditProfileModal && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-end justify-center"
          onClick={() => setShowEditProfileModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-lg rounded-t-3xl p-5 pb-safe-sheet border-t ${
              isDark
                ? 'bg-[#111F1A] border-[#264B3E] text-[#E6F2ED]'
                : 'bg-[#FAF9F5] border-[#0E8158]/20 text-[#1B2421]'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold">Редактировать профиль</h3>
              <button
                type="button"
                onClick={() => setShowEditProfileModal(false)}
                className="p-1.5 rounded-full opacity-75 hover:opacity-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-[#0E8158] text-white font-extrabold text-xl flex items-center justify-center overflow-hidden shrink-0">
                {draftAvatar ? (
                  <img
                    src={draftAvatar}
                    alt="Аватар"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#0E8158] px-3 py-2 text-xs font-bold text-white cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Загрузить фото</span>
                </button>
                {draftAvatar && (
                  <button
                    type="button"
                    onClick={() => setDraftAvatar('')}
                    className="rounded-xl bg-[#EF4444]/20 px-3 py-2 text-xs font-bold text-[#EF4444] cursor-pointer"
                  >
                    Сбросить
                  </button>
                )}
              </div>
            </div>

            <label className="block text-xs font-bold uppercase tracking-wider opacity-75 mb-1">
              Имя или никнейм
            </label>
            <input
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="Студент ДВГУПС"
              className={`w-full rounded-xl px-3.5 py-2.5 text-base border mb-3.5 focus:outline-none ${
                isDark
                  ? 'bg-[#172923] border-[#264B3E] text-[#E6F2ED]'
                  : 'bg-[#EBEAE4] border-[#0E8158]/25 text-[#1B2421]'
              }`}
            />

            <label className="block text-xs font-bold uppercase tracking-wider opacity-75 mb-1">
              Основная учебная группа
            </label>
            <select
              value={draftGroup}
              onChange={(e) => setDraftGroup(e.target.value)}
              className={`w-full rounded-xl px-3.5 py-2.5 text-base border mb-4 focus:outline-none ${
                isDark
                  ? 'bg-[#172923] border-[#264B3E] text-[#E6F2ED]'
                  : 'bg-[#EBEAE4] border-[#0E8158]/25 text-[#1B2421]'
              }`}
            >
              {availableGroups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                onSaveProfile(
                  draftName.trim() || 'Студент ДВГУПС',
                  draftGroup.trim() || 'БОМ21ПИА',
                  draftAvatar
                );
                setShowEditProfileModal(false);
              }}
              className="w-full rounded-2xl bg-[#0E8158] py-3.5 text-sm font-extrabold text-white cursor-pointer"
            >
              Сохранить профиль
            </button>
          </div>
        </div>
      )}

      {showIOSGuideModal && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-end justify-center"
          onClick={() => setShowIOSGuideModal(false)}
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
                <Sparkles className="w-5 h-5 text-[#34D399]" />
                <h3 className="text-lg font-extrabold">
                  Установка на экран «Домой» iPhone
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuideModal(false)}
                className="p-1.5 rounded-full opacity-75 hover:opacity-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed">
              <div
                className={`rounded-2xl p-3.5 border flex items-start gap-3 ${
                  isDark
                    ? 'bg-[#172923] border-[#264B3E]'
                    : 'bg-[#EBEAE4] border-[#0E8158]/20'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-[#0E8158] text-white font-bold flex items-center justify-center shrink-0">
                  1
                </div>
                <div>
                  Нажмите кнопку <b>«Поделиться»</b>{' '}
                  <Share className="inline w-4 h-4 text-[#34D399] mx-0.5" /> в нижней панели браузера <b>Safari</b> на вашем iPhone.
                </div>
              </div>

              <div
                className={`rounded-2xl p-3.5 border flex items-start gap-3 ${
                  isDark
                    ? 'bg-[#172923] border-[#264B3E]'
                    : 'bg-[#EBEAE4] border-[#0E8158]/20'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-[#0E8158] text-white font-bold flex items-center justify-center shrink-0">
                  2
                </div>
                <div>
                  Прокрутите список действий вниз и выберите пункт{' '}
                  <b>«На экран „Домой“»</b> (Add to Home Screen).
                </div>
              </div>

              <div
                className={`rounded-2xl p-3.5 border flex items-start gap-3 ${
                  isDark
                    ? 'bg-[#172923] border-[#264B3E]'
                    : 'bg-[#EBEAE4] border-[#0E8158]/20'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-[#0E8158] text-white font-bold flex items-center justify-center shrink-0">
                  3
                </div>
                <div>
                  Нажмите <b>«Добавить»</b> в правом верхнем углу. Приложение запустится на весь экран с поддержкой Dynamic Island и полным офлайн-доступом!
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSGuideModal(false)}
              className="mt-4 w-full rounded-2xl bg-[#0E8158] py-3 text-sm font-extrabold text-white cursor-pointer"
            >
              Понятно
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
