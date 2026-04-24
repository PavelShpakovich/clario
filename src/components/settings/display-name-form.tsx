'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Check, X } from 'lucide-react';
import { revalidateProfileData } from '@/actions/profile';
import { broadcastDisplayName } from '@/hooks/use-display-name';
import { profileApi } from '@/services/profile-api';

interface DisplayNameFormProps {
  initialName: string;
}

export function DisplayNameForm({ initialName }: DisplayNameFormProps) {
  const t = useTranslations('settingsPage');
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialName);
  const [saved, setSaved] = useState(initialName);
  const [isPending, startTransition] = useTransition();

  const save = () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === saved) {
      setEditing(false);
      return;
    }

    startTransition(async () => {
      try {
        await profileApi.updateDisplayName(trimmed);
        setSaved(trimmed);
        setValue(trimmed);
        setEditing(false);
        broadcastDisplayName(trimmed);
        await revalidateProfileData();
        toast.success(t('nameSaved'));
      } catch {
        toast.error(t('nameError'));
        setValue(saved);
        setEditing(false);
      }
    });
  };

  const cancel = () => {
    setValue(saved);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          className="h-8 w-48 text-sm"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') cancel();
          }}
          autoFocus
          maxLength={100}
          disabled={isPending}
        />
        <Button size="icon" variant="ghost" className="size-7" onClick={save} disabled={isPending}>
          <Check className="text-green-500" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-7"
          onClick={cancel}
          disabled={isPending}
        >
          <X className="text-muted-foreground" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">{saved || '—'}</span>
      <Button size="icon" variant="ghost" className="size-6" onClick={() => setEditing(true)}>
        <Pencil className="text-muted-foreground" />
      </Button>
    </div>
  );
}
