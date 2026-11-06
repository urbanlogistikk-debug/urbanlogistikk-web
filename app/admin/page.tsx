import type { Metadata } from 'next';
import { requireAdminPage } from '@/lib/server-auth';
import AdminDashboard from '@/components/AdminDashboard';
import './admin.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Tilbudsoversikt',
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  await requireAdminPage();
  return <AdminDashboard />;
}
