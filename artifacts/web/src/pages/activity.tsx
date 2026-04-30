import { Layout } from "@/components/layout";
import { ActivityFeed } from "@/components/activity-feed";

export function ActivityPage() {
  return (
    <Layout>
      <div className="mx-auto w-full max-w-4xl px-4 py-6 md:py-10">
        <ActivityFeed />
      </div>
    </Layout>
  );
}
