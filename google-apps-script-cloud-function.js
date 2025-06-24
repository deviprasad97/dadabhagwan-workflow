/**
 * Google Apps Script for Google Forms Integration with Google Cloud Function
 * This script sends form submissions to a Google Cloud Function which processes them
 * and adds entries to Firestore database.
 */

// Configuration - Update these values for your setup
const CONFIG = {
  // Your Google Cloud Function URL (replace with your actual URL after deployment)
  CLOUD_FUNCTION_URL: 'https://us-central1-dadabhagwan-qna.cloudfunctions.net/processFormSubmission',
  
  // Enable/disable logging
  ENABLE_LOGGING: true,
  
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000 // milliseconds
};

/**
 * Main function that gets triggered when form is submitted
 * This is the entry point for form submissions
 */
function onFormSubmit(e) {
  try {
    console.log('Form submission triggered');
    
    if (!e || !e.response) {
      throw new Error('No form response data available');
    }
    
    // Extract form data
    const formData = extractFormData(e.response);
    console.log('Extracted form data:', JSON.stringify(formData, null, 2));
    
    // Send to Cloud Function with retry logic
    sendToCloudFunction(formData);
    
  } catch (error) {
    console.error('Error in onFormSubmit:', error);
    logError('onFormSubmit', error, e);
  }
}

/**
 * Extract and normalize form data from the form response
 */
function extractFormData(response) {
  const itemResponses = response.getItemResponses();
  const formData = {
    timestamp: new Date().toISOString(),
    responseId: response.getId()
  };
  
  // Map form responses to expected field names
  itemResponses.forEach(itemResponse => {
    const question = itemResponse.getItem().getTitle().toLowerCase();
    const answer = itemResponse.getResponse();
    
    // Map questions to standardized field names
    if (question.includes('email')) {
      formData.email = answer;
    } else if (question.includes('first name') || question.includes('firstname')) {
      formData.firstname = answer;
    } else if (question.includes('last name') || question.includes('lastname')) {
      formData.lastname = answer;
    } else if (question.includes('age')) {
      formData.age = answer;
    } else if (question.includes('gender')) {
      formData.gender = answer;
    } else if (question.includes('city')) {
      formData.city = answer;
    } else if (question.includes('status')) {
      formData.status = answer;
    } else if (question.includes('gnan vidhi') || question.includes('year')) {
      formData.gnan_vidhi_year = answer;
    } else if (question.includes('english') && question.includes('question')) {
      formData.english_question = answer;
    } else if (question.includes('telephone') || question.includes('phone')) {
      formData.telephone = answer;
    } else if (question.includes('remarks') || question.includes('notes')) {
      formData.remarks = answer;
    } else {
      // For any other questions, use a sanitized version of the question as key
      const key = question.replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
      formData[key] = answer;
    }
  });
  
  return formData;
}

/**
 * Send form data to Google Cloud Function with retry logic
 */
function sendToCloudFunction(formData, retryCount = 0) {
  try {
    console.log(`Sending to Cloud Function (attempt ${retryCount + 1}):`, CONFIG.CLOUD_FUNCTION_URL);
    
    const payload = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      payload: JSON.stringify(formData)
    };
    
    const response = UrlFetchApp.fetch(CONFIG.CLOUD_FUNCTION_URL, payload);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    console.log('Cloud Function response:', responseCode, responseText);
    
    if (responseCode >= 200 && responseCode < 300) {
      console.log('✅ Successfully sent to Cloud Function');
      
      if (CONFIG.ENABLE_LOGGING) {
        logSuccess(formData, responseText);
      }
    } else {
      throw new Error(`HTTP ${responseCode}: ${responseText}`);
    }
    
  } catch (error) {
    console.error(`❌ Error sending to Cloud Function (attempt ${retryCount + 1}):`, error);
    
    // Retry logic
    if (retryCount < CONFIG.MAX_RETRIES) {
      console.log(`Retrying in ${CONFIG.RETRY_DELAY}ms...`);
      Utilities.sleep(CONFIG.RETRY_DELAY);
      sendToCloudFunction(formData, retryCount + 1);
    } else {
      console.error('❌ Max retries exceeded. Logging error.');
      logError('sendToCloudFunction', error, formData);
      
      // Optionally send email notification about the failure
      sendErrorNotification(error, formData);
    }
  }
}

/**
 * Log successful submissions to a Google Sheet (optional)
 */
function logSuccess(formData, response) {
  try {
    // You can create a Google Sheet to log successful submissions
    // const sheet = SpreadsheetApp.openById('YOUR_SHEET_ID').getActiveSheet();
    // sheet.appendRow([
    //   new Date(),
    //   formData.email,
    //   formData.firstname + ' ' + (formData.lastname || ''),
    //   'SUCCESS',
    //   response
    // ]);
    
    console.log('Success logged for:', formData.email);
  } catch (error) {
    console.error('Error logging success:', error);
  }
}

/**
 * Log errors to Google Sheet and/or send notifications
 */
function logError(source, error, data) {
  try {
    console.error(`Error in ${source}:`, error.toString());
    
    // You can create a Google Sheet to log errors
    // const sheet = SpreadsheetApp.openById('YOUR_ERROR_LOG_SHEET_ID').getActiveSheet();
    // sheet.appendRow([
    //   new Date(),
    //   source,
    //   error.toString(),
    //   JSON.stringify(data),
    //   'ERROR'
    // ]);
    
  } catch (logError) {
    console.error('Error logging error:', logError);
  }
}

/**
 * Send email notification when there's a critical error
 */
function sendErrorNotification(error, formData) {
  try {
    // Uncomment and configure to send error notifications
    // const subject = 'DadaBhagwan: Google Forms Integration Error';
    // const body = `
    //   Error occurred while processing form submission:
    //   
    //   Error: ${error.toString()}
    //   
    //   Form Data: ${JSON.stringify(formData, null, 2)}
    //   
    //   Time: ${new Date().toISOString()}
    //   
    //   Please check the Cloud Function logs for more details.
    // `;
    // 
    // GmailApp.sendEmail('your-email@example.com', subject, body);
    
    console.log('Error notification would be sent for:', formData.email);
  } catch (notificationError) {
    console.error('Error sending notification:', notificationError);
  }
}

/**
 * Test function to verify the integration
 * Run this manually to test your setup
 */
function testCloudFunctionIntegration() {
  console.log('🧪 Testing Cloud Function integration...');
  
  const testData = {
    email: 'test@example.com',
    firstname: 'Test',
    lastname: 'User',
    age: '25',
    gender: 'Other',
    city: 'Test City',
    status: 'Student',
    gnan_vidhi_year: '2023',
    english_question: 'This is a test question for the integration.',
    telephone: '123-456-7890',
    remarks: 'This is a test submission from Google Apps Script.',
    timestamp: new Date().toISOString(),
    responseId: 'test_' + Date.now()
  };
  
  console.log('Test data:', JSON.stringify(testData, null, 2));
  
  try {
    sendToCloudFunction(testData);
    console.log('✅ Test completed successfully');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

/**
 * Setup function to configure the form trigger
 * Run this once to set up the form submission trigger
 */
function setupFormTrigger() {
  try {
    // Get the form (replace with your form ID)
    const form = FormApp.openById('YOUR_FORM_ID');
    
    // Delete existing triggers
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'onFormSubmit') {
        ScriptApp.deleteTrigger(trigger);
      }
    });
    
    // Create new trigger
    ScriptApp.newTrigger('onFormSubmit')
      .onFormSubmit()
      .create();
    
    console.log('✅ Form trigger set up successfully');
    
  } catch (error) {
    console.error('❌ Error setting up form trigger:', error);
  }
}

/**
 * Health check function for the Cloud Function
 */
function checkCloudFunctionHealth() {
  try {
    const healthUrl = CONFIG.CLOUD_FUNCTION_URL.replace('processFormSubmission', 'healthCheck');
    const response = UrlFetchApp.fetch(healthUrl);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    console.log('Health check response:', responseCode, responseText);
    
    if (responseCode === 200) {
      console.log('✅ Cloud Function is healthy');
      return true;
    } else {
      console.log('❌ Cloud Function health check failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Error checking Cloud Function health:', error);
    return false;
  }
} 