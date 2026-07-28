# Advertising Lead Booking Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an internal booking calendar to the Advertising Leads CRM page that reserves 90-minute client appointments without double-booking a slot.

**Architecture:** Store bookings in a new Supabase table keyed by advertising-lead `source_key` and by a unique Hong Kong date/time slot. Extend the existing tracking API so a single save updates lead status, owner, and optional booking atomically. The CRM page loads the booking rows with leads, renders a phone-capture-friendly half-month calendar above the lead table, and exposes only unreserved slots in each lead row.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Vercel serverless functions, Supabase PostgreSQL.

---

## File structure

- `app/supabase/migrations/20260728_create_ad_lead_appointments.sql` — creates the independent appointment table, validation and unique-slot protection.
- `app/src/features/ad-leads/adLeadService.ts` — appointment types, seven valid slots, and calendar helpers.
- `app/src/features/ad-leads/adLeadService.test.ts` — slot and half-month calendar helper coverage.
- `app/api/_lib/adLeadAppointments.ts` — Supabase appointment read/write boundary and collision error mapping.
- `app/api/_lib/adLeadAppointments.test.ts` — persistence validation tests using a fake Supabase client.
- `app/api/ad-leads.ts` — returns appointments in the protected inbox response.
- `app/api/ad-lead-tracking.ts` — validates and persists an optional appointment along with tracking changes.
- `app/api/ad-leads.test.ts` — endpoint response and collision tests.
- `app/src/pages/PortalAdLeads.tsx` — calendar, booking column, and client-side update flow.
- `app/src/pages/PortalAdLeads.test.tsx` — calendar and booking interaction tests.

## Task 1: Define the booking data contract

**Files:**
- Modify: `app/src/features/ad-leads/adLeadService.ts`
- Test: `app/src/features/ad-leads/adLeadService.test.ts`

- [ ] **Step 1: Write failing helper tests for the allowed seven slots and two half-month date ranges.**

```ts
it('accepts the seven 90-minute booking starts through 21:00', () => {
  expect(AD_LEAD_APPOINTMENT_SLOTS).toEqual(['12:00', '13:30', '15:00', '16:30', '18:00', '19:30', '21:00'])
})

it('returns the first half of August as dates 1 through 15', () => {
  expect(monthHalfDates(2026, 7, 'first')).toHaveLength(15)
  expect(monthHalfDates(2026, 7, 'first')[0]).toBe('2026-08-01')
  expect(monthHalfDates(2026, 7, 'first').at(-1)).toBe('2026-08-15')
})
```

- [ ] **Step 2: Run the focused tests and verify they fail because the constants and helper are missing.**

Run: `npm test -- src/features/ad-leads/adLeadService.test.ts`

Expected: FAIL with missing export errors for `AD_LEAD_APPOINTMENT_SLOTS` and `monthHalfDates`.

- [ ] **Step 3: Add the minimal appointment types and date helpers.**

```ts
export const AD_LEAD_APPOINTMENT_SLOTS = ['12:00', '13:30', '15:00', '16:30', '18:00', '19:30', '21:00'] as const
export type AdLeadAppointmentSlot = (typeof AD_LEAD_APPOINTMENT_SLOTS)[number]
export type AdLeadAppointment = { sourceKey: string; appointmentDate: string; appointmentTime: AdLeadAppointmentSlot }

export function monthHalfDates(year: number, monthIndex: number, half: 'first' | 'second'): string[] {
  const start = half === 'first' ? 1 : 16
  const end = half === 'first' ? 15 : new Date(year, monthIndex + 1, 0).getDate()
  return Array.from({ length: end - start + 1 }, (_, index) => {
    const day = start + index
    return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  })
}
```

- [ ] **Step 4: Re-run the focused helper tests and verify they pass.**

Run: `npm test -- src/features/ad-leads/adLeadService.test.ts`

Expected: PASS.

## Task 2: Create isolated appointment persistence

**Files:**
- Create: `app/supabase/migrations/20260728_create_ad_lead_appointments.sql`
- Create: `app/api/_lib/adLeadAppointments.ts`
- Test: `app/api/_lib/adLeadAppointments.test.ts`

- [ ] **Step 1: Write failing persistence tests covering a valid appointment and a collision.**

```ts
it('writes a validated appointment for one advertising lead', async () => {
  const upsert = vi.fn().mockResolvedValue({ error: null })
  await upsertAdLeadAppointment({ source_key: 'Meta:lead-1', appointment_date: '2026-08-01', appointment_time: '12:00' }, fakeClient(upsert))
  expect(upsert).toHaveBeenCalledWith({ source_key: 'Meta:lead-1', appointment_date: '2026-08-01', appointment_time: '12:00' })
})
```

- [ ] **Step 2: Run the focused persistence test and verify it fails because the module does not exist.**

Run: `npm test -- api/_lib/adLeadAppointments.test.ts`

Expected: FAIL with module-not-found.

- [ ] **Step 3: Create the database migration with an independent table and a unique slot constraint.**

```sql
create table public.ad_lead_appointments (
  source_key text primary key references public.ad_lead_tracking(source_key) on delete cascade,
  appointment_date date not null,
  appointment_time text not null check (appointment_time in ('12:00', '13:30', '15:00', '16:30', '18:00', '19:30', '21:00')),
  updated_at timestamptz not null default now(),
  unique (appointment_date, appointment_time)
);

alter table public.ad_lead_appointments enable row level security;
```

- [ ] **Step 4: Implement validated Supabase load and upsert helpers, mapping PostgreSQL unique error `23505` to `appointment_slot_taken`.**

```ts
export async function upsertAdLeadAppointment(appointment: AdLeadAppointmentUpdate, client = createSupabaseAdmin()) {
  const { error } = await client.from('ad_lead_appointments').upsert(appointment)
  if (error?.code === '23505') throw new Error('appointment_slot_taken')
  if (error) throw new Error('ad_lead_appointments_unavailable')
}
```

- [ ] **Step 5: Re-run the persistence tests and verify they pass.**

Run: `npm test -- api/_lib/adLeadAppointments.test.ts`

Expected: PASS.

## Task 3: Return and save appointments through the protected APIs

**Files:**
- Modify: `app/api/ad-leads.ts`
- Modify: `app/api/ad-lead-tracking.ts`
- Modify: `app/api/ad-leads.test.ts`

- [ ] **Step 1: Write failing endpoint tests requiring appointment rows in GET data and rejecting a taken booking slot with HTTP 409.**

```ts
expect(response.body).toEqual(expect.objectContaining({
  appointments: [{ sourceKey: 'Meta:lead-1', appointmentDate: '2026-08-01', appointmentTime: '12:00' }],
}))

expect(response.statusCode).toBe(409)
expect(response.body).toEqual({ error: 'appointment_slot_taken' })
```

- [ ] **Step 2: Run the endpoint test and verify it fails because appointment data is absent.**

Run: `npm test -- api/ad-leads.test.ts`

Expected: FAIL on missing `appointments` and expected status `409`.

- [ ] **Step 3: Load appointments in parallel with source leads and tracking, and allow the tracking PATCH body to include either no appointment or one valid `{ appointmentDate, appointmentTime }` pair.**

```ts
const [source, tracking, appointments] = await Promise.all([readSourceLeads(), loadTracking(), loadAppointments()])
response.status(200).json({ leads: normalizeAdLeads(source.leads, tracking), appointments, unavailableSources: source.unavailableSources })
```

- [ ] **Step 4: Persist tracking first, then the appointment; return HTTP 409 when the unique date/time slot is already held.**

```ts
if (appointmentDate && appointmentTime) await upsertAppointment({ source_key: sourceKey, appointment_date: appointmentDate, appointment_time: appointmentTime })
response.status(200).json({ sourceKey, status, owner, appointmentDate, appointmentTime })
```

- [ ] **Step 5: Re-run the endpoint tests and verify they pass.**

Run: `npm test -- api/ad-leads.test.ts`

Expected: PASS.

## Task 4: Add the capture-friendly calendar and row booking control

**Files:**
- Modify: `app/src/pages/PortalAdLeads.tsx`
- Test: `app/src/pages/PortalAdLeads.test.tsx`

- [ ] **Step 1: Write failing UI tests for the first-half calendar, occupied slot state, and a booking PATCH.**

```tsx
expect(await screen.findByRole('heading', { name: '預約時間表' })).toBeInTheDocument()
expect(screen.getByText('已預約')).toBeInTheDocument()
fireEvent.change(screen.getByLabelText('陳大文 的預約時間'), { target: { value: '2026-08-01|12:00' } })
await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith('/api/ad-lead-tracking', expect.objectContaining({
  body: expect.stringContaining('"appointmentTime":"12:00"'),
})))
```

- [ ] **Step 2: Run the UI test and verify it fails because the calendar and booking control do not exist.**

Run: `npm test -- src/pages/PortalAdLeads.test.tsx`

Expected: FAIL with missing heading or control labels.

- [ ] **Step 3: Render a compact seven-column calendar above the table, with current-month first/second-half navigation and privacy-safe `已預約` chips.**

```tsx
<section aria-labelledby="appointment-calendar-title" className="mb-5 rounded-xl bg-white p-4 shadow-sm">
  <h2 id="appointment-calendar-title" className="font-serif text-xl font-bold">預約時間表</h2>
  <p className="text-xs text-a2o-black/50">可截圖發送予客人・已預約時段不顯示客人姓名</p>
</section>
```

- [ ] **Step 4: Add a `預約日期及時間` column whose dropdown lists only available future slots and saves it with status `已預約`.**

```tsx
const appointment = value ? { appointmentDate: value.split('|')[0], appointmentTime: value.split('|')[1] } : undefined
await updateTracking(lead, { status: '已預約' }, appointment)
```

- [ ] **Step 5: On a successful appointment write, update the local lead and appointment state immediately; on HTTP 409, show `此時段剛剛已被預約，請選擇其他時間。` and reload data.**

- [ ] **Step 6: Re-run the UI test and verify it passes.**

Run: `npm test -- src/pages/PortalAdLeads.test.tsx`

Expected: PASS.

## Task 5: Validate, apply migration, and release

**Files:**
- Modify only the files from Tasks 1–4.

- [ ] **Step 1: Run the focused appointment and advertising-lead tests.**

Run: `npm test -- src/features/ad-leads/adLeadService.test.ts api/_lib/adLeadAppointments.test.ts api/ad-leads.test.ts src/pages/PortalAdLeads.test.tsx`

Expected: PASS with zero failures.

- [ ] **Step 2: Run the production build.**

Run: `npm run build`

Expected: exit code `0`.

- [ ] **Step 3: Apply `app/supabase/migrations/20260728_create_ad_lead_appointments.sql` once in the existing Supabase project SQL editor.**

Expected: table `public.ad_lead_appointments` exists with a unique `(appointment_date, appointment_time)` constraint.

- [ ] **Step 4: Commit only the appointment implementation and migration, push to `codex/ad-lead-inbox-production`, and deploy production through Vercel.**

Run: `git add app/supabase/migrations/20260728_create_ad_lead_appointments.sql app/src/features/ad-leads app/api/ad-leads.ts app/api/ad-lead-tracking.ts app/api/_lib/adLeadAppointments.ts app/src/pages/PortalAdLeads.tsx app/api/ad-leads.test.ts app/src/pages/PortalAdLeads.test.tsx && git commit -m "feat: add advertising lead booking calendar" && git push origin HEAD:codex/ad-lead-inbox-production && npx --yes vercel@latest --prod --yes`

Expected: Git push succeeds and Vercel status is `Ready` with alias `https://a2o-style-lab.vercel.app`.
