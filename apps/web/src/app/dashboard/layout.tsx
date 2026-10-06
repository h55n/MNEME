import { Sidebar } from '@/components/shared/sidebar';
import { AuthGuard } from '@/components/shared/AuthGuard';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex flex-col md:flex-row min-h-screen bg-surface">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-auto">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
