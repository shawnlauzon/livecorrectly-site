# Admin Page Setup

This document describes the admin interface for viewing subscriber charts.

## Environment Variables Required

Add these to your `.env.local` file:

```env
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
ADMIN_PASSWORD=your-secure-password-here
```

## Accessing the Admin Interface

1. Navigate to `/admin`
2. Enter the admin password (value from `ADMIN_PASSWORD` env var)
3. View the list of all subscribers
4. Click any row to view full chart details

## Features

### List View (`/admin`)
- Shows all subscribers in a table
- Displays: email, name, birth date, chart type, created date
- Click any row to view details

### Detail View (`/admin/[id]`)
- Shows full subscriber information
- Displays complete chart interpretation:
  - Type (Generator, Manifesting Generator, Manifestor, Projector, Reflector)
  - Career Design
  - Strategy
  - Inner Authority
  - Decision-making Strategy
  - Profile
  - Definition
  - Assimilation Style
  - Signature Theme (on-track indicator)
  - Not-Self Theme (off-track indicator)

## Security

- Simple password protection via Authorization header
- Password stored in sessionStorage for navigation between pages
- No user accounts or complex auth - single admin use case only
- Password verification happens on every API request

## Architecture

### Database Layer
- **lib/db.ts** - Neon serverless connection + query helpers
- Uses `@neondatabase/serverless` package
- Raw SQL queries (no ORM)
- Two functions: `getAllSubscribers()` and `getSubscriberById()`

### API Routes
- **GET /api/admin/subscribers** - List all subscribers
- **GET /api/admin/subscribers/[id]** - Get single subscriber

Both routes check `Authorization: Bearer <password>` header.

### Chart Interpretation
- **lib/hd-chart/** - Human Design chart utilities
- `constants.ts` - Lookup tables (types, strategies, authorities, etc.)
- `index.ts` - `hdChart()` function for interpreting chart data
- Adapted from fractalhumandesign codebase

### UI Components
- **components/admin/chart-display.tsx** - Chart property display component
- Uses CSS Modules with Live Correctly design tokens
- Displays subscriber info + full chart interpretation

### Pages
- **app/admin/page.tsx** - List view (client component)
- **app/admin/[id]/page.tsx** - Detail view (client component)

## Design Tokens

The admin interface uses the Live Correctly design system:

```css
--ink: #221B3D (primary text)
--grape: #6A4BD6 (primary accent)
--grape-deep: #4A31A8 (hover/active states)
--muted: #6E688A (secondary text)
--card: #FFFFFF (card backgrounds)
--paper: #F6F3FC (light backgrounds)
--line: #E6E1F4 (borders)
```

Fonts:
- **var(--display)** - Bricolage Grotesque (headings)
- **var(--body)** - Hanken Grotesk (body text)

## Testing the Implementation

Manual test checklist:

1. **Password protection**
   - [ ] Navigate to `/admin` → password prompt appears
   - [ ] Enter wrong password → shows "Invalid password" error
   - [ ] Enter correct password → subscriber list loads

2. **List view**
   - [ ] List shows all subscribers
   - [ ] Displays: email, name, birth date, type, created date
   - [ ] Shows correct count in subtitle
   - [ ] Rows are clickable

3. **Detail view**
   - [ ] Click subscriber → detail page loads
   - [ ] Shows subscriber name, email, birth info
   - [ ] Displays all chart properties
   - [ ] Chart type displays as readable string (not number)
   - [ ] Back button returns to list

4. **Responsive design**
   - [ ] Works on mobile (table scrolls or stacks)
   - [ ] Detail page readable on small screens

## Future Enhancements (Out of Scope)

These were deliberately excluded from the MVP:

- JWT sessions or cookies
- Multiple admin users
- Rate limiting
- Export functionality
- Edit/delete capabilities
- Search/filter
- Pagination
