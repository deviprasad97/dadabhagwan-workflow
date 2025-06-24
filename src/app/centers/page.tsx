'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Header } from '@/components/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { centersService } from '@/lib/firestore';
import type { SatsangCenter } from '@/lib/types';
import { 
  MapPin, 
  Search, 
  Phone, 
  Mail, 
  User, 
  Globe,
  Filter,
  Building
} from 'lucide-react';

export default function CentersPage() {
  const { user } = useAuth();
  const [centers, setCenters] = useState<SatsangCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [countryFilter, setCountryFilter] = useState<string>('All');

  useEffect(() => {
    const fetchCenters = async () => {
      try {
        const centersData = await centersService.getCenters();
        setCenters(centersData);
      } catch (error) {
        console.error('Error fetching centers:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load Satsang centers'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCenters();
  }, []);

  // Get unique countries for filter
  const countries = [...new Set(centers.map(center => center.country))].sort();

  // Filter centers based on search and country
  const filteredCenters = centers.filter(center => {
    const matchesSearch = searchTerm === '' || 
      center.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      center.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      center.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
      center.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
      center.contactPerson.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCountry = countryFilter === 'All' || center.country === countryFilter;
    
    return matchesSearch && matchesCountry;
  });

  // Group centers by country
  const centersByCountry = filteredCenters.reduce((acc, center) => {
    const country = center.country;
    if (!acc[country]) {
      acc[country] = [];
    }
    acc[country].push(center);
    return acc;
  }, {} as Record<string, SatsangCenter[]>);

  const handleContactClick = (type: 'phone' | 'email', value: string) => {
    if (type === 'phone') {
      window.open(`tel:${value}`, '_self');
    } else {
      window.open(`mailto:${value}`, '_self');
    }
  };

  if (!user) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-lg">Please sign in to view Satsang centers.</div>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-lg">Loading Satsang centers...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <MapPin className="h-8 w-8 text-green-600" />
              <h1 className="text-3xl font-bold">Satsang Centers Worldwide</h1>
            </div>
            <p className="text-gray-600">Find DadaBhagwan Satsang centers around the world</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Centers</p>
                    <p className="text-2xl font-bold">{centers.length}</p>
                  </div>
                  <Building className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Countries</p>
                    <p className="text-2xl font-bold">{countries.length}</p>
                  </div>
                  <Globe className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Showing Results</p>
                    <p className="text-2xl font-bold">{filteredCenters.length}</p>
                  </div>
                  <Filter className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filter */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor="search">Search Centers</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Search by name, city, state, country, or contact person..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="sm:w-48">
                  <Label htmlFor="country-filter">Filter by Country</Label>
                  <Select value={countryFilter} onValueChange={setCountryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Countries" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Countries</SelectItem>
                      {countries.map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Centers Display */}
          {filteredCenters.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <MapPin className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold mb-2">No centers found</h3>
                <p className="text-gray-600">
                  {searchTerm || countryFilter !== 'All' 
                    ? 'Try adjusting your search criteria.' 
                    : 'No Satsang centers have been added yet.'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {Object.entries(centersByCountry)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([country, countryCenters]) => (
                  <div key={country}>
                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                      <Globe className="h-6 w-6 text-green-600" />
                      {country}
                      <Badge variant="outline" className="ml-2">
                        {countryCenters.length} center{countryCenters.length !== 1 ? 's' : ''}
                      </Badge>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {countryCenters
                        .sort((a, b) => a.state.localeCompare(b.state) || a.city.localeCompare(b.city))
                        .map((center) => (
                          <Card key={center.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                              <CardTitle className="flex items-start gap-2">
                                <MapPin className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                                <div>
                                  <div className="text-lg">{center.name}</div>
                                  <div className="text-sm font-normal text-gray-600">
                                    {center.city}, {center.state}
                                  </div>
                                </div>
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {/* Contact Person */}
                              <div className="flex items-center gap-2 text-sm">
                                <User className="h-4 w-4 text-gray-500" />
                                <span className="font-medium">Contact:</span>
                                <span>{center.contactPerson}</span>
                              </div>

                              {/* Contact Information */}
                              <div className="space-y-2">
                                {center.contactInfo.mobile && (
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-gray-500" />
                                    <Button
                                      variant="link"
                                      size="sm"
                                      className="h-auto p-0 text-blue-600 hover:text-blue-800"
                                      onClick={() => handleContactClick('phone', center.contactInfo.mobile!)}
                                    >
                                      {center.contactInfo.mobile}
                                    </Button>
                                  </div>
                                )}
                                {center.contactInfo.email && (
                                  <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-gray-500" />
                                    <Button
                                      variant="link"
                                      size="sm"
                                      className="h-auto p-0 text-blue-600 hover:text-blue-800"
                                      onClick={() => handleContactClick('email', center.contactInfo.email!)}
                                    >
                                      {center.contactInfo.email}
                                    </Button>
                                  </div>
                                )}
                              </div>

                              {/* Footer */}
                              <div className="flex items-center justify-between pt-2 border-t">
                                <Badge variant="outline" className="text-xs">
                                  {center.status}
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  Added {new Date(center.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
} 