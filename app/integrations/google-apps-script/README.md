# A2O Assessment Google Apps Script

This folder stores the reviewed source for the Google Apps Script web app that
appends assessment leads to the approved Google Sheet.

## Destination

- Spreadsheet ID: `1Xi_u4DYkkMtpl7ClpaxwOyGjU7VAud6d8_uQGmQRHcY`
- Sheet: `工作表1`
- Expected columns: `A:M`

## Required Script Property

- `SHARED_SECRET`

Generate the secret outside source control. Store the same value as encrypted
Vercel variable `APPS_SCRIPT_SHARED_SECRET`.

## Deployment

1. Open the approved Sheet and choose Extensions → Apps Script.
2. Replace `Code.gs` with the reviewed file in this directory.
3. Add `SHARED_SECRET` under Project Settings → Script Properties.
4. Deploy as a Web App that executes as the Sheet owner.
5. Authorize access to the approved spreadsheet.
6. Store the web app URL only in encrypted Vercel variable
   `APPS_SCRIPT_WEBHOOK_URL`.

Never commit the shared secret, deployment URL, customer data, or authorization
tokens.
