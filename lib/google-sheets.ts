import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { TravelData } from '@/app/types/Travel-data';

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

export const getDoc = async () => {
  if (!SPREADSHEET_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
    throw new Error('Google Sheets credentials are missing');
  }

  const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
  await doc.loadInfo();
  return doc;
};

export const fetchTravelData = async (): Promise<TravelData[]> => {
  // try {
    console.log('Starting fetchTravelData...');
    const doc = await getDoc();
    console.log('Doc loaded:', doc.title);
    
    const sheet = doc.sheetsById[parseInt(SHEET_ID)];
    if (!sheet) {
      throw new Error(`Sheet with ID ${SHEET_ID} not found. Available sheets: ${Object.keys(doc.sheetsById).join(', ')}`);
    }
    console.log('Sheet found:', sheet.title);

    const rows = await sheet.getRows();
    console.log(`Found ${rows.length} rows`);

    if (rows.length > 0) {
        // console.log('First row headers:', rows[0].toObject());
    }

    return rows.map((row) => {
      const parseBoolean = (value: string | undefined): boolean => {
        if (!value) return false;
        const v = value.toLowerCase().trim();
        return v === 'true' || v === 'yes' || v === '1' || v === 'y' || v === 't';
      };

      return {
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
      };
    });
  // } catch (error) {
  //   console.error('Error fetching travel data:', error);
  //   return [];
  // }
};

export const addTrip = async (trip: TravelData) => {
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
};

export const trackVisit = async (ip: string, userAgent: string) => {
  try {
    const doc = await getDoc();
    
    // Check if "Visitors" sheet exists, if not create it
    let sheet = doc.sheetsByTitle['Visitors'];
    if (!sheet) {
      console.log('Creating Visitors sheet...');
      sheet = await doc.addSheet({ title: 'Visitors' });
      await sheet.setHeaderRow(['timestamp', 'ip', 'userAgent', 'location']);
    }

    // Add the visit
    await sheet.addRow({
      timestamp: new Date().toISOString(),
      ip,
      userAgent,
      location: 'Unknown' // Could be enhanced with GeoIP later
    });
    console.log(`Tracked visit from ${ip}`);
  } catch (error) {
    console.error('Error tracking visit:', error);
    // Don't throw, just log error so we don't break the app flow
  }
};
