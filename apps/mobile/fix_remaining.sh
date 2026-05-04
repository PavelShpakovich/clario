#!/bin/bash

# Remove unused imports and fix parameters
# compatibility/new.tsx - remove toast
sed -i '' "8s/import { toast } from '@\/lib\/toast';//" src/app/\(tabs\)/compatibility/new.tsx

# (tabs)/index.tsx - remove router and openChartDetail
sed -i '' "3s/import { router } from 'expo-router';//" src/app/\(tabs\)/index.tsx
sed -i '' "7s/import { openChartDetail, /import { /" src/app/\(tabs\)/index.tsx

# (tabs)/index.tsx - remove tNav assignment
sed -i '' "200s/const tNav = useTranslations('navigation');//" src/app/\(tabs\)/index.tsx

# readings/[readingId].tsx - remove router and goBackTo
sed -i '' "11s/import { router } from 'expo-router';//" src/app/\(tabs\)/readings/\[readingId\].tsx
sed -i '' "13s/import { goBackTo, /import { /" src/app/\(tabs\)/readings/\[readingId\].tsx

# readings/[readingId].tsx - remove tNav
sed -i '' "134s/const tNav = useTranslations('navigation');//" src/app/\(tabs\)/readings/\[readingId\].tsx

# chat/[readingId].tsx - fix err to _err
sed -i '' "164s/} catch (err: unknown) {/} catch (_err: unknown) {/" src/app/\(tabs\)/readings/chat/\[readingId\].tsx

# readings/index.tsx - remove router
sed -i '' "11s/import { router } from 'expo-router';//" src/app/\(tabs\)/readings/index.tsx

# settings.tsx - remove withReturnTo
sed -i '' "14s/import { withReturnTo } from '@\/lib\/navigation';//" src/app/\(tabs\)/settings.tsx

# _layout.tsx - remove styles assignment
sed -i '' "103s/const styles = useMemo(() => createStyles(colors), \[colors\]);//" src/app/_layout.tsx

# admin.tsx - remove router and toast
sed -i '' "13s/import { router } from 'expo-router';//" src/app/admin.tsx
sed -i '' "25s/import { toast } from '@\/lib\/toast';//" src/app/admin.tsx

# charts/[chartId].tsx - remove router and goBackTo
sed -i '' "12s/import { router } from 'expo-router';//" src/app/charts/\[chartId\].tsx
sed -i '' "14s/import { goBackTo, /import { /" src/app/charts/\[chartId\].tsx

# charts/[chartId].tsx - remove tWorkspace assignment
sed -i '' "330s/const tWorkspace = useTranslations('workspace');//" src/app/charts/\[chartId\].tsx

# horoscope.tsx - remove router
sed -i '' "12s/import { router } from 'expo-router';//" src/app/horoscope.tsx

# store.tsx - remove tErrors assignment
sed -i '' "141s/const tErrors = useTranslations('errors');//" src/app/store.tsx

# FeedbackModal.tsx - remove tCommon assignment
sed -i '' "31s/const tCommon = useTranslations('common');//" src/app/components/FeedbackModal.tsx

# TimezonePickerModal.tsx - change placeholder to _placeholder
sed -i '' "98s/placeholder: string,/_placeholder: string,/" src/app/components/TimezonePickerModal.tsx

echo "Fixed all remaining linting issues"
