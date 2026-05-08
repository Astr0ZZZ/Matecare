import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

export const uploadMissionPhoto = async (userId: string, missionId: string, localUri: string) => {
  try {
    const fileName = `${userId}/${missionId}_${Date.now()}.jpg`;
    const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
    
    const { data, error } = await supabase.storage
      .from('mission-evidences')
      .upload(fileName, decode(base64), {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('mission-evidences')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading to Supabase Storage:', error);
    throw error;
  }
};
