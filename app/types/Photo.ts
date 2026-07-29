export interface Photo {
  id: string;
  location: string;
  country: string;
  url: string;
  source: 'file_upload' | 'google_photos' | 'external_url';
  caption?: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface PhotoFilterOptions {
  location?: string;
  country?: string;
  search?: string;
}
