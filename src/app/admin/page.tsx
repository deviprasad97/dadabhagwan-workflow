'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { userService } from '@/lib/firestore';
import type { User } from '@/lib/types';
import { Header } from '@/components/header';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Users, Loader2 } from 'lucide-react';

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Redirect if not admin
    if (user && user.role !== 'Admin') {
      router.push('/');
      return;
    }

    // Fetch users if admin
    if (user?.role === 'Admin') {
      const fetchUsers = async () => {
        try {
          const fetchedUsers = await userService.getAllUsers();
          setUsers(fetchedUsers);
        } catch (error) {
          console.error('Error fetching users:', error);
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to fetch users. Please try again.',
          });
        } finally {
          setLoading(false);
        }
      };

      fetchUsers();
    }
  }, [user, router, toast]);

  const handleRoleChange = async (userId: string, newRole: 'Admin' | 'Editor' | 'Viewer') => {
    try {
      const userToUpdate = users.find(u => u.uid === userId);
      if (!userToUpdate) return;

      // Don't allow changing your own role
      if (userId === user?.uid) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'You cannot change your own role.',
        });
        return;
      }

      const updatedUser: User = {
        ...userToUpdate,
        role: newRole
      };

      await userService.upsertUser(updatedUser);
      
      // Update local state
      setUsers(users.map(u => u.uid === userId ? updatedUser : u));

      toast({
        title: 'Role Updated',
        description: `${userToUpdate.name}'s role has been updated to ${newRole}.`,
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update user role. Please try again.',
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('');
  };

  if (!user) {
    router.push('/');
    return null;
  }

  if (user.role !== 'Admin') {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto py-6 px-4">
        <div className="flex items-center gap-3 mb-6">
          <Users className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold font-headline">User Management</h1>
        </div>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Current Role</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.uid}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={u.avatarUrl} alt={u.name} />
                        <AvatarFallback>{getInitials(u.name)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{u.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{u.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Select
                      defaultValue={u.role}
                      onValueChange={(value) => handleRoleChange(u.uid, value as User['role'])}
                      disabled={u.uid === user.uid} // Disable changing own role
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Editor">Editor</SelectItem>
                        <SelectItem value="Viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
} 