'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { 
  ArrowLeft,
  Download,
  Filter,
  Search,
  MoreHorizontal,
  Eye,
  Trash2,
  Clock,
  CheckCircle,
  Archive,
  User,
  Calendar,
  Loader2
} from 'lucide-react';
import { formService } from '@/lib/firestore';
import type { Form, FormSubmission, FormField } from '@/lib/types';

export default function FormResponsesPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [form, setForm] = useState<Form | null>(null);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);

  const formId = params.formId as string;

  // Load form and submissions
  useEffect(() => {
    if (!user || !formId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const [formData, submissionsData] = await Promise.all([
          formService.getForm(formId),
          formService.getFormSubmissions(formId)
        ]);
        
        if (!formData) {
          toast({
            variant: 'destructive',
            title: 'Form Not Found',
            description: 'The requested form could not be found.'
          });
          router.push('/forms');
          return;
        }

        // Check if user has access
        const hasAccess = await formService.hasFormAccess(formId, user.uid, user.role);
        if (!hasAccess) {
          toast({
            variant: 'destructive',
            title: 'Access Denied',
            description: 'You do not have permission to view this form.'
          });
          router.push('/forms');
          return;
        }

        setForm(formData);
        setSubmissions(submissionsData);
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load form responses'
        });
        router.push('/forms');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, formId, router]);

  // Filter submissions
  useEffect(() => {
    let filtered = submissions;

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(submission => {
        const searchTerm = searchQuery.toLowerCase();
        
        // Search in responses
        const responseText = Object.values(submission.responses)
          .join(' ')
          .toLowerCase();
        
        // Search in submitter info
        const submitterText = [
          submission.submitterInfo?.name,
          submission.submitterInfo?.email
        ].filter(Boolean).join(' ').toLowerCase();
        
        return responseText.includes(searchTerm) || submitterText.includes(searchTerm);
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(submission => submission.status === statusFilter);
    }

    setFilteredSubmissions(filtered);
  }, [submissions, searchQuery, statusFilter]);

  const handleDeleteSubmission = async (submissionId: string) => {
    try {
      await formService.deleteSubmission(submissionId);
      setSubmissions(prev => prev.filter(s => s.id !== submissionId));
      
      toast({
        title: 'Submission Deleted',
        description: 'The submission has been deleted successfully.'
      });
    } catch (error) {
      console.error('Error deleting submission:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete submission'
      });
    }
  };

  const handleUpdateSubmissionStatus = async (submissionId: string, status: FormSubmission['status']) => {
    try {
      await formService.updateSubmission(submissionId, { status });
      setSubmissions(prev => 
        prev.map(s => s.id === submissionId ? { ...s, status } : s)
      );
      
      toast({
        title: 'Status Updated',
        description: `Submission marked as ${status}.`
      });
    } catch (error) {
      console.error('Error updating submission:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update submission status'
      });
    }
  };

  const getFieldLabel = (fieldId: string): string => {
    if (!form) return fieldId;
    const field = form.fields.find(f => f.id === fieldId);
    return field?.label || fieldId;
  };

  const formatFieldValue = (field: FormField | undefined, value: any): string => {
    if (value === null || value === undefined || value === '') return '—';
    
    if (!field) return String(value);

    switch (field.type) {
      case 'checkbox':
        return Array.isArray(value) ? value.join(', ') : String(value);
      case 'select':
      case 'radio':
        const option = field.options?.find(opt => opt.value === value);
        return option?.label || String(value);
      case 'rating':
        return `${value}/${field.settings?.scale?.max || 5}`;
      case 'date':
        try {
          return new Date(value).toLocaleDateString();
        } catch {
          return String(value);
        }
      case 'time':
        return String(value);
      default:
        return String(value);
    }
  };

  const getStatusColor = (status: FormSubmission['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processed': return 'bg-green-100 text-green-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusIcon = (status: FormSubmission['status']) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'processed': return <CheckCircle className="h-4 w-4" />;
      case 'archived': return <Archive className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const exportToCSV = () => {
    if (!form || filteredSubmissions.length === 0) return;

    // Create CSV headers
    const headers = ['Submission ID', 'Date', 'Status'];
    form.fields.forEach(field => {
      if (field.type !== 'section_header') {
        headers.push(field.label);
      }
    });
    headers.push('Submitter Email', 'Submitter Name');

    // Create CSV rows
    const rows = filteredSubmissions.map(submission => {
      const row = [
        submission.id,
        new Date(submission.submittedAt).toLocaleString(),
        submission.status
      ];
      
      form.fields.forEach(field => {
        if (field.type !== 'section_header') {
          const value = submission.responses[field.id];
          row.push(formatFieldValue(field, value));
        }
      });
      
      row.push(
        submission.submitterInfo?.email || '',
        submission.submitterInfo?.name || ''
      );
      
      return row;
    });

    // Generate CSV content
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${form.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_responses.csv`;
    link.click();
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading responses...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p>Please sign in to access form responses.</p>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p>Form not found or access denied.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      
      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => router.push(`/forms/${formId}/build`)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Form Builder
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{form.title} - Responses</h1>
                <p className="text-muted-foreground">
                  {filteredSubmissions.length} of {submissions.length} responses
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={exportToCSV}
                disabled={filteredSubmissions.length === 0}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search responses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processed">Processed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{submissions.length}</div>
                <p className="text-xs text-muted-foreground">Total Responses</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">
                  {submissions.filter(s => s.status === 'pending').length}
                </div>
                <p className="text-xs text-muted-foreground">Pending</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">
                  {submissions.filter(s => s.status === 'processed').length}
                </div>
                <p className="text-xs text-muted-foreground">Processed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">
                  {submissions.filter(s => 
                    new Date(s.submittedAt) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                  ).length}
                </div>
                <p className="text-xs text-muted-foreground">This Week</p>
              </CardContent>
            </Card>
          </div>

          {/* Responses Table */}
          <Card>
            <CardHeader>
              <CardTitle>Form Responses</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredSubmissions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {submissions.length === 0 
                      ? 'No responses yet' 
                      : 'No responses match your filters'
                    }
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        {form.fields
                          .filter(field => field.type !== 'section_header')
                          .slice(0, 3)
                          .map(field => (
                            <TableHead key={field.id}>{field.label}</TableHead>
                          ))}
                        <TableHead>Submitter</TableHead>
                        <TableHead className="w-[70px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubmissions.map((submission) => (
                        <TableRow key={submission.id}>
                          <TableCell>
                            <div className="text-sm">
                              {new Date(submission.submittedAt).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(submission.submittedAt).toLocaleTimeString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-xs ${getStatusColor(submission.status)} flex items-center gap-1 w-fit`}>
                              {getStatusIcon(submission.status)}
                              {submission.status}
                            </Badge>
                          </TableCell>
                          {form.fields
                            .filter(field => field.type !== 'section_header')
                            .slice(0, 3)
                            .map(field => (
                              <TableCell key={field.id} className="max-w-[200px]">
                                <div className="truncate">
                                  {formatFieldValue(field, submission.responses[field.id])}
                                </div>
                              </TableCell>
                            ))}
                          <TableCell>
                            <div className="text-sm">
                              {submission.submitterInfo?.name && (
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {submission.submitterInfo.name}
                                </div>
                              )}
                              {submission.submitterInfo?.email && (
                                <div className="text-xs text-muted-foreground">
                                  {submission.submitterInfo.email}
                                </div>
                              )}
                              {!submission.submitterInfo?.name && !submission.submitterInfo?.email && (
                                <span className="text-muted-foreground">Anonymous</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => setSelectedSubmission(submission)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleUpdateSubmissionStatus(submission.id, 'processed')}
                                  disabled={submission.status === 'processed'}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Mark Processed
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleUpdateSubmissionStatus(submission.id, 'archived')}
                                  disabled={submission.status === 'archived'}
                                >
                                  <Archive className="h-4 w-4 mr-2" />
                                  Archive
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteSubmission(submission.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Response Detail Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Response Details</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedSubmission(null)}
                >
                  ✕
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">
                Submitted {new Date(selectedSubmission.submittedAt).toLocaleString()}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Submitter Info */}
              {(selectedSubmission.submitterInfo?.name || selectedSubmission.submitterInfo?.email) && (
                <div>
                  <h4 className="font-medium mb-2">Submitter Information</h4>
                  <div className="bg-muted p-3 rounded">
                    {selectedSubmission.submitterInfo.name && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{selectedSubmission.submitterInfo.name}</span>
                      </div>
                    )}
                    {selectedSubmission.submitterInfo.email && (
                      <div className="text-sm text-muted-foreground">
                        {selectedSubmission.submitterInfo.email}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Responses */}
              <div>
                <h4 className="font-medium mb-2">Responses</h4>
                <div className="space-y-4">
                  {form.fields
                    .filter(field => field.type !== 'section_header')
                    .map(field => (
                      <div key={field.id}>
                        <Label className="text-sm font-medium">{field.label}</Label>
                        <div className="mt-1 p-3 bg-muted rounded">
                          {formatFieldValue(field, selectedSubmission.responses[field.id])}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Status and Actions */}
              <div className="flex items-center justify-between pt-4 border-t">
                <Badge className={getStatusColor(selectedSubmission.status)}>
                  {selectedSubmission.status}
                </Badge>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpdateSubmissionStatus(selectedSubmission.id, 'processed')}
                    disabled={selectedSubmission.status === 'processed'}
                  >
                    Mark Processed
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpdateSubmissionStatus(selectedSubmission.id, 'archived')}
                    disabled={selectedSubmission.status === 'archived'}
                  >
                    Archive
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 