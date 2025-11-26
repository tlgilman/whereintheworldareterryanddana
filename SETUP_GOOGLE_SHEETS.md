# Google Sheets API Setup Guide

Follow these steps to generate the credentials needed for your Travel Tracker.

## 1. Create a Service Account
1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Select your project (or create a new one).
3.  In the search bar at the top, type **"Service Accounts"** and select it (under IAM & Admin).
4.  Click **+ CREATE SERVICE ACCOUNT** at the top.
5.  **Step 1:** Give it a name (e.g., "travel-tracker-bot"). Click **Create and Continue**.
6.  **Step 2:** Grant this service account access to project.
    *   Select Role: **Basic** > **Editor**.
    *   Click **Continue**.
7.  **Step 3:** Click **Done**.

## 2. Generate the JSON Key
1.  You should now see your new service account in the list. Click on its **Email address** link.
2.  Go to the **KEYS** tab (top navigation bar).
3.  Click **ADD KEY** > **Create new key**.
4.  Select **JSON** and click **Create**.
5.  A file will automatically download to your computer. **Keep this file safe!**

## 3. Configure Your Project
1.  Open the downloaded JSON file with a text editor (Notepad, VS Code, etc.).
2.  You need to copy values from this file into your `.env.local` file in the project folder.
    *   `client_email` -> `GOOGLE_SERVICE_ACCOUNT_EMAIL`
    *   `private_key` -> `GOOGLE_PRIVATE_KEY` (Copy the *entire* string, including `-----BEGIN PRIVATE KEY...`)

## 4. Share Your Spreadsheet
1.  Open your Google Sheet with the travel data.
2.  Click the big green **Share** button.
3.  In the "Add people and groups" box, paste the **client_email** from your JSON file (e.g., `travel-tracker-bot@your-project.iam.gserviceaccount.com`).
4.  Make sure "Editor" is selected.
5.  Click **Send** (unchecked "Notify people" if you want, it doesn't matter).

## 5. Get Sheet ID and Tab ID
1.  Look at the URL of your Google Sheet:
    `https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=123456789`
2.  The long string between `/d/` and `/edit` is your `GOOGLE_SHEET_ID`.
    *   Example: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`
3.  The number after `gid=` at the end of the URL is your `GOOGLE_SHEET_TAB_ID`.
    *   Example: `123456789`
    *   **Note:** If `gid` is `0`, you can leave it as `0`. If it's a different number, you MUST update `GOOGLE_SHEET_TAB_ID` in your `.env.local` file.

## 6. Prepare Your Sheet Data
**IMPORTANT:** Your Google Sheet must have the following column headers in the first row (exact spelling is important):

| Column Header | Description | Example |
| :--- | :--- | :--- |
| `location` | City and State/Region | Paris, France |
| `country` | Country Name | France |
| `travelTimeToHere` | Travel time description | 8h flight |
| `timeZone` | Timezone identifier | Europe/Paris |
| `arrivalDate` | Date of arrival | 2023-10-01 |
| `departureDate` | Date of departure | 2023-10-15 |
| `daysAtPlace` | Number of days stayed | 14 |
| `residing` | TRUE if currently living there | FALSE |
| `booked` | TRUE if trip is booked | TRUE |
| `vacationStart` | Start date if vacation | |
| `vacationEnd` | End date if vacation | |
| `lat` | Latitude | 48.8566 |
| `lon` | Longitude | 2.3522 |
