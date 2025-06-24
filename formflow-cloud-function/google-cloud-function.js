const functions = require('@google-cloud/functions-framework');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

/**
 * Google Cloud Function to handle Google Forms submissions
 * This function receives form data and creates a new card in Firestore
 */
functions.http('processFormSubmission', async (req, res) => {
  // Set CORS headers for cross-origin requests
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    console.error('Invalid method:', req.method);
    return res.status(405).json({ 
      error: 'Method not allowed. Use POST.' 
    });
  }

  try {
    console.log('Received form submission:', JSON.stringify(req.body, null, 2));

    // Extract form data
    const formData = req.body;
    
    // Validate required fields
    if (!formData.email || !formData.firstname) {
      console.error('Missing required fields:', formData);
      return res.status(400).json({ 
        error: 'Missing required fields: email and firstname are required' 
      });
    }

    // Determine board ID (use integrated board if available, otherwise default)
    const targetBoardId = formData.boardId || 'default-board';
    
    // Create card title using participant name (consistent for both Google Forms and DadaBhagwan)
    const cardTitle = `${formData.firstname} ${formData.lastname || ''}`.trim();

    // Create card data structure
    const cardData = {
      id: `form_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: cardTitle,
      content: formatCardContent(formData),
      column: 'online_submitted',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      creatorUid: 'form-system',
      assigneeUid: null,
      boardId: targetBoardId,
      metadata: {
        source: 'formflow_app',
        formData: formData,
        submissionTimestamp: new Date().toISOString(),
        formId: formData.formId || null,
        submissionId: formData.submissionId || null,
        priority: formData.status || 'Medium',
        topic: formData.status || 'General',
        participantName: cardTitle,
        participantEmail: formData.email || '',
        participantCity: formData.city || '',
        participantPhone: formData.telephone || '',
      }
    };

    console.log('Creating card:', JSON.stringify(cardData, null, 2));

    // Add card to Firestore
    await db.collection('cards').doc(cardData.id).set(cardData);

    console.log('Card created successfully:', cardData.id);

    // Log audit entry
    await db.collection('audit_logs').add({
      action: 'card_created',
      cardId: cardData.id,
      userId: 'form-system',
      timestamp: new Date().toISOString(),
      details: {
        source: 'formflow-app-submission',
        email: formData.email,
        name: `${formData.firstname} ${formData.lastname || ''}`.trim(),
        formId: formData.formId,
        submissionId: formData.submissionId,
        boardId: targetBoardId
      }
    });

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Form submission processed successfully',
      cardId: cardData.id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error processing form submission:', error);
    
    // Log error to Firestore for monitoring
    try {
      await db.collection('error_logs').add({
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        source: 'formflow-cloud-function',
        requestBody: req.body,
        formId: req.body?.formId,
        boardId: req.body?.boardId
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to process form submission'
    });
  }
});

/**
 * Format form data into readable card content
 */
function formatCardContent(formData) {
  const sections = [];

  // Personal Information
  if (formData.email || formData.telephone) {
    sections.push('📧 **Contact Information**');
    if (formData.email) sections.push(`Email: ${formData.email}`);
    if (formData.telephone) sections.push(`Phone: ${formData.telephone}`);
    sections.push('');
  }

  // Demographics
  const demographics = [];
  if (formData.age) demographics.push(`Age: ${formData.age}`);
  if (formData.gender) demographics.push(`Gender: ${formData.gender}`);
  if (formData.city) demographics.push(`City: ${formData.city}`);
  
  if (demographics.length > 0) {
    sections.push('👤 **Personal Details**');
    sections.push(demographics.join(' • '));
    sections.push('');
  }

  // Spiritual Information
  if (formData.status || formData['gnan_vidhi_year']) {
    sections.push('🙏 **Spiritual Information**');
    if (formData.status) sections.push(`Status: ${formData.status}`);
    if (formData['gnan_vidhi_year']) sections.push(`Gnan Vidhi Year: ${formData['gnan_vidhi_year']}`);
    sections.push('');
  }

  // Question
  if (formData['english_question']) {
    sections.push('❓ **Question**');
    sections.push(formData['english_question']);
    sections.push('');
  }

  // Additional Notes
  if (formData.remarks) {
    sections.push('📝 **Additional Notes**');
    sections.push(formData.remarks);
  }

  return sections.join('\n');
}

/**
 * Health check endpoint
 */
functions.http('healthCheck', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'google-forms-processor'
  });
}); 