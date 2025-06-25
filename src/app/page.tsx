'use client';

import { useAuth } from '@/hooks/use-auth';
import { Header } from '@/components/header';
import { KanbanBoard } from '@/components/kanban/board';
import { Button } from '@/components/ui/button';
import { BookOpenCheck, AlertTriangle, Settings } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect } from 'react';

// Separate component for the board selection logic
function BoardSelector() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const selectedBoardId = searchParams.get('board');
  
  // Redirect to boards page if no board is selected and user is authenticated
  useEffect(() => {
    if (!loading && user && !selectedBoardId) {
      console.log('No board selected, redirecting to boards page');
      router.push('/boards');
    }
  }, [user, loading, selectedBoardId, router]);
  
  // Don't render the board if we're redirecting
  if (!loading && user && !selectedBoardId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <BookOpenCheck className="h-8 w-8 animate-pulse text-primary mx-auto mb-2" />
          <p className="text-muted-foreground">Redirecting to boards...</p>
        </div>
      </div>
    );
  }
  
  return <KanbanBoard selectedBoardId={selectedBoardId} />;
}

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
//             DadaBhagwan Kanban
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
          <img src="/logo.png" alt="DadaBhagwan Logo" className="h-8 w-8" />
          <h1 className="text-5xl font-headline font-bold text-primary-foreground bg-primary px-4 py-2 rounded-lg">
            DadaBhagwan - Gujarati Question Bank
          </h1>
        </div>
        <p className="text-muted-foreground mb-8 max-w-md">
          Streamline your Question translation workflow by visualizing Form submissions on a real-time Kanban board.
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
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <BookOpenCheck className="h-8 w-8 animate-pulse text-primary" />
          </div>
        }>
          <BoardSelector />
        </Suspense>
      </main>
    </div>
  );
}
