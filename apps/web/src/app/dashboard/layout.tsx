import { Sidebar } from '@/components/shared/sidebar';
import { DemoBanner } from '@/components/shared/DemoBanner';
import { AuthGuard } from '@/components/shared/AuthGuard';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <DemoBanner />
      <div className="flex flex-col md:flex-row min-h-screen bg-surface">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-auto">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
