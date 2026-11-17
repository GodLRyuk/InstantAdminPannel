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

Staff screens link directly to Django admin on the configured API host:

- Vendors: `/admin/restaurants/restaurantvendor/`
- Commissions: `/admin/restaurants/vendorcommission/`
- Payment splits: `/admin/restaurants/paymentsplit/`
- Refunds: `/admin/restaurants/restaurantrefund/`

Django requires its own staff session and model permissions. There are no REST
list APIs for these records. The partner vendor API at
`/api/restaurants/partner/vendor/` is scoped to the authenticated owner and is
not used as a staff listing. Owners submit bank/PAN details there; its response
contains only vendor status fields, `bank_account_last4`, and `ifsc_code`.
The Django vendor view must keep raw bank/PAN details hidden; that backend
configuration is outside this repository.

Operations send an empty JSON object by POST to:

- `/api/restaurants/admin/payment-splits/process/`
- `/api/restaurants/admin/payment-splits/sync/`
- `/api/restaurants/admin/refunds/process/`

Requests require an explicit confirmation and are never retried automatically.
Successful responses display processed/failed counts for splits, synced/failed
counts for settlements, and processed/failed/synced counts for refunds. Check
Django admin records for individual outcomes.
