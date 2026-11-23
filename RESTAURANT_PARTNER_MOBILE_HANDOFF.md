# Restaurant partner module for the delivery driver app

Build a restaurant workspace inside the existing mobile app. A restaurant owner can receive incoming orders, accept or reject them, start preparation, mark them ready for pickup, and manage menu categories, dishes, photos, and availability. Keep the existing driver experience and authentication flow working for delivery accounts.

## Source and environment

The core contracts below come from the local Django backend at commit `fa82d56`. Request and response examples use sample data and were checked against source. Live responses and deployment parity still need verification with a restaurant test account.

- Production API root is `https://api.instantdelivery.cloud/api`. Local backend root is `http://127.0.0.1:8000/api` on the development machine. For a device or emulator, use a reachable development host.
- Backend references are `InstantBackend/accounts/api/views.py`, `InstantBackend/config/urls.py`, and `InstantBackend/restaurants/{urls,views,serializers,services,models}.py`.
- Web UI references are `instant-admin/src/app/restaurants/restaurant-admin.service.ts`, `restaurant-orders.component.ts`, `restaurant-menu.component.ts`, and `restaurant-menu-items.component.ts`.

## Sign in and route by role

Restaurant accounts use email and password through `POST /accounts/admin-login/`. Enter the restaurant workspace only for `role === 'RESTAURANT'` (the response also sets `is_restaurant: true`). Keep the app's driver sign-in available. Store tokens in the app's secure session store, use the access token as a Bearer token, and on an expired access token refresh once and retry the request once. Clear the session if refresh fails. Respect `Retry-After` on login rate limits.

The partner endpoints scope requests to the first restaurant owned by the authenticated account. They take no restaurant selector. A restaurant account with no registered restaurant gets a 404. Use `GET /restaurants/` with the restaurant token to load the owner's profile list, for example to show the restaurant name or an onboarding-required empty state.

```bash
API='http://127.0.0.1:8000/api'
curl -sS -i "$API/accounts/admin-login/" \
  -H 'Content-Type: application/json' \
  -d '{"email":"owner@example.com","password":"REPLACE_WITH_TEST_PASSWORD"}'
```

Example sign-in response (200).

```json
{"access":"ACCESS_TOKEN","refresh":"REFRESH_TOKEN","user_id":7,"first_name":"Example","last_name":"Owner","email":"owner@example.com","zip_code":"700001","is_staff":false,"role":"RESTAURANT","is_restaurant":true,"profile_image":null}
```

Use this Bash setup for subsequent examples. Replace sample IDs with IDs returned by your test API.

```bash
ACCESS='REPLACE_WITH_ACCESS_TOKEN'
R="$API/restaurants"
ORDER=103
CATEGORY=12
ITEM=41
AUTH=(-H "Authorization: Bearer $ACCESS")
JSON=(-H 'Content-Type: application/json')

curl -sS -i "$API/token/refresh/" "${JSON[@]}" \
  -d '{"refresh":"REPLACE_WITH_REFRESH_TOKEN"}'
curl -sS -i "$R/" "${AUTH[@]}"
```

Refresh returns an object with `access`. If it also returns `refresh`, persist the rotated token. Owner profile list returns an array with fields including `id`, `name`, `status`, `is_accepting_orders`, `is_open_now`, and `avg_prep_minutes`.

## Orders

| Method | Path relative to API root | Request and response |
| --- | --- | --- |
| GET | `/restaurants/partner/orders/` | Optional `active=1` or `status=placed,accepted`. Returns a bare array of orders. Filters combine when both are present. |
| GET | `/restaurants/partner/orders/{id}/` | Returns a single order. Use the numeric `id`, with `order_number` for display. |
| POST | `/restaurants/partner/orders/{id}/status/` | JSON `{"status":"accepted"}` with optional `reason` up to 255 characters. Returns the updated order. |

Active orders include `placed`, `accepted`, `preparing`, `ready`, and `out_for_delivery`. Partner lists exclude `awaiting_payment`. For history, omit the active filter and optionally use `status=delivered,rejected,cancelled`.

| Current state | Restaurant actions and submitted status |
| --- | --- |
| `placed` | Accept (`accepted`) or Reject (`rejected`) |
| `accepted` | Start preparing (`preparing`) |
| `preparing` | Mark ready (`ready`) |
| `ready`, `out_for_delivery`, `delivered`, `rejected`, `cancelled` | Display current state |

```bash
curl -sS -i "$R/partner/orders/?active=1" "${AUTH[@]}"
curl -sS -i "$R/partner/orders/?status=placed,accepted" "${AUTH[@]}"
curl -sS -i "$R/partner/orders/$ORDER/" "${AUTH[@]}"

order_status() {
  curl -sS -i "$R/partner/orders/$1/status/" "${AUTH[@]}" "${JSON[@]}" -d "$2"
}
order_status "$ORDER" '{"status":"accepted"}'
order_status "$ORDER" '{"status":"preparing"}'
order_status "$ORDER" '{"status":"ready"}'
# Use a separate order that is still placed for rejection.
order_status 104 '{"status":"rejected","reason":"Ingredient unavailable"}'
```

Example order detail (200). The list wraps orders in an array. Currency amounts are decimal strings. Address is an object snapshot. OTP is null for the restaurant.

```json
{
  "id":103,"order_number":"R-103","status":"placed","status_label":"Placed",
  "payment_method":"cod","payment_method_label":"Cash on delivery",
  "payment_status":"pending","payment_status_label":"Pending",
  "restaurant":{"id":5,"name":"Example Kitchen","phone":"","image":null},
  "items":[{"id":501,"menu_item":41,"name":"Paneer Wrap","is_veg":true,"unit_price":"150.00","quantity":2,"line_total":"300.00"}],
  "item_total":"300.00","discount":"0.00","delivery_fee":"30.00","packaging_charge":"10.00","gst":"15.50","total_amount":"355.50",
  "offer_code":"","customer_name":"Example Customer","customer_phone":"",
  "delivery_address":{"city":"Kolkata","pincode":"700001"},"delivery_lat":null,"delivery_lng":null,
  "notes":"No onions","rejection_reason":"","razorpay_order_id":"","delivery_otp":null,
  "created_at":"2026-11-23T10:00:00+05:30","updated_at":"2026-11-23T10:00:00+05:30"
}
```

Accept returns the order with status `accepted` and an extra `delivery_assignment` object. It contains `id`, `driver_id`, and `status` when assigned, or `{"status":"unassigned","driver_id":null}`. Treat it as optional on subsequent reads. For a rejected paid online order, show the backend-provided payment state. The backend marks it `refund_pending`. Delivery completion, OTP, cancellation, and refunds have no restaurant action in this module.

Load on entry and resume, support pull-to-refresh, and poll every 30 seconds while the orders screen is foregrounded, matching the admin app. Highlight newly seen `placed` IDs after the initial fetch. Disable repeat taps while a status update is in flight. Apply the returned order and refresh if a transition is rejected or the mutation's result is uncertain. The verified partner API is polling-based. Background push requires an independently confirmed notification integration.

## Menu categories

`/restaurants/partner/categories/` supports GET list and POST create. The numeric detail path supports GET, PATCH, and DELETE. List returns an array. Create and update return the category object, for example `{"id":12,"name":"Wraps","sort_order":10}`. DELETE returns 204 with an empty body. Names are unique per restaurant, case-insensitively.

```bash
curl -sS -i "$R/partner/categories/" "${AUTH[@]}"
curl -sS -i "$R/partner/categories/" "${AUTH[@]}" "${JSON[@]}" \
  -d '{"name":"Wraps","sort_order":10}'
curl -sS -i "$R/partner/categories/$CATEGORY/" "${AUTH[@]}"
curl -sS -i "$R/partner/categories/$CATEGORY/" "${AUTH[@]}" "${JSON[@]}" \
  -X PATCH -d '{"name":"Signature Wraps","sort_order":20}'
# Run deletes only for disposable test records.
curl -sS -i "$R/partner/categories/$CATEGORY/" "${AUTH[@]}" -X DELETE
```

## Menu items

`/restaurants/partner/items/` supports GET list (optional `category={id}`) and POST create. The numeric detail path supports GET, PATCH, and DELETE. POST to `{id}/toggle/` sets availability. Send an explicit boolean so a repeated request keeps the intended state.

Use JSON for normal edits and multipart with file field `image` when uploading a dish photo. Omit the image on updates that keep it. Send prices as decimal strings. MRP must be at least the selling price and category must be owned by the restaurant or null. Categories and item IDs come from the partner API. Use items' `sort_order` for menu ordering.

```bash
curl -sS -i "$R/partner/items/" "${AUTH[@]}"
curl -sS -i "$R/partner/items/?category=$CATEGORY" "${AUTH[@]}"
curl -sS -i "$R/partner/items/" "${AUTH[@]}" "${JSON[@]}" \
  -d "{\"name\":\"Paneer Wrap\",\"description\":\"Grilled paneer\",\"category\":$CATEGORY,\"is_veg\":true,\"price\":\"150.00\",\"mrp\":\"180.00\",\"packaging_charge\":\"5.00\",\"is_available\":true,\"sort_order\":1}"
curl -sS -i "$R/partner/items/$ITEM/" "${AUTH[@]}"
curl -sS -i "$R/partner/items/$ITEM/" "${AUTH[@]}" "${JSON[@]}" \
  -X PATCH -d '{"price":"155.00","mrp":"180.00"}'
curl -sS -i "$R/partner/items/$ITEM/" "${AUTH[@]}" \
  -X PATCH -F 'image=@./dish.jpg'
curl -sS -i "$R/partner/items/$ITEM/toggle/" "${AUTH[@]}" "${JSON[@]}" \
  -d '{"is_available":false}'
# Run only for a disposable test item.
curl -sS -i "$R/partner/items/$ITEM/" "${AUTH[@]}" -X DELETE
```

Example item (201 on creation, 200 on detail, update, or toggle). List returns an array. DELETE returns 204 with an empty body.

```json
{"id":41,"name":"Paneer Wrap","description":"Grilled paneer","category":12,"category_name":"Wraps","is_veg":true,"price":"150.00","mrp":"180.00","discount_percent":17,"image":null,"is_available":true,"packaging_charge":"5.00","sort_order":1}
```

## Errors and acceptance checks

A validation failure returns 400 with a field error, such as `{"mrp":["MRP cannot be lower than the selling price."]}`, `{"status":"Cannot change an order from \"placed\" to \"ready\"."}`, or a `detail` message. Display field details without closing the editor. Handle 401 with token refresh, 403 as a role or permission failure, and 404 as a missing restaurant or record. Cross-restaurant status changes can return 400 with `{"detail":"Order not found."}`.

- Sign in as a restaurant owner and confirm the restaurant workspace opens. Verify the existing delivery session still reaches the driver area.
- With a disposable COD order, confirm it appears in Incoming, then accept it, start preparation, and mark it ready. Verify state after refresh. Reject a separate order and verify the reason.
- Create a test category and dish, change the price, upload a photo, toggle availability, and reload to confirm persistence.
- Confirm another restaurant's item or order is inaccessible. Check empty orders, validation errors, and token refresh.

## Add-ons and bulk upload

The Angular admin service references add-on groups under `/restaurants/partner/items/{itemId}/addon-groups/`, nested options under `{groupId}/options/`, and spreadsheet uploads at `/restaurants/partner/categories/bulk/` and `/restaurants/partner/items/bulk/` (multipart field `file`). Those routes are absent in the inspected Django checkout. Confirm the deployed routes and schemas before exposing those features. Core order handling and dish/category editing can proceed independently.
