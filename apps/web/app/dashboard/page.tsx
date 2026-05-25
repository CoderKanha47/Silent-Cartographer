import SupplyChainDashboard from '../../components/SupplyChainDashboard';
import { createServerSideClient } from '@/utils/supabase/server';

export default async function DashboardPage() {
  const supabase = await createServerSideClient();
  
  // Fetch real-time shipping folder cards sorted newest first
  const { data: batches } = await supabase
    .from('shipment_batches')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <SupplyChainDashboard initialBatches={batches || []} />
  );
}