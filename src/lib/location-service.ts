// Location service for countries and states/provinces data

export interface Country {
  name: string;
  code: string; // ISO 2-letter code
  flag?: string;
}

export interface State {
  name: string;
  code?: string;
  country: string; // Country code
}

// Comprehensive states/provinces data for major countries
const STATES_DATA: Record<string, State[]> = {
  'US': [
    { name: 'Alabama', code: 'AL', country: 'US' },
    { name: 'Alaska', code: 'AK', country: 'US' },
    { name: 'Arizona', code: 'AZ', country: 'US' },
    { name: 'Arkansas', code: 'AR', country: 'US' },
    { name: 'California', code: 'CA', country: 'US' },
    { name: 'Colorado', code: 'CO', country: 'US' },
    { name: 'Connecticut', code: 'CT', country: 'US' },
    { name: 'Delaware', code: 'DE', country: 'US' },
    { name: 'Florida', code: 'FL', country: 'US' },
    { name: 'Georgia', code: 'GA', country: 'US' },
    { name: 'Hawaii', code: 'HI', country: 'US' },
    { name: 'Idaho', code: 'ID', country: 'US' },
    { name: 'Illinois', code: 'IL', country: 'US' },
    { name: 'Indiana', code: 'IN', country: 'US' },
    { name: 'Iowa', code: 'IA', country: 'US' },
    { name: 'Kansas', code: 'KS', country: 'US' },
    { name: 'Kentucky', code: 'KY', country: 'US' },
    { name: 'Louisiana', code: 'LA', country: 'US' },
    { name: 'Maine', code: 'ME', country: 'US' },
    { name: 'Maryland', code: 'MD', country: 'US' },
    { name: 'Massachusetts', code: 'MA', country: 'US' },
    { name: 'Michigan', code: 'MI', country: 'US' },
    { name: 'Minnesota', code: 'MN', country: 'US' },
    { name: 'Mississippi', code: 'MS', country: 'US' },
    { name: 'Missouri', code: 'MO', country: 'US' },
    { name: 'Montana', code: 'MT', country: 'US' },
    { name: 'Nebraska', code: 'NE', country: 'US' },
    { name: 'Nevada', code: 'NV', country: 'US' },
    { name: 'New Hampshire', code: 'NH', country: 'US' },
    { name: 'New Jersey', code: 'NJ', country: 'US' },
    { name: 'New Mexico', code: 'NM', country: 'US' },
    { name: 'New York', code: 'NY', country: 'US' },
    { name: 'North Carolina', code: 'NC', country: 'US' },
    { name: 'North Dakota', code: 'ND', country: 'US' },
    { name: 'Ohio', code: 'OH', country: 'US' },
    { name: 'Oklahoma', code: 'OK', country: 'US' },
    { name: 'Oregon', code: 'OR', country: 'US' },
    { name: 'Pennsylvania', code: 'PA', country: 'US' },
    { name: 'Rhode Island', code: 'RI', country: 'US' },
    { name: 'South Carolina', code: 'SC', country: 'US' },
    { name: 'South Dakota', code: 'SD', country: 'US' },
    { name: 'Tennessee', code: 'TN', country: 'US' },
    { name: 'Texas', code: 'TX', country: 'US' },
    { name: 'Utah', code: 'UT', country: 'US' },
    { name: 'Vermont', code: 'VT', country: 'US' },
    { name: 'Virginia', code: 'VA', country: 'US' },
    { name: 'Washington', code: 'WA', country: 'US' },
    { name: 'West Virginia', code: 'WV', country: 'US' },
    { name: 'Wisconsin', code: 'WI', country: 'US' },
    { name: 'Wyoming', code: 'WY', country: 'US' }
  ],
  'CA': [
    { name: 'Alberta', code: 'AB', country: 'CA' },
    { name: 'British Columbia', code: 'BC', country: 'CA' },
    { name: 'Manitoba', code: 'MB', country: 'CA' },
    { name: 'New Brunswick', code: 'NB', country: 'CA' },
    { name: 'Newfoundland and Labrador', code: 'NL', country: 'CA' },
    { name: 'Northwest Territories', code: 'NT', country: 'CA' },
    { name: 'Nova Scotia', code: 'NS', country: 'CA' },
    { name: 'Nunavut', code: 'NU', country: 'CA' },
    { name: 'Ontario', code: 'ON', country: 'CA' },
    { name: 'Prince Edward Island', code: 'PE', country: 'CA' },
    { name: 'Quebec', code: 'QC', country: 'CA' },
    { name: 'Saskatchewan', code: 'SK', country: 'CA' },
    { name: 'Yukon', code: 'YT', country: 'CA' }
  ],
  'IN': [
    { name: 'Andhra Pradesh', country: 'IN' },
    { name: 'Arunachal Pradesh', country: 'IN' },
    { name: 'Assam', country: 'IN' },
    { name: 'Bihar', country: 'IN' },
    { name: 'Chhattisgarh', country: 'IN' },
    { name: 'Goa', country: 'IN' },
    { name: 'Gujarat', country: 'IN' },
    { name: 'Haryana', country: 'IN' },
    { name: 'Himachal Pradesh', country: 'IN' },
    { name: 'Jharkhand', country: 'IN' },
    { name: 'Karnataka', country: 'IN' },
    { name: 'Kerala', country: 'IN' },
    { name: 'Madhya Pradesh', country: 'IN' },
    { name: 'Maharashtra', country: 'IN' },
    { name: 'Manipur', country: 'IN' },
    { name: 'Meghalaya', country: 'IN' },
    { name: 'Mizoram', country: 'IN' },
    { name: 'Nagaland', country: 'IN' },
    { name: 'Odisha', country: 'IN' },
    { name: 'Punjab', country: 'IN' },
    { name: 'Rajasthan', country: 'IN' },
    { name: 'Sikkim', country: 'IN' },
    { name: 'Tamil Nadu', country: 'IN' },
    { name: 'Telangana', country: 'IN' },
    { name: 'Tripura', country: 'IN' },
    { name: 'Uttar Pradesh', country: 'IN' },
    { name: 'Uttarakhand', country: 'IN' },
    { name: 'West Bengal', country: 'IN' },
    // Union Territories
    { name: 'Andaman and Nicobar Islands', country: 'IN' },
    { name: 'Chandigarh', country: 'IN' },
    { name: 'Dadra and Nagar Haveli and Daman and Diu', country: 'IN' },
    { name: 'Delhi', country: 'IN' },
    { name: 'Jammu and Kashmir', country: 'IN' },
    { name: 'Ladakh', country: 'IN' },
    { name: 'Lakshadweep', country: 'IN' },
    { name: 'Puducherry', country: 'IN' }
  ],
  'GB': [
    { name: 'England', country: 'GB' },
    { name: 'Scotland', country: 'GB' },
    { name: 'Wales', country: 'GB' },
    { name: 'Northern Ireland', country: 'GB' }
  ],
  'AU': [
    { name: 'Australian Capital Territory', code: 'ACT', country: 'AU' },
    { name: 'New South Wales', code: 'NSW', country: 'AU' },
    { name: 'Northern Territory', code: 'NT', country: 'AU' },
    { name: 'Queensland', code: 'QLD', country: 'AU' },
    { name: 'South Australia', code: 'SA', country: 'AU' },
    { name: 'Tasmania', code: 'TAS', country: 'AU' },
    { name: 'Victoria', code: 'VIC', country: 'AU' },
    { name: 'Western Australia', code: 'WA', country: 'AU' }
  ],
  'DE': [
    { name: 'Baden-Württemberg', country: 'DE' },
    { name: 'Bavaria', country: 'DE' },
    { name: 'Berlin', country: 'DE' },
    { name: 'Brandenburg', country: 'DE' },
    { name: 'Bremen', country: 'DE' },
    { name: 'Hamburg', country: 'DE' },
    { name: 'Hesse', country: 'DE' },
    { name: 'Lower Saxony', country: 'DE' },
    { name: 'Mecklenburg-Vorpommern', country: 'DE' },
    { name: 'North Rhine-Westphalia', country: 'DE' },
    { name: 'Rhineland-Palatinate', country: 'DE' },
    { name: 'Saarland', country: 'DE' },
    { name: 'Saxony', country: 'DE' },
    { name: 'Saxony-Anhalt', country: 'DE' },
    { name: 'Schleswig-Holstein', country: 'DE' },
    { name: 'Thuringia', country: 'DE' }
  ],
  'BR': [
    { name: 'Acre', country: 'BR' },
    { name: 'Alagoas', country: 'BR' },
    { name: 'Amapá', country: 'BR' },
    { name: 'Amazonas', country: 'BR' },
    { name: 'Bahia', country: 'BR' },
    { name: 'Ceará', country: 'BR' },
    { name: 'Distrito Federal', country: 'BR' },
    { name: 'Espírito Santo', country: 'BR' },
    { name: 'Goiás', country: 'BR' },
    { name: 'Maranhão', country: 'BR' },
    { name: 'Mato Grosso', country: 'BR' },
    { name: 'Mato Grosso do Sul', country: 'BR' },
    { name: 'Minas Gerais', country: 'BR' },
    { name: 'Pará', country: 'BR' },
    { name: 'Paraíba', country: 'BR' },
    { name: 'Paraná', country: 'BR' },
    { name: 'Pernambuco', country: 'BR' },
    { name: 'Piauí', country: 'BR' },
    { name: 'Rio de Janeiro', country: 'BR' },
    { name: 'Rio Grande do Norte', country: 'BR' },
    { name: 'Rio Grande do Sul', country: 'BR' },
    { name: 'Rondônia', country: 'BR' },
    { name: 'Roraima', country: 'BR' },
    { name: 'Santa Catarina', country: 'BR' },
    { name: 'São Paulo', country: 'BR' },
    { name: 'Sergipe', country: 'BR' },
    { name: 'Tocantins', country: 'BR' }
  ]
};

// Cache for countries data
let countriesCache: Country[] | null = null;

export const locationService = {
  // Get all countries
  getCountries: async (): Promise<Country[]> => {
    if (countriesCache) {
      return countriesCache;
    }

    try {
      const response = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2,flag');
      const data = await response.json();
      
      countriesCache = data
        .map((country: any) => ({
          name: country.name.common,
          code: country.cca2,
          flag: country.flag
        }))
        .sort((a: Country, b: Country) => a.name.localeCompare(b.name));
      
      return countriesCache!;
    } catch (error) {
      console.error('Error fetching countries:', error);
      
      // Fallback to popular countries if API fails
             const fallback: Country[] = [
         { name: 'Australia', code: 'AU', flag: '🇦🇺' },
         { name: 'Brazil', code: 'BR', flag: '🇧🇷' },
         { name: 'Canada', code: 'CA', flag: '🇨🇦' },
         { name: 'Germany', code: 'DE', flag: '🇩🇪' },
         { name: 'India', code: 'IN', flag: '🇮🇳' },
         { name: 'United Kingdom', code: 'GB', flag: '🇬🇧' },
         { name: 'United States', code: 'US', flag: '🇺🇸' }
       ];
       countriesCache = fallback;
       return fallback;
    }
  },

  // Get states/provinces for a country
  getStatesForCountry: (countryCode: string): State[] => {
    return STATES_DATA[countryCode] || [];
  },

  // Search countries
  searchCountries: async (searchTerm: string): Promise<Country[]> => {
    const countries = await locationService.getCountries();
    if (!searchTerm.trim()) return countries;
    
    const search = searchTerm.toLowerCase();
    return countries.filter(country => 
      country.name.toLowerCase().includes(search) ||
      country.code.toLowerCase().includes(search)
    );
  },

  // Search states for a country
  searchStates: (countryCode: string, searchTerm: string): State[] => {
    const states = locationService.getStatesForCountry(countryCode);
    if (!searchTerm.trim()) return states;
    
    const search = searchTerm.toLowerCase();
    return states.filter(state => 
      state.name.toLowerCase().includes(search) ||
      (state.code && state.code.toLowerCase().includes(search))
    );
  },

  // Get popular countries (for faster loading)
  getPopularCountries: (): Country[] => {
    return [
      { name: 'India', code: 'IN', flag: '🇮🇳' },
      { name: 'United States', code: 'US', flag: '🇺🇸' },
      { name: 'United Kingdom', code: 'GB', flag: '🇬🇧' },
      { name: 'Canada', code: 'CA', flag: '🇨🇦' },
      { name: 'Australia', code: 'AU', flag: '🇦🇺' },
      { name: 'Germany', code: 'DE', flag: '🇩🇪' },
      { name: 'Brazil', code: 'BR', flag: '🇧🇷' },
      { name: 'Japan', code: 'JP', flag: '🇯🇵' },
      { name: 'France', code: 'FR', flag: '🇫🇷' },
      { name: 'Singapore', code: 'SG', flag: '����' }
    ];
  }
}; 