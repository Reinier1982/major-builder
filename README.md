This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Required environment variables:

```bash
DATABASE_URL="postgresql://..."
SUPABASE_SECRET_KEY="..."
# Legacy alternative:
# SUPABASE_SERVICE_ROLE_KEY="..."
# Optional. Inferred from DATABASE_URL for Supabase pooler URLs if omitted.
SUPABASE_URL="https://your-project-ref.supabase.co"
# Optional. Defaults to obstacle-images.
SUPABASE_STORAGE_BUCKET="obstacle-images"
```

Optional map defaults:

```bash
# Center the main map on your terrain by default.
NEXT_PUBLIC_MAP_CENTER_LAT=52.1326
NEXT_PUBLIC_MAP_CENTER_LNG=5.2913
NEXT_PUBLIC_MAP_OVERVIEW_ZOOM=18

# Edit dialogs use this zoom when placing a pin.
NEXT_PUBLIC_MAP_ZOOM=18

# Optional tile provider override. Defaults to OpenStreetMap.
NEXT_PUBLIC_MAP_TILE_URL="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
NEXT_PUBLIC_MAP_ATTRIBUTION="&copy; OpenStreetMap contributors"
```

Run database migrations:

```bash
npm run db:migrate
```

Migration `0003_event_items` maakt de beheerde `event_item_types`-lijst en de
generieke `event_items`- en `event_item_images`-tabellen. Bestaande obstakels en
foto's worden met behoud van ids, status, volgorde, locatie en timestamps naar
het standaardtype `obstacle` overgezet. De oude obstacle-API blijft als
compatibiliteitslaag beschikbaar; nieuwe code gebruikt `/api/event-items`.

If you have existing files in `public/uploads`, migrate them to Supabase Storage:

```bash
npm run storage:migrate-local
```

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
