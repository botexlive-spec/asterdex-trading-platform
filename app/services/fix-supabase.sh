#!/bin/bash
# Batch remove Supabase imports from admin services

for file in admin-package.service.ts admin-kyc.service.ts admin-commission.service.ts admin-rank.service.ts admin-binary.service.ts admin-reports.service.ts admin-support.service.ts admin-communications.service.ts admin-config.service.ts admin-audit.service.ts admin-impersonate.service.ts; do
    if [ -f "$file" ]; then
        echo "Processing $file..."
        # Backup
        cp "$file" "$file.supabase-backup"
        # Remove Supabase import line
        sed -i "/import.*supabase/d" "$file"
        echo "  ✓ Removed Supabase import"
    fi
done

echo "Done! All Supabase imports removed."
