import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export const pharmacyStorage = {
  async uploadLicenseDocument(file: File, userId: string) {
    const filePath = `${userId}/${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage
      .from('pharmacy-documents')
      .upload(filePath, file);

    if (error) throw error;
    return data.path;
  },
  async getSignedDocumentUrl(path: string) {
    const { data, error } = await supabase.storage
      .from('pharmacy-documents')
      .createSignedUrl(path, 3600); // 1 hour

    if (error) throw error;
    return data.signedUrl;
  }
};
