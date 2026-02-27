import TabBar from '@/components/layout/TabBar';

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="appBg">
      <div className="container">{children}</div>
      <TabBar />
    </div>
  );
}
