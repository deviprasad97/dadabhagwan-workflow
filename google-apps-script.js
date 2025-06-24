/**
 * Google Apps Script for FormFlow Kanban Integration
 * 
 * This script automatically sends form submissions to your Next.js webhook
 * when a Google Form is submitted.
 * 
 * Setup Instructions:
 * 1. Open Google Apps Script (script.google.com)
 * 2. Create a new project
 * 3. Replace the default code with this script
 * 4. Update the WEBHOOK_URL and WEBHOOK_SECRET constants below
 * 5. Go to your Google Form
 * 6. Click on the three dots menu → Script editor (or Extensions → Apps Script)
 * 7. Paste this code and save
 * 8. Set up the trigger (see instructions below)
 */

// Configuration - UPDATE THESE VALUES
const WEBHOOK_URL = 'https://your-app-domain.vercel.app/api/webhook/google-forms';
const WEBHOOK_SECRET = 'your-secure-webhook-secret-here'; // Optional but recommended

/**
 * Main function that gets called when a form is submitted
 * This is the trigger function - make sure to set up the trigger for this function
 */
function onFormSubmit(e) {
  try {
    console.log('Form submission detected');
    console.log('Event object:', e);
    
    // Get form and response details
    const form = e.source;
    const formResponse = e.response;
    
    // Extract basic information
    const formId = form.getId();
    const formTitle = form.getTitle();
    const responseId = formResponse.getId();
    const timestamp = formResponse.getTimestamp();
    const respondentEmail = formResponse.getRespondentEmail();
    
    // Get all item responses (question-answer pairs)
    const itemResponses = formResponse.getItemResponses();
    
    // Process answers into our expected format
    const answers = itemResponses.map(itemResponse => {
      const item = itemResponse.getItem();
      const question = item.getTitle();
      const response = itemResponse.getResponse();
      
      // Handle different response types
      let answer;
      if (Array.isArray(response)) {
        answer = response.join(', ');
      } else {
        answer = String(response || '');
      }
      
      return {
        question: question,
        answer: answer,
        type: item.getType().toString()
      };
    });
    
    // Create webhook payload
    const payload = {
      formId: formId,
      formTitle: formTitle,
      responseId: responseId,
      timestamp: timestamp.toISOString(),
      respondentEmail: respondentEmail,
      answers: answers,
      // Additional metadata
      submissionSource: 'google-forms',
      scriptVersion: '1.0.0'
    };
    
    console.log('Sending payload to webhook:', payload);
    
    // Send to webhook
    const success = sendToWebhook(payload);
    
    if (success) {
      console.log('✅ Form submission successfully sent to FormFlow Kanban');
      
      // Optional: Add a note to the form response or send confirmation email
      // You can implement additional logic here if needed
      
    } else {
      console.error('❌ Failed to send form submission to webhook');
      
      // Optional: Implement retry logic or error handling
      // You might want to store failed submissions for manual processing
    }
    
  } catch (error) {
    console.error('Error in onFormSubmit:', error);
    
    // Optional: Send error notification email to admin
    // GmailApp.sendEmail('admin@yourdomain.com', 'FormFlow Integration Error', error.toString());
  }
}

/**
 * Send the form data to your Next.js webhook
 */
function sendToWebhook(payload) {
  try {
    const options = {
      'method': 'POST',
      'headers': {
        'Content-Type': 'application/json'
      },
      'payload': JSON.stringify(payload)
    };
    
    // Add authorization header if webhook secret is configured
    if (WEBHOOK_SECRET) {
      options.headers['Authorization'] = `Bearer ${WEBHOOK_SECRET}`;
    }
    
    console.log('Making HTTP request to:', WEBHOOK_URL);
    
    const response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    console.log('Webhook response code:', responseCode);
    console.log('Webhook response:', responseText);
    
    if (responseCode >= 200 && responseCode < 300) {
      console.log('Webhook call successful');
      return true;
    } else {
      console.error('Webhook call failed with status:', responseCode);
      console.error('Response:', responseText);
      return false;
    }
    
  } catch (error) {
    console.error('Error calling webhook:', error);
    return false;
  }
}

/**
 * Test function to verify the webhook is working
 * Run this manually to test your setup
 */
function testWebhook() {
  console.log('Testing webhook connection...');
  
  // Create a test payload that matches your form structure
  const testPayload = {
    formId: 'test-form-id',
    formTitle: 'Test FormFlow Integration',
    responseId: 'test-response-id',
    timestamp: new Date().toISOString(),
    respondentEmail: 'test@example.com',
    answers: [
      { question: 'Email', answer: 'test@example.com', type: 'TEXT' },
      { question: 'Firstname', answer: 'John', type: 'TEXT' },
      { question: 'Lastname', answer: 'Doe', type: 'TEXT' },
      { question: 'Age', answer: '25', type: 'TEXT' },
      { question: 'Gender', answer: 'Male', type: 'MULTIPLE_CHOICE' },
      { question: 'City', answer: 'New York', type: 'TEXT' },
      { question: 'Status', answer: 'I am a new participant', type: 'MULTIPLE_CHOICE' },
      { question: 'When did you receive your first Gnan Vidhi? Select the year 2025, when you are a new participant.', answer: '2025', type: 'TEXT' },
      { question: 'ENGLISH - Your question to Gnani Pujyashree. Please keep it short and concise. Thank you.', answer: 'This is a test question for the integration.', type: 'PARAGRAPH_TEXT' },
      { question: 'Telephone number (in case of queries) i.e. +1-652-765-1234', answer: '+1-555-123-4567', type: 'TEXT' },
      { question: 'Remarks', answer: 'This is a test submission from Google Apps Script.', type: 'PARAGRAPH_TEXT' }
    ],
    submissionSource: 'google-forms-test',
    scriptVersion: '1.0.0'
  };
  
  const success = sendToWebhook(testPayload);
  
  if (success) {
    console.log('✅ Test successful! Your webhook is working correctly.');
  } else {
    console.log('❌ Test failed. Please check your webhook URL and configuration.');
  }
  
  return success;
}

/**
 * Setup function to help configure the trigger
 * Run this once to set up the automatic form submission trigger
 */
function setupTrigger() {
  try {
    // Delete existing triggers for this function to avoid duplicates
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'onFormSubmit') {
        ScriptApp.deleteTrigger(trigger);
      }
    });
    
    // Note: You need to manually set up the trigger in the Google Forms interface
    // This function is just for reference
    console.log('Please set up the trigger manually:');
    console.log('1. Go to your Google Form');
    console.log('2. Click the three dots menu → Script editor');
    console.log('3. In Apps Script, go to Triggers (clock icon)');
    console.log('4. Click "Add Trigger"');
    console.log('5. Choose function: onFormSubmit');
    console.log('6. Choose event source: From form');
    console.log('7. Choose event type: On form submit');
    console.log('8. Save the trigger');
    
  } catch (error) {
    console.error('Error in setupTrigger:', error);
  }
}

/**
 * Utility function to get form information
 * Useful for debugging and setup
 */
function getFormInfo() {
  // You need to replace 'YOUR_FORM_ID' with your actual form ID
  // You can find the form ID in the URL when editing your form
  const formId = 'YOUR_FORM_ID'; 
  
  try {
    const form = FormApp.openById(formId);
    console.log('Form Title:', form.getTitle());
    console.log('Form ID:', form.getId());
    console.log('Form URL:', form.getPublishedUrl());
    
    const items = form.getItems();
    console.log('Form Questions:');
    items.forEach((item, index) => {
      console.log(`${index + 1}. ${item.getTitle()} (${item.getType()})`);
    });
    
  } catch (error) {
    console.error('Error getting form info:', error);
    console.log('Make sure to update the formId variable with your actual form ID');
  }
} 