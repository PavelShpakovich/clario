import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { BackLink } from '@/components/common/back-link';
import { BillingReturnBanner } from '@/components/common/billing-return-banner';
import { UsageCard } from '@/components/common/usage-card';
import { PlansCard } from '@/components/common/plans-card';
import { PlansComingSoonCard } from '@/components/common/plans-coming-soon-card';
import { areSubscriptionsEnabled, isPaidInformationVisible } from '@/lib/feature-flags';

export const metadata = {
  title: 'Usage & Plans',
  description: 'View your current usage and plan availability.',
};

export const dynamic = 'force-dynamic';

export default async function PlanPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const canShowBilling = areSubscriptionsEnabled() && isPaidInformationVisible();

  return (
    <main className="w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <BackLink />
      <BillingReturnBanner />
      <UsageCard />
      {canShowBilling ? <PlansCard /> : <PlansComingSoonCard />}
    </main>
  );
}
