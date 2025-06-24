# Google Cloud Function Integration Setup

## Overview
The FormFlow application can integrate with Google Cloud Functions to create Kanban cards directly in Firestore when forms are submitted. This provides a consistent workflow whether submissions come from the FormFlow app or external Google Forms.

## Setup Instructions

### 1. Deploy the Cloud Function

Deploy the provided Cloud Function (`formflow-cloud-function/google-cloud-function.js`) to Google Cloud Functions:

```bash
cd formflow-cloud-function
gcloud functions deploy processFormSubmission \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --memory 256MB \
  --timeout 60s
```

### 2. Configure Environment Variables

Add your Cloud Function URL to your environment configuration:

```bash
# .env.local
NEXT_PUBLIC_GOOGLE_CLOUD_FUNCTION_URL=https://your-region-your-project.cloudfunctions.net/processFormSubmission
```

### 3. Firebase Configuration

Ensure your Cloud Function has the same Firebase project configuration as your FormFlow app. The function will create cards in the same Firestore database.

## How It Works

### Form Submission Flow

1. **User submits form** via FormFlow public form page
2. **Form data is validated** and saved to Firestore as a submission
3. **Cloud Function is called** if board integration is enabled
4. **Card is created** in the specified board's Firestore collection
5. **Submission status** is updated to 'processed' with card reference

### Data Transformation

The FormFlow app transforms form responses to match the Cloud Function's expected format:

```javascript
{
  // Required fields
  email: "user@example.com",
  firstname: "John",
  lastname: "Doe",
  
  // DadaBhagwan specific fields
  age: "35",
  gender: "Male",
  city: "Ahmedabad",
  status: "I am a new participant",
  gnan_vidhi_year: "2025",
  english_question: "Your question here...",
  telephone: "+1-555-123-4567",
  remarks: "Optional remarks",
  
  // Metadata
  formId: "form-123",
  boardId: "board-456",
  submissionId: "submission-789"
}
```

### Card Creation

The Cloud Function creates Kanban cards with:

- **Title**: Participant name (firstname + lastname)
- **Content**: Formatted participant details and question
- **Column**: 'online_submitted' (default starting column)
- **Board**: Assigned board from form integration settings
- **Metadata**: Complete form data and processing information

## Error Handling

### Client-Side
- Failed Cloud Function calls don't prevent form submission
- Submission status is marked as 'error' for manual processing
- Error details are logged in submission metadata

### Cloud Function
- Validation errors return 400 status codes
- Processing errors are logged to Firestore error_logs collection
- Detailed error information includes form and board IDs

## Monitoring and Debugging

### Logs
- **Cloud Function logs**: View in Google Cloud Console
- **Error logs**: Stored in Firestore `error_logs` collection
- **Audit logs**: Card creation tracked in `audit_logs` collection

### Health Check
The Cloud Function includes a health check endpoint:
```
GET https://your-function-url/healthCheck
```

## Board Integration Requirements

For automatic card creation to work:

1. ✅ Form must use a **Q&A template**
2. ✅ Form must be **assigned to a board**
3. ✅ Board integration must be **enabled**
4. ✅ **Auto-create cards** setting must be enabled
5. ✅ Environment variable must point to valid Cloud Function URL

## Testing the Integration

1. Create a form using a Q&A template
2. Assign it to a board with integration enabled
3. Publish the form
4. Submit a test response
5. Check the Kanban board for the new card
6. Verify submission status is 'processed'

## Troubleshooting

### Common Issues

**Cards not being created:**
- Check Cloud Function URL in environment variables
- Verify board integration is enabled in form settings
- Check browser console for API call errors
- Review Cloud Function logs for processing errors

**Invalid data errors:**
- Ensure required fields (email, firstname) are present
- Check field mapping matches template structure
- Verify boardId is valid and exists

**Permission errors:**
- Ensure Cloud Function has Firestore write permissions
- Check Firebase project configuration matches
- Verify authentication tokens if using secured endpoints

## Security Considerations

- Cloud Function is configured for unauthenticated access
- Consider adding API key validation for production use
- Monitor usage to prevent abuse
- Implement rate limiting if needed
- Validate all input data before processing 