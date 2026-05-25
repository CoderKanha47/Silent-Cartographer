'use server';

// 1. Import the exact name your utility file uses
import { createServerSideClient } from '@/utils/supabase/server'; 
import { revalidatePath } from 'next/cache';

export async function createShipmentBatch(formData: FormData) {
  // 2. Call the correct initializer function
  const supabase = await createServerSideClient();

  const receiver_name = formData.get('receiverName') as string;
  const origin = formData.get('origin') as string;
  const destination = formData.get('destination') as string;

  if (!receiver_name || !origin || !destination) {
    return { error: 'All fields are required.' };
  }

  const { data, error } = await supabase
    .from('shipment_batches')
    .insert([{ receiver_name, origin, destination }])
    .select()
    .single();

  if (error) {
    console.error('Database Error:', error);
    return { error: 'Failed to create batch folder.' };
  }

  revalidatePath('/dashboard');
  return { success: true, batch: data };
}