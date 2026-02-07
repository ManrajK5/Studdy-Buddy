import { GoogleCalendarCard } from "@/components/GoogleCalendarCard";
import { UpcomingTasks } from "@/components/UpcomingTasks";
import { SyllabusCta } from "@/components/SyllabusCta";
import { DashboardGreeting } from "@/components/DashboardGreeting";

export default function DashboardPage() {
  return (
    <div>
      <DashboardGreeting />

      {/* Hero: weekly calendar view */}
      <GoogleCalendarCard />

      {/* Bottom row: upcoming tasks + syllabus CTA */}
      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-12">
        <div className="md:col-span-8">
          <UpcomingTasks />
        </div>
        <div className="md:col-span-4">
          <SyllabusCta />
        </div>
      </div>
    </div>
  );
}
