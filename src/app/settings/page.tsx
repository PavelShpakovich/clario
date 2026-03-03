import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { auth } from '@/auth';
import { fetchUserProfile } from '@/lib/data-fetchers';
import { SettingsClient } from '@/components/settings/settings-client';
import { SettingsSkeleton } from '@/components/skeletons';

export const metadata = {
  title: 'Settings | Microlearning',
  description: 'Manage your profile and account settings',
};

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const profile = await fetchUserProfile();

  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <SettingsClient
        userEmail={session.user.email || ''}
        initialProfile={profile}
        userName={session.user.name ?? null}
      />
    </Suspense>
  );
}
