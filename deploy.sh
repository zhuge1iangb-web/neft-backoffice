#!/bin/bash
set -e

REPO="/Users/macintoshhd/Desktop/NEFT Backend System/neft-backoffice"
cd "$REPO"

echo "🔓 Removing git lock files..."
rm -f .git/index.lock .git/HEAD.lock .git/COMMIT_EDITMSG.lock 2>/dev/null || true

echo "📦 Staging changes..."
git add src/app/page.tsx
git add src/app/customer-portal/page.tsx
git add "src/app/(main)/service/page.tsx"
git add "src/app/(main)/users/page.tsx"
git add src/components/layout/Sidebar.tsx

echo "📝 Committing..."
git commit -m "feat: logo white-bg pill + customer portal security + resolve workflow

- Logo: white rounded pill on Sidebar/nav (no more brightness-invert)
- Login page header: white bg strip so logo shows naturally
- Customer Portal: remove credential hints from login page (security)
- Customer Portal: password show/hide, contact number for account request
- Service: status changes auto-create WorkLog audit trail
- Service: dedicated Resolve modal requiring Root Cause + Resolution
- Service: delete Case requires inline confirmation
- Users: Customer Portal account management tab"

echo "🚀 Pushing to GitHub..."
git push origin main

echo "✅ Done! Vercel will deploy automatically in ~1 min"
echo "🌐 https://neft-backofficev2.vercel.app"
