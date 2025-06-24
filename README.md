# FormFlow Kanban

A real-time Kanban board application that receives Google Forms submissions and displays them in a collaborative workflow with drag-and-drop functionality.

## Features

- **Real-time Google Forms Integration**: Automatically receives form submissions via webhooks
- **Interactive Kanban Board**: Drag-and-drop cards between workflow stages
- **Role-based Access Control**: Admin, Editor, and Viewer roles with different permissions
- **Real-time Collaboration**: All users see changes instantly via Firebase real-time listeners
- **Gujarati Translation Workflow**: Specialized workflow for translation and review processes
- **Audit Trail**: Complete history of all card movements and changes
- **Responsive Design**: Works on desktop and tablet devices

## Workflow Stages

1. **Online Submitted** - New form submissions arrive here
2. **Translate Gujarati** - Content being translated to Gujarati
3. **Checking Gujarati** - Translation review and verification
4. **Print** - Ready for printing
5. **Done** - Completed tasks

## Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **UI Components**: Radix UI, Tailwind CSS
- **Drag & Drop**: @dnd-kit
- **Backend**: Firebase (Authentication, Firestore)
- **Real-time**: Firebase Realtime Database
- **Deployment**: Vercel (recommended) or Firebase Hosting

## Prerequisites

- Node.js 18+ and npm
- Firebase project with Authentication and Firestore enabled
- Google Forms (for form submissions)

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd download
npm install
```

### 2. Firebase Setup

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication with Google Sign-In
3. Create a Firestore database in production mode
4. Get your Firebase configuration from Project Settings > General > Your apps

### 3. Environment Configuration

Create a `.env.local` file in the root directory:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Google Forms Webhook Secret (for verifying webhook authenticity)
GOOGLE_FORMS_WEBHOOK_SECRET=your_webhook_secret_here
```

### 4. Firestore Security Rules

Update your Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Cards: Read for all authenticated users, write based on roles
    match /cards/{cardId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null && (
        // Admins can update any card
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'Admin' ||
        // Editors can update cards assigned to them or unassigned cards
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'Editor' &&
         (resource.data.assigneeUid == request.auth.uid || !('assigneeUid' in resource.data)))
      );
      allow delete: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'Admin';
    }
    
    // Audit logs: Read for all authenticated users, write for all authenticated users
    match /audit_logs/{logId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 5. Google Forms Integration

1. Open your Google Form
2. Click the three dots menu → Script editor
3. Replace the default code with the content from `google-apps-script.js`
4. Update the `WEBHOOK_URL` and `WEBHOOK_SECRET` variables
5. Save and authorize the script
6. Run the `setupFormTrigger()` function to create the form submission trigger

### 6. Development

```bash
npm run dev
```

The application will be available at `http://localhost:9002`

### 7. Production Deployment

#### Option A: Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

#### Option B: Firebase Hosting

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize: `firebase init hosting`
4. Build: `npm run build`
5. Deploy: `firebase deploy`

## User Roles and Permissions

### Admin
- Can move any card between columns
- Can assign cards to users
- Can delete cards
- Can manage user roles
- Can view all audit logs

### Editor
- Can move cards assigned to them
- Can move unassigned cards
- Can update card content and translations
- Cannot delete cards
- Cannot manage users

### Viewer
- Can view all cards and their content
- Cannot move or modify cards
- Cannot access translation features

## API Endpoints

### Webhook Endpoint
- `POST /api/webhook/google-forms` - Receives Google Forms submissions
- `GET /api/webhook/google-forms` - Health check endpoint

## File Structure

```
src/
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   │   └── webhook/       # Webhook endpoints
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── kanban/           # Kanban board components
│   ├── ui/               # Reusable UI components
│   └── header.tsx        # Application header
├── hooks/                # Custom React hooks
├── lib/                  # Utility libraries
│   ├── firebase.ts       # Firebase configuration
│   ├── firestore.ts      # Firestore service functions
│   ├── types.ts          # TypeScript type definitions
│   └── utils.ts          # Utility functions
└── providers/            # React context providers
    └── auth-provider.tsx # Authentication provider
```

## Troubleshooting

### Firebase Configuration Issues
- Ensure all environment variables are set correctly
- Check that your Firebase project has Authentication and Firestore enabled
- Verify that your domain is authorized in Firebase Authentication settings

### Google Forms Webhook Issues
- Check that the Google Apps Script is properly configured
- Verify the webhook URL is accessible from Google's servers
- Ensure the webhook secret matches between the script and your environment

### Real-time Updates Not Working
- Check Firestore security rules
- Verify that users are properly authenticated
- Check browser console for any errors

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the GitHub repository.
