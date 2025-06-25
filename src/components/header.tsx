'use client';

import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpenCheck, 
  LogOut, 
  Shield, 
  SquareKanban,
  Home, 
  Grip,
  Grid3X3, 
  FileText, 
  MapPin,
  MoreHorizontal,
  Calendar,
  Users,
  Settings,
  BarChart3,
  Database
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

export function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (!user) {
    return null;
  }

  const isAdmin = user.role === 'Admin';

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('');
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'Editor': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Viewer': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // App menu items
  const appMenuItems = [
    {
      href: '/boards',
      icon: SquareKanban,
      label: 'All Boards',
      description: 'Manage your boards',
      color: 'text-blue-600'
    },
    {
      href: '/forms',
      icon: FileText,
      label: 'Forms',
      description: 'Form management',
      color: 'text-purple-600'
    },
    {
      href: '/centers',
      icon: MapPin,
      label: 'Centers',
      description: 'Satsang centers',
      color: 'text-orange-600'
    },
    ...(isAdmin ? [{
      href: '/admin',
      icon: Shield,
      label: 'Admin',
      description: 'System administration',
      color: 'text-red-600'
    }] : [])
  ];

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-6">
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="DadaBhagwan Logo" className="h-8 w-8" />
        <Link href="/boards" className="hover:opacity-80 transition-opacity">
          <h1 className="text-xl font-bold font-headline text-foreground">DadaBhagwan - Gujarati Question Workflow</h1>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        {/* Apps Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="flex items-center gap-2 px-3">
              <Grip className="h-5 w-5" />
              <span className="font-medium">All Apps</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-4">
            <DropdownMenuLabel className="text-center pb-3">
              <span className="text-lg font-semibold">DadaBhagwan Apps</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="mb-4" />
            
            {/* App Grid */}
            <div className="grid grid-cols-3 gap-3">
              {appMenuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex flex-col items-center p-3 rounded-lg hover:bg-muted transition-colors group"
                  >
                    <div className="mb-2 p-2 rounded-full bg-muted group-hover:bg-background transition-colors">
                      <Icon className={`h-6 w-6 ${item.color}`} />
                    </div>
                    <span className="text-sm font-medium text-center">{item.label}</span>
                    <span className="text-xs text-muted-foreground text-center mt-1">{item.description}</span>
                  </Link>
                );
              })}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="user avatar" />
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-2">
                <p className="text-sm font-medium leading-none">{user.name}</p>
                <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                <Badge className={getRoleColor(user.role)} variant="outline">
                  {user.role}
                </Badge>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {/* Admin Dashboard Link */}
            {isAdmin && (
              <>
                <DropdownMenuItem asChild>
                  <Link href="/admin" className="flex items-center">
                    <Shield className="mr-2 h-4 w-4" />
                    <span>Admin Dashboard</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            
            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
