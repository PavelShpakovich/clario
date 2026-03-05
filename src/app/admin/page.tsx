'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';
import { adminApi, type AdminUser } from '@/services/admin-api';

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, string> = {
    free: 'bg-gray-100 text-gray-800',
    basic: 'bg-blue-100 text-blue-800',
    pro: 'bg-purple-100 text-purple-800',
    unlimited: 'bg-amber-100 text-amber-800',
  };
  return <Badge className={colors[plan] || colors.free}>{plan.toUpperCase()}</Badge>;
}

function UserRow({ user, onRefresh }: { user: AdminUser; onRefresh: () => void }) {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(user.plan);
  const [isAdminState, setIsAdminState] = useState(user.isAdmin);
  const [showToggleAdmin, setShowToggleAdmin] = useState(false);

  const handlePlanChange = async (newPlan: string) => {
    setLoading(true);
    try {
      await adminApi.changePlan(user.id, newPlan as 'free' | 'basic' | 'pro' | 'unlimited');
      setSelectedPlan(newPlan);
      onRefresh();
    } catch (error) {
      logger.error({ error }, 'Failed to change user plan');
      alert('Failed to change plan');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdmin = async () => {
    if (!confirm(`Are you sure you want to ${isAdminState ? 'demote' : 'promote'} this user?`)) {
      return;
    }

    setLoading(true);
    try {
      await adminApi.toggleAdmin(user.id, !isAdminState);
      setIsAdminState(!isAdminState);
      onRefresh();
    } catch (error) {
      logger.error({ error }, 'Failed to toggle admin status');
      alert('Failed to toggle admin status');
    } finally {
      setLoading(false);
      setShowToggleAdmin(false);
    }
  };

  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="px-4 py-3 text-sm">{user.email}</td>
      <td className="px-4 py-3 text-sm">{user.displayName}</td>
      <td className="px-4 py-3">
        <PlanBadge plan={selectedPlan} />
      </td>
      <td className="px-4 py-3 text-sm text-center">
        {user.cardsUsed}/{user.cardsPerMonth}
      </td>
      <td className="px-4 py-3">
        <Select value={selectedPlan} onValueChange={handlePlanChange} disabled={loading}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="basic">Basic</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="unlimited">Unlimited</SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2">
          {showToggleAdmin ? (
            <>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleToggleAdmin}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowToggleAdmin(false)}
                disabled={loading}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant={isAdminState ? 'destructive' : 'outline'}
              onClick={() => setShowToggleAdmin(true)}
            >
              {isAdminState ? 'Demote' : 'Promote'}
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

function AdminTableContent() {
  const searchParams = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const perPage = 20;

  const [data, setData] = useState<{ users: AdminUser[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await adminApi.listUsers(page, perPage);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, perPage]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-8 text-red-600">{error}</div>;
  }

  if (!data?.users?.length) {
    return <div className="text-center py-8 text-gray-500">No users found</div>;
  }

  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set('page', String(page + 1));

  const prevUrl = new URL(window.location.href);
  prevUrl.searchParams.set('page', String(page - 1));

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-3 text-left font-semibold">Email</th>
              <th className="px-4 py-3 text-left font-semibold">Display Name</th>
              <th className="px-4 py-3 text-left font-semibold">Plan</th>
              <th className="px-4 py-3 text-left font-semibold">Cards Used</th>
              <th className="px-4 py-3 text-left font-semibold">Change Plan</th>
              <th className="px-4 py-3 text-left font-semibold">Admin</th>
            </tr>
          </thead>
          <tbody>
            {data.users.map((user) => (
              <UserRow key={user.id} user={user} onRefresh={loadUsers} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <Link href={prevUrl.toString()}>
          <Button variant="outline" size="sm" disabled={page === 1} className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
        </Link>
        <span className="text-sm text-gray-600">Page {page}</span>
        <Link href={nextUrl.toString()}>
          <Button
            variant="outline"
            size="sm"
            disabled={data.users.length < perPage}
            className="gap-2"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-gray-600 mt-2">Manage users, subscriptions, and permissions</p>
        </div>

        <Card className="p-6">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            }
          >
            <AdminTableContent />
          </Suspense>
        </Card>
      </div>
    </div>
  );
}
