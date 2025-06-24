'use client';

import { useAuth } from '@/hooks/use-auth';
import { Header } from '@/components/header';
import { KanbanBoard } from '@/components/kanban/board';
import { Button } from '@/components/ui/button';
import { BookOpenCheck, AlertTriangle, Settings } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Home() {
  const { user, login, loading, firebaseConfigured } = useAuth();

  if (loading) {
    return (
       <div className="flex items-center justify-center min-h-screen bg-background">
        <BookOpenCheck className="h-12 w-12 animate-pulse text-primary" />
       </div>
    )
  }

//   if (!firebaseConfigured) {
//     return (
//       <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
//         <div className="flex items-center gap-4 mb-6">
//           <AlertTriangle className="h-12 w-12 text-destructive" />
//           <h1 className="text-5xl font-headline font-bold text-primary-foreground bg-primary px-4 py-2 rounded-lg">
//             FormFlow Kanban
//           </h1>
//         </div>
//         <Alert className="max-w-md mb-8">
//           <Settings className="h-4 w-4" />
//           <AlertDescription>
//             Firebase is not properly configured. Please check your <code className="bg-muted px-1 rounded">.env.local</code> file 
//             and ensure all Firebase configuration values are set correctly.
//           </AlertDescription>
//         </Alert>
//         <div className="text-sm text-muted-foreground max-w-md">
//           <p className="mb-4">
//             You need to set up Firebase configuration in your <code className="bg-muted px-1 rounded">.env.local</code> file:
//           </p>
//           <pre className="bg-muted p-4 rounded text-left text-xs overflow-x-auto">
// {`NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
// NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
// NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
// NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
// NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
// NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id`}
//           </pre>
//         </div>
//       </div>
//     );
//   }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
        <div className="flex items-center gap-4 mb-6">
          <BookOpenCheck className="h-12 w-12 text-primary" />
          <h1 className="text-5xl font-headline font-bold text-primary-foreground bg-primary px-4 py-2 rounded-lg">
            FormFlow Kanban
          </h1>
        </div>
        <p className="text-muted-foreground mb-8 max-w-md">
          Streamline your workflow by visualizing Google Form submissions on a real-time Kanban board.
        </p>
        <Button onClick={login} size="lg" className="font-bold">
          Sign In with Google
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header />
      <main className="flex-1 overflow-x-auto overflow-y-hidden p-4 md:p-6">
        <KanbanBoard />
      </main>
    </div>
  );
}
