import { supabase } from '../lib/supabaseClient';

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
