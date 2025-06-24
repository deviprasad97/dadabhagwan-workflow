'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { Header } from '@/components/header';
import { 
  Shield, 
  Users, 
  UserCheck, 
  UserX, 
  Edit3, 
  Save, 
  X,
  Search,
  Filter,
  Crown,
  Eye,
  Settings,
  MapPin,
  Plus
} from 'lucide-react';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { centersService } from '@/lib/firestore';
import { locationService, type Country, type State } from '@/lib/location-service';
import type { User, SatsangCenter } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

type UserRole = 'Admin' | 'Editor' | 'Viewer';

export default function AdminPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [centers, setCenters] = useState<SatsangCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'All'>('All');
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<UserRole>('Viewer');
  
  // Center creation state
  const [showCreateCenter, setShowCreateCenter] = useState(false);
  const [creatingCenter, setCreatingCenter] = useState(false);
  const [newCenter, setNewCenter] = useState({
    name: '',
    city: '',
    state: '',
    country: '',
    countryCode: '',
    contactPerson: '',
    mobile: '',
    email: ''
  });
  
  // Location data
  const [countries, setCountries] = useState<Country[]>([]);
  const [availableStates, setAvailableStates] = useState<State[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);

  // Check if current user is admin
  const isAdmin = currentUser?.role === 'Admin';

  useEffect(() => {
    if (!isAdmin) return;
    
    const fetchData = async () => {
      try {
        // Fetch users
        const usersQuery = query(collection(firestore, 'users'), orderBy('name'));
        const usersSnapshot = await getDocs(usersQuery);
        const usersData = usersSnapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        })) as User[];
        
        // Fetch centers
        const centersData = await centersService.getCenters();
        
        setUsers(usersData);
        setCenters(centersData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load data'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAdmin]);

  // Load countries when component mounts
  useEffect(() => {
    const loadCountries = async () => {
      setLoadingCountries(true);
      try {
        const countriesData = await locationService.getCountries();
        setCountries(countriesData);
      } catch (error) {
        console.error('Error loading countries:', error);
        // Use popular countries as fallback
        setCountries(locationService.getPopularCountries());
      } finally {
        setLoadingCountries(false);
      }
    };

    loadCountries();
  }, []);

  // Update available states when country changes
  useEffect(() => {
    if (newCenter.countryCode) {
      const states = locationService.getStatesForCountry(newCenter.countryCode);
      setAvailableStates(states);
      
      // Clear state if it's not valid for the new country
      if (newCenter.state && !states.some(s => s.name === newCenter.state)) {
        setNewCenter(prev => ({ ...prev, state: '' }));
      }
    } else {
      setAvailableStates([]);
      setNewCenter(prev => ({ ...prev, state: '' }));
    }
  }, [newCenter.countryCode]);

  const handleRoleUpdate = async (userId: string, newRole: UserRole) => {
    try {
      await updateDoc(doc(firestore, 'users', userId), {
        role: newRole,
        updatedAt: new Date().toISOString()
      });

      // Update local state
      setUsers(prev => prev.map(user => 
        user.uid === userId ? { ...user, role: newRole } : user
      ));

      setEditingUser(null);
      
      toast({
        title: 'Success',
        description: `User role updated to ${newRole}`
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update user role'
      });
    }
  };

  const startEditing = (user: User) => {
    setEditingUser(user.uid);
    setEditingRole(user.role);
  };

  const cancelEditing = () => {
    setEditingUser(null);
    setEditingRole('Viewer');
  };

  // Center management functions
  const handleCreateCenter = async () => {
    if (!newCenter.name || !newCenter.city || !newCenter.state || !newCenter.country || !newCenter.contactPerson) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please fill in all required fields'
      });
      return;
    }

    if (!newCenter.mobile && !newCenter.email) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please provide either mobile number or email'
      });
      return;
    }

    setCreatingCenter(true);
    try {
      // Clean contact info - only include fields that have values
      const contactInfo: { mobile?: string; email?: string } = {};
      if (newCenter.mobile?.trim()) {
        contactInfo.mobile = newCenter.mobile.trim();
      }
      if (newCenter.email?.trim()) {
        contactInfo.email = newCenter.email.trim();
      }

      const centerData = {
        name: newCenter.name,
        city: newCenter.city,
        state: newCenter.state,
        country: newCenter.country,
        contactPerson: newCenter.contactPerson,
        contactInfo,
        status: 'active' as const,
        createdBy: currentUser!.uid,
      };

      const centerId = await centersService.createCenter(centerData);
      
      // Refresh centers list
      const updatedCenters = await centersService.getCenters();
      setCenters(updatedCenters);

      // Reset form
      setNewCenter({
        name: '',
        city: '',
        state: '',
        country: '',
        countryCode: '',
        contactPerson: '',
        mobile: '',
        email: ''
      });
      setShowCreateCenter(false);

      toast({
        title: 'Success',
        description: 'Satsang center created successfully'
      });
    } catch (error) {
      console.error('Error creating center:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create center'
      });
    } finally {
      setCreatingCenter(false);
    }
  };

  // Handle country selection
  const handleCountryChange = (countryCode: string) => {
    const selectedCountry = countries.find(c => c.code === countryCode);
    if (selectedCountry) {
      setNewCenter(prev => ({
        ...prev,
        country: selectedCountry.name,
        countryCode: selectedCountry.code,
        state: '' // Reset state when country changes
      }));
    }
  };

  // Handle state selection
  const handleStateChange = (stateName: string) => {
    setNewCenter(prev => ({ ...prev, state: stateName }));
  };

  // Filter users based on search and role filter
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'All' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'Admin': return <Crown className="h-4 w-4" />;
      case 'Editor': return <Edit3 className="h-4 w-4" />;
      case 'Viewer': return <Eye className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'Admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'Editor': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Viewer': return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('');
  };

  // Show loading state
  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-lg">Loading admin dashboard...</div>
        </div>
      </>
    );
  }

  // Show unauthorized message if not admin
  if (!isAdmin) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <Card className="w-96">
            <CardHeader className="text-center">
              <Shield className="h-12 w-12 mx-auto text-red-500 mb-4" />
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>
                You don't have permission to access the admin dashboard.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            </div>
            <p className="text-gray-600">Manage users and their permissions</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                    <p className="text-2xl font-bold">{users.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Admins</p>
                    <p className="text-2xl font-bold">{users.filter(u => u.role === 'Admin').length}</p>
                  </div>
                  <Crown className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Editors</p>
                    <p className="text-2xl font-bold">{users.filter(u => u.role === 'Editor').length}</p>
                  </div>
                  <Edit3 className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Viewers</p>
                    <p className="text-2xl font-bold">{users.filter(u => u.role === 'Viewer').length}</p>
                  </div>
                  <Eye className="h-8 w-8 text-gray-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Satsang Centers</p>
                    <p className="text-2xl font-bold">{centers.length}</p>
                  </div>
                  <MapPin className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor="search">Search Users</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Search by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="sm:w-48">
                  <Label htmlFor="role-filter">Filter by Role</Label>
                  <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as UserRole | 'All')}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Roles</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Editor">Editor</SelectItem>
                      <SelectItem value="Viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage user roles and permissions. Changes take effect immediately.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Current Role</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.uid}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatarUrl} alt={user.name} />
                            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            {user.uid === currentUser?.uid && (
                              <Badge variant="outline" className="text-xs">You</Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {editingUser === user.uid ? (
                          <Select value={editingRole} onValueChange={(value) => setEditingRole(value as UserRole)}>
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Admin">Admin</SelectItem>
                              <SelectItem value="Editor">Editor</SelectItem>
                              <SelectItem value="Viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge className={getRoleColor(user.role)}>
                            {getRoleIcon(user.role)}
                            <span className="ml-1">{user.role}</span>
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-500">
                          Recently active
                        </span>
                      </TableCell>
                      <TableCell>
                        {editingUser === user.uid ? (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleRoleUpdate(user.uid, editingRole)}
                              disabled={editingRole === user.role}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEditing}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEditing(user)}
                                disabled={user.uid === currentUser?.uid}
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Change User Role</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to change {user.name}'s role from {user.role} to {editingRole}?
                                  This will immediately update their permissions.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={cancelEditing}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRoleUpdate(user.uid, editingRole)}>
                                  Update Role
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {filteredUsers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No users found matching your criteria.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Satsang Centers Management */}
          <Card className="mt-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Satsang Centers Management
                  </CardTitle>
                  <CardDescription>
                    Create and manage Satsang center locations worldwide.
                  </CardDescription>
                </div>
                <Dialog open={showCreateCenter} onOpenChange={setShowCreateCenter}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Center
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Create New Satsang Center</DialogTitle>
                      <DialogDescription>
                        Add a new Satsang center location with contact information.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="center-name">Center Name *</Label>
                          <Input
                            id="center-name"
                            placeholder="e.g., DadaBhagwan Center Mumbai"
                            value={newCenter.name}
                            onChange={(e) => setNewCenter(prev => ({ ...prev, name: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contact-person">Contact Person *</Label>
                          <Input
                            id="contact-person"
                            placeholder="Full name"
                            value={newCenter.contactPerson}
                            onChange={(e) => setNewCenter(prev => ({ ...prev, contactPerson: e.target.value }))}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="country">Country *</Label>
                          <Select
                            value={newCenter.countryCode}
                            onValueChange={handleCountryChange}
                            disabled={loadingCountries}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={loadingCountries ? "Loading countries..." : "Select country"} />
                            </SelectTrigger>
                            <SelectContent>
                              {countries.map((country) => (
                                <SelectItem key={country.code} value={country.code}>
                                  <div className="flex items-center gap-2">
                                    {country.flag && <span>{country.flag}</span>}
                                    <span>{country.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state">State/Province *</Label>
                          {availableStates.length > 0 ? (
                            <Select
                              value={newCenter.state}
                              onValueChange={handleStateChange}
                              disabled={!newCenter.countryCode}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select state/province" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableStates.map((state) => (
                                  <SelectItem key={state.name} value={state.name}>
                                    {state.name} {state.code && `(${state.code})`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              id="state"
                              placeholder={newCenter.countryCode ? "Enter state/province" : "Select country first"}
                              value={newCenter.state}
                              onChange={(e) => setNewCenter(prev => ({ ...prev, state: e.target.value }))}
                              disabled={!newCenter.countryCode}
                            />
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="city">City *</Label>
                          <Input
                            id="city"
                            placeholder="City name"
                            value={newCenter.city}
                            onChange={(e) => setNewCenter(prev => ({ ...prev, city: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="mobile">Mobile Number</Label>
                          <Input
                            id="mobile"
                            placeholder="+1-234-567-8900"
                            value={newCenter.mobile}
                            onChange={(e) => setNewCenter(prev => ({ ...prev, mobile: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="center@dadabhagwan.org"
                            value={newCenter.email}
                            onChange={(e) => setNewCenter(prev => ({ ...prev, email: e.target.value }))}
                          />
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">
                        * Required fields. Please provide either mobile number or email (or both).
                      </p>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => {
                        setShowCreateCenter(false);
                        // Reset form when closing
                        setNewCenter({
                          name: '',
                          city: '',
                          state: '',
                          country: '',
                          countryCode: '',
                          contactPerson: '',
                          mobile: '',
                          email: ''
                        });
                        setAvailableStates([]);
                      }}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateCenter} disabled={creatingCenter}>
                        {creatingCenter ? 'Creating...' : 'Create Center'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {centers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No Satsang centers created yet.</p>
                  <p className="text-sm">Click "Add Center" to create the first one.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {centers.map((center) => (
                    <Card key={center.id} className="p-4">
                      <div className="space-y-2">
                        <h3 className="font-semibold">{center.name}</h3>
                        <p className="text-sm text-gray-600">
                          {center.city}, {center.state}, {center.country}
                        </p>
                        <div className="space-y-1">
                          <p className="text-sm">
                            <strong>Contact:</strong> {center.contactPerson}
                          </p>
                          {center.contactInfo.mobile && (
                            <p className="text-sm">
                              <strong>Mobile:</strong> {center.contactInfo.mobile}
                            </p>
                          )}
                          {center.contactInfo.email && (
                            <p className="text-sm">
                              <strong>Email:</strong> {center.contactInfo.email}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center justify-between pt-2">
                          <Badge variant="outline" className="text-xs">
                            {center.status}
                          </Badge>
                          <p className="text-xs text-gray-500">
                            Added {new Date(center.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
} 