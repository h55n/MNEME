// Shown inside the dashboard layout while a page loads, so the sidebar and banner stay put.
export default function DashboardLoading() {
  return (
    <div className="p-6 md:p-10 space-y-6" role="status" aria-label="Loading">
      <div className="h-8 w-56 rounded-md bg-[#1A1A1A] animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 rounded-xl border border-neutral-300 bg-[#141414] animate-pulse" />
        ))}
      </div>
      <div className="h-64 rounded-xl border border-neutral-300 bg-[#141414] animate-pulse" />
    </div>
  );
}
