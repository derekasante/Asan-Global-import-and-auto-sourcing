# Asan Global Backend

Production Node.js + Express API with Supabase for customer accounts and shipment tracking.

## Quick start

### 1. Create a Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and sign up (free tier works).
2. Click **New project**, choose a name and database password, and wait for provisioning.
3. Open **Project Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret; server only)

### 2. Run the database migrations

1. In Supabase, open **SQL Editor**.
2. Paste and run `supabase/migrations/001_initial_schema.sql`.
3. Paste and run `supabase/migrations/002_admin_orders_messages_realtime.sql`.

Migration 001 creates profiles, shipments, and tracking. Migration 002 adds orders, messages, admin policies, and enables Supabase Realtime.

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and paste your Supabase keys.

### 4. Install and run

```bash
npm install
npm run dev
```

Server starts at `http://localhost:3001`.

---

## API reference

Base URL: `http://localhost:3001/api`

### Health

| Method | Path | Auth |
|--------|------|------|
| GET | `/health` | No |

### Authentication

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Customer registration |
| POST | `/api/auth/login` | Login (returns JWT) |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current user + profile |

**Register body:**
```json
{
  "email": "customer@example.com",
  "password": "securepassword123",
  "full_name": "John Doe",
  "phone": "+1234567890",
  "company": "Acme Corp"
}
```

**Login body:**
```json
{
  "email": "customer@example.com",
  "password": "securepassword123"
}
```

Use the returned `access_token` as: `Authorization: Bearer <token>`

### Profile

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/profile` | Yes |
| PUT | `/api/profile` | Yes |

### Shipments

| Method | Path | Auth | Role |
|--------|------|------|------|
| POST | `/api/shipments` | Yes | Customer / Admin |
| GET | `/api/shipments` | Yes | Customer (own) / Admin (all) |
| GET | `/api/shipments/:id` | Yes | Customer (own) / Admin |
| PATCH | `/api/shipments/:id/status` | Yes | Admin only |

**Create shipment body:**
```json
{
  "package_description": "Auto parts — brake pads",
  "package_weight_kg": 12.5,
  "package_quantity": 2,
  "origin_address": "123 Factory Rd",
  "origin_city": "Shanghai",
  "origin_country": "CN",
  "destination_address": "456 Main St",
  "destination_city": "Los Angeles",
  "destination_state": "CA",
  "destination_postal_code": "90001",
  "destination_country": "US",
  "shipping_method": "ocean_freight",
  "estimated_delivery": "2026-09-15"
}
```

**Update status body (admin):**
```json
{
  "status": "in_transit",
  "location": "Port of Long Beach",
  "description": "Container cleared customs",
  "estimated_delivery": "2026-09-15"
}
```

**Shipment statuses:** `pending`, `confirmed`, `picked_up`, `in_transit`, `customs_clearance`, `out_for_delivery`, `delivered`, `cancelled`, `on_hold`

**Shipping methods:** `air_freight`, `ocean_freight`, `express_courier`, `ground`, `rail`

### Public tracking (no auth)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/track/:trackingNumber` | Track by number (e.g. `AGI-20260729-A1B2C3D4`) |

### Contact messages (public)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/messages` | No | Submit contact/inquiry message |
| POST | `/api/messages/authenticated` | Yes | Submit message linked to account |

---

## Admin dashboard API

All admin routes (except login) require `Authorization: Bearer <admin_token>`.

### Admin authentication

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/admin/auth/login` | Admin login (rejects non-admin users) |

### Dashboard

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/dashboard` | Stats, alerts, recent activity |

### Manage customers

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/customers` | List customers (`?search=&limit=&offset=`) |
| GET | `/api/admin/customers/:id` | Customer detail + stats |
| PUT | `/api/admin/customers/:id` | Update customer profile |
| DELETE | `/api/admin/customers/:id` | Delete customer account |

### Manage shipments (full CRUD)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/shipments` | List all shipments |
| POST | `/api/admin/shipments` | Create shipment for a customer (`customer_id` required) |
| GET | `/api/admin/shipments/:id` | Shipment detail + timeline |
| PUT | `/api/admin/shipments/:id` | Edit shipment fields |
| PATCH | `/api/admin/shipments/:id/status` | Update delivery status + add timeline entry |
| DELETE | `/api/admin/shipments/:id` | Delete shipment |

### Orders

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/orders` | List orders |
| POST | `/api/admin/orders` | Create order |
| GET | `/api/admin/orders/:id` | Order detail |
| PUT | `/api/admin/orders/:id` | Update order |
| DELETE | `/api/admin/orders/:id` | Delete order |

**Create order body:**
```json
{
  "customer_id": "uuid-here",
  "title": "Import order — Toyota parts",
  "description": "Bulk auto parts from Japan",
  "items": [
    { "name": "Brake pads", "quantity": 50, "unit_price_usd": 12.99 }
  ],
  "total_value_usd": 649.50,
  "status": "pending"
}
```

**Order statuses:** `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`

### Messages

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/messages` | List messages (`?status=new`) |
| GET | `/api/admin/messages/:id` | Message detail |
| PATCH | `/api/admin/messages/:id` | Mark read / reply |
| DELETE | `/api/admin/messages/:id` | Delete message |

**Reply body:**
```json
{
  "admin_reply": "Thank you for your inquiry. We will contact you within 24 hours.",
  "status": "replied"
}
```

---

## Real-time tracking (Supabase Realtime)

Live updates are powered by Supabase Realtime and exposed via **Server-Sent Events (SSE)** streams.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/realtime/stream/track/:trackingNumber` | No | Live public tracking stream |
| GET | `/api/realtime/stream/shipments/:id` | Yes | Live updates for a shipment |
| GET | `/api/realtime/stream/admin` | Admin | Live dashboard feed (orders, messages, shipments) |
| GET | `/api/realtime/config` | Yes | Supabase Realtime config for client SDK |

### SSE event types

- `connected` — initial snapshot when stream opens
- `shipment_update` — shipment row changed (status, delivery dates)
- `status_update` — new timeline entry added
- `order_created` / `order_updated` — admin feed only
- `message_created` — admin feed only

### JavaScript SSE example (public tracking)

```javascript
const trackingNumber = 'AGI-20260729-A1B2C3D4';
const source = new EventSource(
  `http://localhost:3001/api/realtime/stream/track/${trackingNumber}`
);

source.addEventListener('connected', (e) => {
  console.log('Current status:', JSON.parse(e.data));
});

source.addEventListener('shipment_update', (e) => {
  console.log('Status changed:', JSON.parse(e.data));
});

source.addEventListener('status_update', (e) => {
  console.log('New timeline entry:', JSON.parse(e.data));
});
```

### Client-side Supabase Realtime (alternative)

Call `GET /api/realtime/config` with your JWT, then subscribe directly:

```javascript
import { createClient } from '@supabase/supabase-js';

const { supabase_url, supabase_anon_key } = config.data;
const supabase = createClient(supabase_url, supabase_anon_key, {
  global: { headers: { Authorization: `Bearer ${accessToken}` } },
});

supabase
  .channel('my-shipment')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'shipments',
    filter: 'id=eq.SHIPMENT_UUID',
  }, (payload) => console.log(payload.new))
  .subscribe();
```

---

## Create an admin user

After registering a customer account, promote them in Supabase SQL Editor:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'your-admin@example.com';
```

---

## Security

- Environment variables validated at startup (Zod)
- Helmet security headers
- Rate limiting on all `/api` routes and stricter limits on public tracking
- Supabase Row Level Security on all tables
- Service role key used only on the server; never exposed to clients
- JWT verification on protected routes

---

## Project structure

```
src/
  config/       Environment + Supabase clients
  controllers/  Request handlers
  middleware/   Auth, validation, errors
  routes/       Express routers
  services/     Business logic
  utils/        Helpers
  validators/   Zod schemas
  app.js        Express app factory
  server.js     Entry point
supabase/
  migrations/   SQL schema
```
