# Google Forms Integration Setup Guide

This guide will walk you through setting up Google Forms to automatically create Kanban cards when forms are submitted.

## Overview

When a user submits your Google Form, the following happens:
1. **Google Forms** → Triggers the Google Apps Script
2. **Google Apps Script** → Sends webhook to your Next.js API
3. **Next.js API** → Processes form data and creates a Kanban card
4. **Firestore** → Stores the card data
5. **Real-time updates** → All users see the new card immediately

## Step 1: Create Your Google Form

1. Go to [Google Forms](https://forms.google.com)
2. Create a new form with these **exact questions** (the webhook parser looks for these):

### Required Form Questions:
```
1. Email* (Short answer, required)
2. Firstname* (Short answer, required)  
3. Lastname* (Short answer, required)
4. Age* (Short answer, required)
5. Gender* (Multiple choice, required)
   - Option 1: Male
   - Option 2: Female
6. City* (Short answer, required)
7. Status* (Multiple choice, required)
   - Option 1: I am a new participant
   - Option 2: I am a Mahatma (Reviewer)
8. When did you receive your first Gnan Vidhi? Select the year 2025, when you are a new participant.* (Short answer, required)
9. ENGLISH - Your question to Gnani Pujyashree. Please keep it short and concise. Thank you. (Paragraph, required)
10. Telephone number (in case of queries) i.e. +1-652-765-1234* (Short answer, required)
11. Remarks (Paragraph, optional)
```

3. **Important**: Make sure the question text matches exactly as shown above, as the webhook parser uses text matching to identify fields.

## Step 2: Set Up Google Apps Script

### Method 1: From Google Forms (Recommended)
1. Open your Google Form
2. Click the **three dots menu** (⋮) in the top right
3. Select **Script editor** (or **Extensions > Apps Script**)
4. Delete any existing code
5. Copy and paste the complete code from `google-apps-script.js`

### Method 2: From Google Apps Script directly
1. Go to [Google Apps Script](https://script.google.com)
2. Click **New Project**
3. Delete the default code
4. Copy and paste the complete code from `google-apps-script.js`

## Step 3: Configure the Script

In the Google Apps Script editor, update these constants at the top:

```javascript
// Configuration - UPDATE THESE VALUES
const WEBHOOK_URL = 'https://your-app-domain.vercel.app/api/webhook/google-forms';
const WEBHOOK_SECRET = 'formflow-secure-webhook-2024'; // Match your .env.local
```

### For Local Development:
```javascript
const WEBHOOK_URL = 'http://localhost:9002/api/webhook/google-forms';
```

### For Production (after deployment):
```javascript
const WEBHOOK_URL = 'https://your-vercel-app.vercel.app/api/webhook/google-forms';
```

## Step 4: Set Up the Trigger

1. In Google Apps Script, click the **clock icon** (Triggers) in the left sidebar
2. Click **+ Add Trigger**
3. Configure the trigger:
   - **Choose which function to run**: `onFormSubmit`
   - **Choose which deployment should run**: `Head`
   - **Select event source**: `From form`
   - **Select event type**: `On form submit`
4. Click **Save**
5. You may need to authorize the script - follow the prompts

## Step 5: Test the Integration

### Test 1: Manual Test Function
1. In Google Apps Script, select the `testWebhook` function from the dropdown
2. Click the **Run** button (▶️)
3. Check the **Logs** (Execution transcript) for success/error messages
4. Check your Kanban board - you should see a test card appear

### Test 2: Real Form Submission
1. Open your Google Form's live URL (Preview mode)
2. Fill out and submit the form with test data
3. Check your Kanban board - a new card should appear in the "Online Submitted" column
4. The card should contain all the form data in a formatted layout

## Step 6: Configure Webhook Security (Recommended)

1. Add the webhook secret to your environment variables:
   ```bash
   # In your .env.local file
   GOOGLE_FORMS_WEBHOOK_SECRET=formflow-secure-webhook-2024
   ```

2. Make sure the same secret is used in your Google Apps Script configuration

## Troubleshooting

### Common Issues:

#### 1. "Failed to send form submission to webhook"
- **Check webhook URL**: Make sure it's accessible and correct
- **Check local development**: If testing locally, make sure your Next.js app is running on the correct port
- **Check CORS**: The webhook should accept POST requests

#### 2. "Webhook call failed with status 401"
- **Check webhook secret**: Make sure `GOOGLE_FORMS_WEBHOOK_SECRET` matches between your script and environment variables
- **Check authorization header**: Verify the Bearer token format

#### 3. Cards not appearing in Kanban
- **Check Firestore rules**: Make sure writes are allowed
- **Check console logs**: Look for errors in the Next.js application logs
- **Check form field mapping**: Ensure question text matches the parser expectations

#### 4. "Permission denied" errors
- **Authorize the script**: Go through the Google authorization flow
- **Check Gmail settings**: If needed, enable "less secure app access"

### Debug Steps:

1. **Check Google Apps Script Logs**:
   - In Apps Script, go to **Executions** to see detailed logs
   - Look for any error messages or failed HTTP requests

2. **Check Next.js API Logs**:
   - Look at your terminal running `npm run dev`
   - Check for incoming webhook requests and any processing errors

3. **Test webhook endpoint directly**:
   ```bash
   # Test your webhook is accessible
   curl -X GET http://localhost:9002/api/webhook/google-forms
   ```

4. **Verify form field parsing**:
   - Check the webhook logs to see the exact question titles being received
   - Adjust the parsing logic if question text doesn't match

## Form Field Mapping

The webhook automatically maps form questions to card data:

| Form Question (contains) | Card Field | Notes |
|-------------------------|------------|-------|
| "email" | email | Primary contact |
| "firstname" or "first name" | firstname | Display name |
| "lastname" or "last name" | lastname | Display name |
| "age" | age | Demographics |
| "gender" | gender | Demographics |
| "city" | city | Location |
| "status" | status | Participant type |
| "gnan vidhi" | gnanVidhiYear | Spiritual background |
| "english" + "question" | englishQuestion | Main content |
| "telephone" or "phone" | telephone | Contact info |
| "remarks" | remarks | Additional notes |

## Card Format

Each form submission creates a card with this structure:

```
Title: [Status] - [Firstname] [Lastname]
Column: Online Submitted

Content:
**Personal Information**
Name: John Doe
Email: john@example.com
Age: 25
Gender: Male
City: New York
Phone: +1-555-123-4567

**Participation Status**
Status: I am a new participant
Gnan Vidhi Year: 2025

**Question for Gnani Pujyashree**
This is my question about spiritual practice...

**Remarks**
Additional comments here...
```

## Next Steps

1. **Deploy to production**: Once tested locally, deploy your app to Vercel
2. **Update webhook URL**: Change the Google Apps Script to point to your production URL
3. **Share the form**: Distribute your Google Form link to participants
4. **Monitor submissions**: Watch the Kanban board for real-time submissions
5. **Set up Firestore security rules**: Implement proper security for production use

## Production Checklist

- [ ] Google Form created with exact question structure
- [ ] Google Apps Script configured and authorized
- [ ] Trigger set up for form submissions
- [ ] Webhook URL points to production domain
- [ ] Webhook secret configured in both places
- [ ] Test submission successful
- [ ] Firestore security rules updated
- [ ] Form shared with participants

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Google Apps Script execution logs
3. Check Next.js application logs
4. Verify all URLs and secrets are correctly configured 