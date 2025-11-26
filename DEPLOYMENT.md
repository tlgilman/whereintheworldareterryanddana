# Deployment Guide

This application requires specific environment variables to function correctly. If you are seeing 500 errors after deployment, it is likely because one or more of these variables are missing.

## Required Environment Variables

You must configure the following environment variables in your deployment platform (e.g., AWS Amplify, Vercel).

| Variable Name | Description | How to Get It |
| :--- | :--- | :--- |
| `GOOGLE_SHEET_ID` | The ID of your Google Sheet. | From the URL of your Google Sheet: `docs.google.com/spreadsheets/d/[ID]/edit` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Email of the Google Service Account. | From Google Cloud Console > IAM & Admin > Service Accounts. |
| `GOOGLE_PRIVATE_KEY` | Private key for the Service Account. | Generated when creating a key in Google Cloud Console. **Must include `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`.** |
| `NEXTAUTH_SECRET` | Secret key for NextAuth. | Generate one using `openssl rand -base64 32` or any random string generator. |
| `NEXTAUTH_URL` | The URL of your deployed site. | Your domain name (e.g., `https://www.example.com`). |

### Optional Variables

| Variable Name | Description | Default |
| :--- | :--- | :--- |
| `GOOGLE_SHEET_TAB_ID` | The ID of the specific tab in the sheet. | `0` (the first tab) |
| `ADMIN_EMAIL` | Email for admin access. | `terry.and.dana@example.com` |
| `ADMIN_PASSWORD` | Password for admin access. | `admin-password-here` |
| `GUEST_PASSWORD` | Password for guest access. | `guest-password-here` |

## AWS Amplify Specific Instructions

1. Go to your App in the AWS Amplify Console.
2. Navigate to **App settings** > **Environment variables**.
3. Click **Manage variables**.
4. Add each of the required variables listed above.
5. **Important:** For `GOOGLE_PRIVATE_KEY`, ensure you paste the entire key including the header and footer. If you have issues with newlines, you might need to replace actual newlines with `\n` depending on how Amplify handles multiline secrets, though usually pasting it directly works.
6. **Redeploy** your application for the changes to take effect.

## Troubleshooting

- **500 Error on Load:** Check the build logs or runtime logs. If you see "Google Sheets credentials are missing", you missed one of the Google variables.
- **Authentication Error:** Check `NEXTAUTH_SECRET` and `NEXTAUTH_URL`.
