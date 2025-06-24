# Google Cloud Function Setup Guide

This guide will help you set up Google Cloud Functions to handle Google Forms submissions and automatically add entries to your Firestore database.

## Architecture Overview

```
Google Forms → Google Apps Script → Google Cloud Function → Firestore Database → Next.js App (Real-time updates)
```

## Prerequisites

1. **Google Cloud Platform Account** with billing enabled
2. **Firebase Project** (your existing `dadabhagwan-qna` project)
3. **Google Cloud CLI** installed on your machine
4. **Node.js** (version 18 or higher)

## Step 1: Set Up Google Cloud Environment

### 1.1 Install Google Cloud CLI

```bash
# macOS
brew install google-cloud-sdk

# Or download from: https://cloud.google.com/sdk/docs/install
```

### 1.2 Initialize and Authenticate

```bash
# Initialize gcloud
gcloud init

# Select your project (dadabhagwan-qna)
gcloud config set project dadabhagwan-qna

# Authenticate
gcloud auth login
gcloud auth application-default login
```

### 1.3 Enable Required APIs

```bash
# Enable Cloud Functions API
gcloud services enable cloudfunctions.googleapis.com

# Enable Cloud Build API (required for deployment)
gcloud services enable cloudbuild.googleapis.com

# Enable Firebase Admin SDK
gcloud services enable firebase.googleapis.com
```

## Step 2: Prepare the Cloud Function

### 2.1 Create Cloud Function Directory

```bash
# Create a new directory for your cloud function
mkdir formflow-cloud-function
cd formflow-cloud-function

# Copy the files we created
cp ../google-cloud-function.js ./index.js
cp ../cloud-function-package.json ./package.json
```

### 2.2 Install Dependencies

```bash
# Install dependencies
npm install
```

### 2.3 Test Locally (Optional)

```bash
# Start the function locally
npm start

# Test in another terminal
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "firstname": "Test",
    "lastname": "User",
    "english_question": "This is a test question"
  }'
```

## Step 3: Deploy to Google Cloud Functions

### 3.1 Deploy the Function

```bash
# Deploy the function
gcloud functions deploy processFormSubmission \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --source=. \
  --entry-point=processFormSubmission \
  --memory=256MB \
  --timeout=60s \
  --region=us-central1

# Deploy the health check function
gcloud functions deploy healthCheck \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --source=. \
  --entry-point=healthCheck \
  --memory=128MB \
  --timeout=30s \
  --region=us-central1
```

### 3.2 Get Function URLs

```bash
# Get the function URL
gcloud functions describe processFormSubmission --region=us-central1

# The URL will be something like:
# https://us-central1-dadabhagwan-qna.cloudfunctions.net/processFormSubmission
```

### 3.3 Test the Deployed Function

```bash
# Test the deployed function
curl -X POST https://us-central1-dadabhagwan-qna.cloudfunctions.net/processFormSubmission \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "firstname": "Test",
    "lastname": "User",
    "english_question": "This is a test question"
  }'

# Test health check
curl https://us-central1-dadabhagwan-qna.cloudfunctions.net/healthCheck
```

## Step 4: Set Up Google Forms Integration

### 4.1 Create/Update Your Google Form

1. Go to [Google Forms](https://forms.google.com)
2. Create a new form or open your existing form
3. Ensure you have the following questions (adjust titles as needed):
   - **Email** (required)
   - **First Name** (required)
   - **Last Name**
   - **Age**
   - **Gender**
   - **City**
   - **Status**
   - **Gnan Vidhi Year**
   - **English Question** (paragraph text)
   - **Telephone**
   - **Remarks**

### 4.2 Set Up Google Apps Script

1. In your Google Form, click the **three dots menu** → **Script editor**
2. Delete any existing code
3. Copy and paste the content from `google-apps-script-cloud-function.js`
4. **Update the configuration**:
   ```javascript
   const CONFIG = {
     // Replace with your actual Cloud Function URL
     CLOUD_FUNCTION_URL: 'https://us-central1-dadabhagwan-qna.cloudfunctions.net/processFormSubmission',
     ENABLE_LOGGING: true,
     MAX_RETRIES: 3,
     RETRY_DELAY: 1000
   };
   ```

### 4.3 Set Up Form Trigger

1. In the Apps Script editor, run the `setupFormTrigger()` function:
   - Click **Run** → Select `setupFormTrigger`
   - Grant necessary permissions
2. Alternatively, set up manually:
   - Click **Triggers** (clock icon)
   - **Add Trigger**
   - Choose function: `onFormSubmit`
   - Event source: `From form`
   - Event type: `On form submit`

### 4.4 Test the Integration

1. In Apps Script, run `testCloudFunctionIntegration()` function
2. Check the execution log for success/error messages
3. Submit a test form response
4. Check your Firestore database for the new card entry

## Step 5: Configure Firebase Security Rules

Update your Firestore security rules to allow the Cloud Function to write data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow Cloud Functions to write cards
    match /cards/{document} {
      allow read, write: if request.auth != null || 
        request.auth.token.firebase.sign_in_provider == 'custom';
    }
    
    // Allow Cloud Functions to write audit logs
    match /audit_logs/{document} {
      allow write: if true; // Cloud Functions need to write audit logs
      allow read: if request.auth != null;
    }
    
    // Allow Cloud Functions to write error logs
    match /error_logs/{document} {
      allow write: if true; // Cloud Functions need to write error logs
      allow read: if request.auth != null && 
        request.auth.token.role == 'Admin';
    }
    
    // Users collection (existing rules)
    match /users/{document} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Step 6: Monitoring and Logging

### 6.1 View Cloud Function Logs

```bash
# View function logs
gcloud functions logs read processFormSubmission --region=us-central1

# Follow logs in real-time
gcloud functions logs tail processFormSubmission --region=us-central1
```

### 6.2 Set Up Monitoring (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **Cloud Functions**
3. Click on your function
4. Go to **Logs** tab to view execution logs
5. Set up **Alerting** for errors if needed

### 6.3 Error Handling

The Cloud Function automatically:
- Logs errors to Firestore `error_logs` collection
- Provides detailed error messages
- Handles retries in the Apps Script

## Step 7: Testing the Complete Flow

1. **Submit a test form**:
   - Go to your Google Form
   - Fill out and submit the form

2. **Check the logs**:
   ```bash
   gcloud functions logs tail processFormSubmission --region=us-central1
   ```

3. **Verify in Firestore**:
   - Open Firebase Console
   - Go to Firestore Database
   - Check the `cards` collection for new entries

4. **Verify in your Next.js app**:
   - The new card should appear in real-time in the "Online Submitted" column

## Troubleshooting

### Common Issues

1. **Permission Denied**:
   ```bash
   # Ensure you have the right permissions
   gcloud projects add-iam-policy-binding dadabhagwan-qna \
     --member="user:your-email@gmail.com" \
     --role="roles/cloudfunctions.developer"
   ```

2. **Function Timeout**:
   - Increase timeout in deployment command: `--timeout=120s`

3. **Memory Issues**:
   - Increase memory: `--memory=512MB`

4. **CORS Issues**:
   - The function includes CORS headers automatically

### Debugging Steps

1. **Check function deployment**:
   ```bash
   gcloud functions describe processFormSubmission --region=us-central1
   ```

2. **Test function directly**:
   ```bash
   curl -X POST [YOUR_FUNCTION_URL] \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","firstname":"Test"}'
   ```

3. **Check Apps Script logs**:
   - In Apps Script editor, go to **Executions** to see logs

## Security Considerations

1. **Function Authentication**: Currently set to `--allow-unauthenticated` for Google Forms integration
2. **Input Validation**: The function validates required fields
3. **Error Logging**: Sensitive data is not logged in error messages
4. **Firestore Rules**: Configure appropriate security rules for production

## Cost Optimization

1. **Memory**: Start with 256MB, adjust based on usage
2. **Timeout**: Set appropriate timeout (60s is usually sufficient)
3. **Invocations**: Monitor usage to stay within free tier limits
4. **Regions**: Use regions close to your users

## Next Steps

1. **Production Deployment**: Update Firestore security rules for production
2. **Monitoring**: Set up alerting for errors and performance issues
3. **Scaling**: Monitor usage and adjust resources as needed
4. **Backup**: Ensure your Firestore data is backed up regularly

Your Google Cloud Function integration is now complete! Form submissions will automatically create cards in your Firestore database, which will appear in real-time in your Next.js Kanban application. 