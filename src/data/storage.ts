import { DEFAULT_DVGUPS_API_URL } from './dvgupsApiClient';
import {
  AppThemeMode,
  AuditoriumDirectoryItem,
  DEFAULT_DVGUPS_GROUPS,
  HomeworkEntity,
  TeacherDirectoryItem,
} from './scheduleModels';

export interface UserPreferencesState {
  selectedGroup: string;
  studentFullName: string;
  studentDefaultGroup: string;
  studentAvatarUri: string;
  abbreviationsEnabled: boolean;
  customAbbreviations: Record<string, string>;
  excludedTeachers: string[];
  appThemeMode: AppThemeMode;
  apiBaseUrl: string;
  corsProxyUrl: string;
  aiApiBaseUrl: string;
  aiApiKey: string;
  aiModelName: string;
  lastUpdatedTimestamp: number;
}

const PREFS_STORAGE_KEY = 'dvgups_pwa_user_prefs_v3';
const HOMEWORK_FALLBACK_KEY = 'dvgups_pwa_homework_v3';
const SCHEDULE_FALLBACK_PREFIX = 'dvgups_pwa_sched_v3_';
const GROUPS_FALLBACK_KEY = 'dvgups_pwa_groups_v3';

const IDB_NAME = 'dvgups_schedule_pwa_db_v3';
const IDB_VERSION = 3;
const STORE_SCHEDULES = 'schedules';
const STORE_HOMEWORK = 'homework';
const STORE_DIRECTORIES = 'directories';

export const DEFAULT_USER_PREFERENCES: UserPreferencesState = {
  selectedGroup: 'БОМ21ПИА',
  studentFullName: 'Студент ДВГУПС',
  studentDefaultGroup: 'БОМ21ПИА',
  studentAvatarUri: '',
  abbreviationsEnabled: true,
  customAbbreviations: {},
  excludedTeachers: [],
  appThemeMode: AppThemeMode.DARK,
  apiBaseUrl: DEFAULT_DVGUPS_API_URL,
  corsProxyUrl: '',
  aiApiBaseUrl: 'https://api.openai.com/v1',
  aiApiKey: '',
  aiModelName: 'gpt-4o-mini',
  lastUpdatedTimestamp: Date.now(),
};

export function loadUserPreferences(): UserPreferencesState {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_USER_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<UserPreferencesState>;
    return {
      ...DEFAULT_USER_PREFERENCES,
      ...parsed,
      corsProxyUrl: typeof parsed.corsProxyUrl === 'string' ? parsed.corsProxyUrl : '',
      customAbbreviations: parsed.customAbbreviations || {},
      excludedTeachers: Array.isArray(parsed.excludedTeachers)
        ? parsed.excludedTeachers
        : [],
    };
  } catch {
    return DEFAULT_USER_PREFERENCES;
  }
}

export function saveUserPreferences(prefs: UserPreferencesState): void {
  try {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore
  }
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_SCHEDULES)) {
          db.createObjectStore(STORE_SCHEDULES, { keyPath: 'groupName' });
        }
        if (!db.objectStoreNames.contains(STORE_HOMEWORK)) {
          db.createObjectStore(STORE_HOMEWORK, { keyPath: 'lessonKey' });
        }
        if (!db.objectStoreNames.contains(STORE_DIRECTORIES)) {
          db.createObjectStore(STORE_DIRECTORIES, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveCachedScheduleJson(
  groupName: string,
  rawJson: string,
  updatedAt: number = Date.now()
): Promise<void> {
  const key = groupName.trim().toUpperCase();
  try {
    localStorage.setItem(
      `${SCHEDULE_FALLBACK_PREFIX}${key}`,
      JSON.stringify({ groupName: key, rawJson, updatedAt })
    );
  } catch {
    // Ignore
  }

  const db = await openDatabase();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_SCHEDULES, 'readwrite');
      tx.objectStore(STORE_SCHEDULES).put({ groupName: key, rawJson, updatedAt });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function loadCachedScheduleJson(
  groupName: string
): Promise<{ rawJson: string; updatedAt: number } | null> {
  const key = groupName.trim().toUpperCase();
  const db = await openDatabase();
  if (db) {
    const idbRes = await new Promise<{ rawJson: string; updatedAt: number } | null>(
      (resolve) => {
        try {
          const tx = db.transaction(STORE_SCHEDULES, 'readonly');
          const req = tx.objectStore(STORE_SCHEDULES).get(key);
          req.onsuccess = () => {
            if (req.result && typeof req.result.rawJson === 'string') {
              resolve({
                rawJson: req.result.rawJson,
                updatedAt: Number(req.result.updatedAt || Date.now()),
              });
            } else {
              resolve(null);
            }
          };
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      }
    );
    if (idbRes) return idbRes;
  }

  try {
    const fallback = localStorage.getItem(`${SCHEDULE_FALLBACK_PREFIX}${key}`);
    if (fallback) {
      const parsed = JSON.parse(fallback);
      if (parsed && typeof parsed.rawJson === 'string') {
        return {
          rawJson: parsed.rawJson,
          updatedAt: Number(parsed.updatedAt || Date.now()),
        };
      }
    }
  } catch {
    // Ignore
  }
  return null;
}

export async function loadAllHomeworkEntities(): Promise<HomeworkEntity[]> {
  try {
    const raw = localStorage.getItem(HOMEWORK_FALLBACK_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as HomeworkEntity[];
    }
  } catch {
    // Ignore
  }

  const db = await openDatabase();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_HOMEWORK, 'readonly');
      const req = tx.objectStore(STORE_HOMEWORK).getAll();
      req.onsuccess = () => {
        const list = Array.isArray(req.result) ? (req.result as HomeworkEntity[]) : [];
        resolve(list);
      };
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

export async function saveAllHomeworkEntities(list: HomeworkEntity[]): Promise<void> {
  try {
    localStorage.setItem(HOMEWORK_FALLBACK_KEY, JSON.stringify(list));
  } catch {
    // Ignore
  }

  const db = await openDatabase();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_HOMEWORK, 'readwrite');
      const store = tx.objectStore(STORE_HOMEWORK);
      store.clear();
      for (const item of list) {
        store.put(item);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function saveCachedGroupsList(groups: string[]): Promise<void> {
  try {
    localStorage.setItem(GROUPS_FALLBACK_KEY, JSON.stringify(groups));
  } catch {
    // Ignore
  }
  const db = await openDatabase();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_DIRECTORIES, 'readwrite');
      tx.objectStore(STORE_DIRECTORIES).put({ key: 'groups', items: groups });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function loadCachedGroupsList(): Promise<string[]> {
  try {
    const raw = localStorage.getItem(GROUPS_FALLBACK_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // Ignore
  }
  return DEFAULT_DVGUPS_GROUPS;
}

export async function saveCachedDirectories(
  teachers: TeacherDirectoryItem[],
  auditoriums: AuditoriumDirectoryItem[]
): Promise<void> {
  try {
    localStorage.setItem('dvgups_pwa_teachers_v1', JSON.stringify(teachers));
    localStorage.setItem('dvgups_pwa_auditoriums_v1', JSON.stringify(auditoriums));
  } catch {
    // Ignore
  }
}

export function loadCachedDirectoriesSync(): {
  teachers: TeacherDirectoryItem[] | null;
  auditoriums: AuditoriumDirectoryItem[] | null;
} {
  try {
    const tRaw = localStorage.getItem('dvgups_pwa_teachers_v1');
    const aRaw = localStorage.getItem('dvgups_pwa_auditoriums_v1');
    return {
      teachers: tRaw ? JSON.parse(tRaw) : null,
      auditoriums: aRaw ? JSON.parse(aRaw) : null,
    };
  } catch {
    return { teachers: null, auditoriums: null };
  }
}
