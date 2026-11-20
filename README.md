# InstantAdmin

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.1.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

### Restaurant payments (staff)

The Restaurants navigation includes vendor onboarding, commission settings,
payment splits, refunds, and payment operations. Restaurant and customer
accounts cannot open these routes. Django must enforce staff permissions on
all admin API endpoints; browser role checks only control navigation.

Vendor onboarding is native to the Angular panel:

- `GET /api/restaurants/admin/vendors/` loads safe vendor status metadata.
- `POST /api/restaurants/admin/vendors/` registers a vendor using `restaurant_id`,
  `account_number`, `ifsc_code`, `account_holder_name`, `pan`, `business_type`,
  and optional `gstin`.

The form requires a restaurant email and phone, validates bank/KYC fields,
and keeps sensitive inputs only in component memory. Inputs are cleared after
success, when changing restaurants, when clearing the form, and on navigation.
The vendor list shows only masked bank digits and the safe response fields.
HTTP 502 explains that the backend retained encrypted details and allows an
explicit retry. Vendor API errors are rendered locally without echoing raw
response bodies in global alerts. Bank/KYC entry is not available in Django
admin and the partner vendor API is not used for staff entry.

Commission, split, and refund forms open in the Angular panel. The staff-only
Django endpoints are:

- `GET/POST /api/restaurants/admin/commissions/` lists commission rates and saves a
  restaurant, percentage, and effective date. The backend uses the applicable
  rate when calculating an order's split.
- `GET/POST /api/restaurants/admin/payment-splits/` lists recent splits and
  processes or syncs one paid Cashfree order by order number. A split can remain
  pending during the provider's two-minute wait.
- `GET/POST /api/restaurants/admin/refunds/` lists recent refunds and submits or
  checks a full cancellation refund for one order number.

The Django backend calculates amounts, makes Cashfree requests, and returns the
record status. These forms require a backend deployment containing the staff
endpoints above.

Operations send an empty JSON object by POST to:

- `/api/restaurants/admin/payment-splits/process/`
- `/api/restaurants/admin/payment-splits/sync/`
- `/api/restaurants/admin/refunds/process/`

Requests require an explicit confirmation and are never retried automatically.
Successful responses display processed/failed counts for splits, synced/failed
counts for settlements, and processed/failed/synced counts for refunds. The Payment splits and Restaurant refunds pages show individual outcomes.
