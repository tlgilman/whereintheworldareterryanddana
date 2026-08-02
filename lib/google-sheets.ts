import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { TravelData } from '@/app/types/Travel-data';
import { User } from '@/app/types/User';
import { Photo } from '@/app/types/Photo';

// Config variables
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_ID = process.env.GOOGLE_SHEET_TAB_ID || '0';
const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

const serviceAccountAuth = new JWT({
  email: CLIENT_EMAIL,
  key: PRIVATE_KEY,
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
  ],
});

// Cache structures for rate-limit & quota optimization
let cachedDoc: GoogleSpreadsheet | null = null;
let lastDocLoadTime = 0;
const DOC_CACHE_TTL = 30 * 1000; // 30 seconds

interface DataCache<T> {
  data: T;
  timestamp: number;
}

let travelDataCache: DataCache<TravelData[]> | null = null;
let photosCache: DataCache<Photo[]> | null = null;
let albumsCache: DataCache<AlbumData[]> | null = null;
let usersCache: DataCache<User[]> | null = null;
const DATA_CACHE_TTL = 15 * 1000; // 15 seconds memory cache

export const invalidatePhotosCache = () => {
  photosCache = null;
};

export const invalidateAlbumsCache = () => {
  albumsCache = null;
};

export const invalidateUsersCache = () => {
  usersCache = null;
};

export const invalidateTravelDataCache = () => {
  travelDataCache = null;
};

// Retry helper for handling Google API rate-limit / 429 Quota Exceeded
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 1500): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: unknown) {
      attempt++;
      const isQuotaError =
        err instanceof Error &&
        (err.message.includes('429') ||
          err.message.includes('Quota exceeded') ||
          err.message.includes('Read requests'));

      if (isQuotaError && attempt <= maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt - 1);
        console.warn(`Google Sheets 429 Quota limit hit. Retrying attempt ${attempt}/${maxRetries} in ${delay}ms...`);
        await new Promise((res) => setTimeout(res, delay));
      } else {
        throw err;
      }
    }
  }
}

export const getDoc = async (): Promise<GoogleSpreadsheet> => {
  const missingVars = [];
  if (!SPREADSHEET_ID) missingVars.push('GOOGLE_SHEET_ID');
  if (!CLIENT_EMAIL) missingVars.push('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  if (!PRIVATE_KEY) missingVars.push('GOOGLE_PRIVATE_KEY');

  if (missingVars.length > 0) {
    throw new Error(`Google Sheets credentials are missing: ${missingVars.join(', ')}`);
  }

  const now = Date.now();
  if (cachedDoc && now - lastDocLoadTime < DOC_CACHE_TTL) {
    return cachedDoc;
  }

  return withRetry(async () => {
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID as string, serviceAccountAuth);
    await doc.loadInfo();
    cachedDoc = doc;
    lastDocLoadTime = Date.now();
    return doc;
  });
};

export const fetchTravelData = async (): Promise<TravelData[]> => {
  const now = Date.now();
  if (travelDataCache && now - travelDataCache.timestamp < DATA_CACHE_TTL) {
    return travelDataCache.data;
  }

  return withRetry(async () => {
    const doc = await getDoc();
    const sheet = doc.sheetsById[parseInt(SHEET_ID)];
    if (!sheet) {
      throw new Error(`Sheet with ID ${SHEET_ID} not found.`);
    }

    const rows = await sheet.getRows();

    const parseBoolean = (value: string | undefined): boolean => {
      if (!value) return false;
      const v = value.toLowerCase().trim();
      return v === 'true' || v === 'yes' || v === '1' || v === 'y' || v === 't';
    };

    const data: TravelData[] = rows.map((row) => ({
      location: row.get('location'),
      country: row.get('country'),
      travelTimeToHere: row.get('travelTimeToHere'),
      timeZone: row.get('timeZone'),
      arrivalDate: row.get('arrivalDate'),
      departureDate: row.get('departureDate'),
      daysAtPlace: parseInt(row.get('daysAtPlace') || '0'),
      residing: parseBoolean(row.get('residing')),
      booked: parseBoolean(row.get('booked')),
      vacationStart: row.get('vacationStart'),
      vacationEnd: row.get('vacationEnd'),
      coordinates: {
        lat: parseFloat(row.get('lat')),
        lon: parseFloat(row.get('lon')),
      },
    }));

    travelDataCache = { data, timestamp: Date.now() };
    return data;
  });
};

export const addTrip = async (trip: TravelData) => {
  return withRetry(async () => {
    const doc = await getDoc();
    const sheet = doc.sheetsById[parseInt(SHEET_ID)];

    await sheet.addRow({
      location: trip.location,
      country: trip.country,
      travelTimeToHere: trip.travelTimeToHere,
      timeZone: trip.timeZone,
      arrivalDate: trip.arrivalDate,
      departureDate: trip.departureDate,
      daysAtPlace: trip.daysAtPlace,
      residing: trip.residing,
      booked: trip.booked,
      vacationStart: trip.vacationStart ?? '',
      vacationEnd: trip.vacationEnd ?? '',
      lat: trip.coordinates?.lat ?? 0,
      lon: trip.coordinates?.lon ?? 0,
    });

    invalidateTravelDataCache();
  });
};

export interface VisitorData {
  ip: string;
  userAgent: string;
  device?: string;
  path?: string;
  referrer?: string;
  city?: string;
  state?: string;
  country?: string;
  isp?: string;
  timestamp?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ensureVisitorsHeader = async (sheet: any) => {
  try {
    if (!sheet.headerValues || !sheet.headerValues.includes('state')) {
      await sheet.loadHeaderRow();
      if (!sheet.headerValues.includes('state')) {
        await sheet.setHeaderRow(['timestamp', 'ip', 'device', 'city', 'state', 'country', 'isp', 'path', 'referrer', 'userAgent']);
      }
    }
  } catch (e) {
    console.error('Error ensuring Visitors header:', e);
    await sheet.setHeaderRow(['timestamp', 'ip', 'device', 'city', 'state', 'country', 'isp', 'path', 'referrer', 'userAgent']);
  }
};

export const trackVisit = async (data: VisitorData) => {
  return withRetry(async () => {
    const doc = await getDoc();

    let sheet = doc.sheetsByTitle['Visitors'];
    const visitorHeaders = ['timestamp', 'ip', 'device', 'city', 'state', 'country', 'isp', 'path', 'referrer', 'userAgent'];

    if (!sheet) {
      sheet = await doc.addSheet({ title: 'Visitors' });
      await sheet.setHeaderRow(visitorHeaders);
    } else {
      await ensureVisitorsHeader(sheet);
    }

    await sheet.addRow({
      timestamp: new Date().toISOString(),
      ip: data.ip,
      device: data.device || '',
      city: data.city || '',
      state: data.state || '',
      country: data.country || '',
      isp: data.isp || '',
      path: data.path || '/',
      referrer: data.referrer || '',
      userAgent: data.userAgent || '',
    });
  });
};

export const getVisitors = async (): Promise<VisitorData[]> => {
  return withRetry(async () => {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle['Visitors'];
    if (!sheet) return [];

    await ensureVisitorsHeader(sheet);

    const rows = await sheet.getRows();
    return rows.map(row => ({
      timestamp: row.get('timestamp'),
      ip: row.get('ip'),
      device: row.get('device') || '',
      city: row.get('city') || '',
      state: row.get('state') || '',
      country: row.get('country') || '',
      isp: row.get('isp') || '',
      path: row.get('path') || '/',
      referrer: row.get('referrer') || '',
      userAgent: row.get('userAgent') || '',
    })).reverse();
  });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ensureUsersHeader = async (sheet: any) => {
  try {
    if (!sheet.headerValues || !sheet.headerValues.includes('mustChangePassword')) {
      await sheet.loadHeaderRow();
      if (!sheet.headerValues.includes('mustChangePassword')) {
        await sheet.setHeaderRow(['id', 'name', 'email', 'password', 'role', 'mustChangePassword', 'createdAt', 'updatedAt']);
      }
    }
  } catch (e) {
    console.error('Error ensuring Users header row:', e);
  }
};

export const getUsers = async (): Promise<User[]> => {
  const now = Date.now();
  if (usersCache && now - usersCache.timestamp < DATA_CACHE_TTL) {
    return usersCache.data;
  }

  return withRetry(async () => {
    const doc = await getDoc();
    let sheet = doc.sheetsByTitle['Users'];

    if (!sheet) {
      sheet = await doc.addSheet({ title: 'Users' });
      await sheet.setHeaderRow(['id', 'name', 'email', 'password', 'role', 'mustChangePassword', 'createdAt', 'updatedAt']);
      return [];
    } else {
      await ensureUsersHeader(sheet);
    }

    const rows = await sheet.getRows();
    const data: User[] = rows.map(row => ({
      id: row.get('id'),
      name: row.get('name'),
      email: row.get('email'),
      password: row.get('password'),
      role: row.get('role'),
      mustChangePassword: String(row.get('mustChangePassword')).toLowerCase() === 'true',
      createdAt: row.get('createdAt'),
      updatedAt: row.get('updatedAt'),
    }));

    usersCache = { data, timestamp: Date.now() };
    return data;
  });
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const users = await getUsers();
  return users.find(user => user.email.toLowerCase() === email.toLowerCase()) || null;
};

export const createUser = async (user: Omit<User, 'createdAt' | 'updatedAt'>): Promise<User> => {
  return withRetry(async () => {
    const doc = await getDoc();
    let sheet = doc.sheetsByTitle['Users'];

    if (!sheet) {
      sheet = await doc.addSheet({ title: 'Users' });
      await sheet.setHeaderRow(['id', 'name', 'email', 'password', 'role', 'mustChangePassword', 'createdAt', 'updatedAt']);
    } else {
      await ensureUsersHeader(sheet);
    }

    const timestamp = new Date().toISOString();
    const newUser = {
      ...user,
      mustChangePassword: user.mustChangePassword ?? true,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await sheet.addRow({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      password: newUser.password || '',
      role: newUser.role,
      mustChangePassword: newUser.mustChangePassword ? 'true' : 'false',
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
    });

    invalidateUsersCache();
    return newUser;
  });
};

export const updateUser = async (email: string, updates: Partial<User>): Promise<User | null> => {
  return withRetry(async () => {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle['Users'];
    if (!sheet) return null;

    await ensureUsersHeader(sheet);

    const rows = await sheet.getRows();
    const row = rows.find(r => r.get('email')?.toLowerCase() === email.toLowerCase());

    if (!row) return null;

    const timestamp = new Date().toISOString();

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'email' && key !== 'id' && key !== 'createdAt') {
        if (key === 'mustChangePassword') {
          row.set(key, value ? 'true' : 'false');
        } else {
          row.set(key, value);
        }
      }
    });

    row.set('updatedAt', timestamp);
    await row.save();

    invalidateUsersCache();

    return {
      id: row.get('id'),
      name: row.get('name'),
      email: row.get('email'),
      password: row.get('password'),
      role: row.get('role'),
      mustChangePassword: String(row.get('mustChangePassword')).toLowerCase() === 'true',
      createdAt: row.get('createdAt'),
      updatedAt: timestamp,
    };
  });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ensureSheetHeaders = async (sheet: any, defaultHeaders: string[]) => {
  try {
    if (!sheet.headerValues || sheet.headerValues.length === 0) {
      await sheet.loadHeaderRow();
      if (!sheet.headerValues || sheet.headerValues.length === 0) {
        await sheet.setHeaderRow(defaultHeaders);
      }
    }
  } catch (e) {
    console.log('Sheet header row empty or missing, initializing headers...', e);
    await sheet.setHeaderRow(defaultHeaders);
  }
};

export const getPhotos = async (): Promise<Photo[]> => {
  const now = Date.now();
  if (photosCache && now - photosCache.timestamp < DATA_CACHE_TTL) {
    return photosCache.data;
  }

  return withRetry(async () => {
    const doc = await getDoc();
    let sheet = doc.sheetsByTitle['Photos'];
    const photoHeaders = ['id', 'location', 'country', 'url', 'source', 'caption', 'uploadedBy', 'uploadedAt'];

    if (!sheet) {
      sheet = await doc.addSheet({ title: 'Photos' });
      await sheet.setHeaderRow(photoHeaders);
      photosCache = { data: [], timestamp: Date.now() };
      return [];
    } else {
      await ensureSheetHeaders(sheet, photoHeaders);
    }

    const rows = await sheet.getRows();
    const data: Photo[] = rows.map(row => ({
      id: row.get('id'),
      location: row.get('location'),
      country: row.get('country'),
      url: row.get('url'),
      source: (row.get('source') as Photo['source']) || 'file_upload',
      caption: row.get('caption') || '',
      uploadedBy: row.get('uploadedBy') || '',
      uploadedAt: row.get('uploadedAt') || '',
    })).reverse();

    photosCache = { data, timestamp: Date.now() };
    return data;
  });
};

export const addPhoto = async (photo: Omit<Photo, 'id' | 'uploadedAt'> & { id?: string; uploadedAt?: string }): Promise<Photo> => {
  return withRetry(async () => {
    const doc = await getDoc();
    let sheet = doc.sheetsByTitle['Photos'];
    const photoHeaders = ['id', 'location', 'country', 'url', 'source', 'caption', 'uploadedBy', 'uploadedAt'];

    if (!sheet) {
      sheet = await doc.addSheet({ title: 'Photos' });
      await sheet.setHeaderRow(photoHeaders);
    } else {
      await ensureSheetHeaders(sheet, photoHeaders);
    }

    const timestamp = new Date().toISOString();
    const newPhoto: Photo = {
      id: photo.id || `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      location: photo.location,
      country: photo.country,
      url: photo.url,
      source: photo.source || 'file_upload',
      caption: photo.caption || '',
      uploadedBy: photo.uploadedBy,
      uploadedAt: photo.uploadedAt || timestamp,
    };

    await sheet.addRow({
      id: newPhoto.id,
      location: newPhoto.location,
      country: newPhoto.country,
      url: newPhoto.url,
      source: newPhoto.source,
      caption: newPhoto.caption || '',
      uploadedBy: newPhoto.uploadedBy,
      uploadedAt: newPhoto.uploadedAt,
    });

    invalidatePhotosCache();
    return newPhoto;
  });
};

export const deletePhoto = async (id: string): Promise<boolean> => {
  return withRetry(async () => {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle['Photos'];
    if (!sheet) return false;

    const rows = await sheet.getRows();
    const row = rows.find(r => r.get('id') === id);

    if (row) {
      await row.delete();
      invalidatePhotosCache();
      return true;
    }
    return false;
  });
};

export interface AlbumData {
  id: string;
  location: string;
  country: string;
  albumUrl: string;
  title: string;
  photoCount: number;
  lastSyncedAt?: string;
  createdBy?: string;
  createdAt?: string;
}

export const getAlbums = async (): Promise<AlbumData[]> => {
  const now = Date.now();
  if (albumsCache && now - albumsCache.timestamp < DATA_CACHE_TTL) {
    return albumsCache.data;
  }

  return withRetry(async () => {
    const doc = await getDoc();
    let sheet = doc.sheetsByTitle['Albums'];
    const albumHeaders = ['id', 'location', 'country', 'albumUrl', 'title', 'photoCount', 'lastSyncedAt', 'createdBy', 'createdAt'];

    if (!sheet) {
      sheet = await doc.addSheet({ title: 'Albums' });
      await sheet.setHeaderRow(albumHeaders);
      albumsCache = { data: [], timestamp: Date.now() };
      return [];
    } else {
      await ensureSheetHeaders(sheet, albumHeaders);
    }

    const rows = await sheet.getRows();
    const data: AlbumData[] = rows.map(row => ({
      id: row.get('id'),
      location: row.get('location'),
      country: row.get('country'),
      albumUrl: row.get('albumUrl'),
      title: row.get('title') || 'Google Photos Album',
      photoCount: parseInt(row.get('photoCount') || '0', 10),
      lastSyncedAt: row.get('lastSyncedAt'),
      createdBy: row.get('createdBy'),
      createdAt: row.get('createdAt'),
    })).reverse();

    albumsCache = { data, timestamp: Date.now() };
    return data;
  });
};

export const addAlbum = async (album: Omit<AlbumData, 'id' | 'createdAt'>): Promise<AlbumData> => {
  return withRetry(async () => {
    const doc = await getDoc();
    let sheet = doc.sheetsByTitle['Albums'];
    const albumHeaders = ['id', 'location', 'country', 'albumUrl', 'title', 'photoCount', 'lastSyncedAt', 'createdBy', 'createdAt'];

    if (!sheet) {
      sheet = await doc.addSheet({ title: 'Albums' });
      await sheet.setHeaderRow(albumHeaders);
    } else {
      await ensureSheetHeaders(sheet, albumHeaders);
    }

    const timestamp = new Date().toISOString();
    const newAlbum: AlbumData = {
      id: `album_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ...album,
      createdAt: timestamp,
      lastSyncedAt: timestamp,
    };

    await sheet.addRow({
      id: newAlbum.id,
      location: newAlbum.location,
      country: newAlbum.country,
      albumUrl: newAlbum.albumUrl,
      title: newAlbum.title,
      photoCount: String(newAlbum.photoCount),
      lastSyncedAt: newAlbum.lastSyncedAt || timestamp,
      createdBy: newAlbum.createdBy || '',
      createdAt: newAlbum.createdAt || timestamp,
    });

    invalidateAlbumsCache();
    return newAlbum;
  });
};

export const deleteAlbum = async (id: string): Promise<boolean> => {
  return withRetry(async () => {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle['Albums'];
    if (!sheet) return false;

    const rows = await sheet.getRows();
    const row = rows.find(r => r.get('id') === id);

    if (row) {
      await row.delete();
      invalidateAlbumsCache();
      return true;
    }
    return false;
  });
};
