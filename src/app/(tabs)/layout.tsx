import TabBar from '@/components/TabBar';

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="appBg">
      <div className="container">{children}</div>
      <TabBar />
    </div>
  );
}
