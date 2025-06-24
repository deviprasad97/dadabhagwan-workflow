import { NextRequest, NextResponse } from 'next/server';
import { cardService } from '@/lib/firestore';
import type { Card } from '@/lib/types';

// Verify webhook authenticity (you should implement proper verification)
function verifyWebhook(request: NextRequest): boolean {
  const secret = process.env.GOOGLE_FORMS_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('No webhook secret configured, skipping verification');
    return true;
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.substring(7);
  return token === secret;
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook authenticity
    if (!verifyWebhook(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Received Google Forms webhook:', body);
    
    // Extract form data from Google Forms webhook
    const {
      formId,
      responseId,
      respondentEmail,
      timestamp,
      formTitle,
      answers, // Array of {question, answer} objects
    } = body;

    // Parse the form answers into structured data
    const formData = parseFormAnswers(answers);
    
    // Create a descriptive title
    const cardTitle = `${formData.status} - ${formData.firstname} ${formData.lastname}`;
    
    // Create formatted content for the card
    const cardContent = formatFormSubmission(formData);

    // Create a card from the form submission
    const card: Omit<Card, 'id' | 'createdAt'> = {
      title: cardTitle,
      content: cardContent,
      creatorUid: 'google-forms', // System user for form submissions
      column: 'online_submitted', // All new submissions start here
    };

    // Save to Firestore
    const cardId = await cardService.addCard(card);

    // Log the webhook receipt
    console.log(`Google Forms submission processed: ${formId} -> ${cardId}`);
    console.log('Form data:', formData);

    return NextResponse.json({ 
      success: true, 
      cardId,
      message: 'Form submission processed successfully',
      participant: `${formData.firstname} ${formData.lastname}`,
      status: formData.status
    });

  } catch (error) {
    console.error('Error processing Google Forms webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// Parse form answers into structured data
function parseFormAnswers(answers: any[]): any {
  if (!Array.isArray(answers)) {
    return {};
  }

  const formData: any = {};
  
  answers.forEach(answer => {
    const question = (answer.question || '').toLowerCase();
    const response = answer.answer || '';
    
    // Map questions to fields
    if (question.includes('email')) {
      formData.email = response;
    } else if (question.includes('firstname') || question.includes('first name')) {
      formData.firstname = response;
    } else if (question.includes('lastname') || question.includes('last name')) {
      formData.lastname = response;
    } else if (question.includes('age')) {
      formData.age = response;
    } else if (question.includes('gender')) {
      formData.gender = response;
    } else if (question.includes('city')) {
      formData.city = response;
    } else if (question.includes('status')) {
      formData.status = response;
    } else if (question.includes('gnan vidhi') || question.includes('when did you receive')) {
      formData.gnanVidhiYear = response;
    } else if (question.includes('english') && question.includes('question')) {
      formData.englishQuestion = response;
    } else if (question.includes('telephone') || question.includes('phone')) {
      formData.telephone = response;
    } else if (question.includes('remarks')) {
      formData.remarks = response;
    }
  });
  
  return formData;
}

// Format the form submission into readable content
function formatFormSubmission(formData: any): string {
  const sections = [];
  
  // Personal Information
  sections.push('**Personal Information**');
  if (formData.firstname || formData.lastname) {
    sections.push(`Name: ${formData.firstname || ''} ${formData.lastname || ''}`.trim());
  }
  if (formData.email) sections.push(`Email: ${formData.email}`);
  if (formData.age) sections.push(`Age: ${formData.age}`);
  if (formData.gender) sections.push(`Gender: ${formData.gender}`);
  if (formData.city) sections.push(`City: ${formData.city}`);
  if (formData.telephone) sections.push(`Phone: ${formData.telephone}`);
  
  sections.push(''); // Empty line
  
  // Status Information
  sections.push('**Participation Status**');
  if (formData.status) sections.push(`Status: ${formData.status}`);
  if (formData.gnanVidhiYear) sections.push(`Gnan Vidhi Year: ${formData.gnanVidhiYear}`);
  
  sections.push(''); // Empty line
  
  // Question
  if (formData.englishQuestion) {
    sections.push('**Question for Gnani Pujyashree**');
    sections.push(formData.englishQuestion);
    sections.push(''); // Empty line
  }
  
  // Remarks
  if (formData.remarks) {
    sections.push('**Remarks**');
    sections.push(formData.remarks);
  }
  
  return sections.join('\n');
}

// GET endpoint for webhook verification (optional)
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Google Forms webhook endpoint is active',
    expectedFields: [
      'Email', 'Firstname', 'Lastname', 'Age', 'Gender', 
      'City', 'Status', 'Gnan Vidhi Year', 'English Question', 
      'Telephone', 'Remarks'
    ]
  });
} 