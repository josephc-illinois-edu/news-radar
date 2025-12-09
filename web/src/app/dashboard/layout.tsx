import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { MobileNav } from '@/components/navigation/mobile-nav';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileNav />

      {/* Main content area - adjusts for sidebar on desktop */}
      <div className="lg:pl-64">
        <Header />
        <main id="main-content" className="p-4 md:p-6 pb-24 lg:pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}
