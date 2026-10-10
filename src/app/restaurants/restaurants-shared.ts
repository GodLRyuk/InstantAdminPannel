import { HttpErrorResponse } from '@angular/common/http';

/** Turns a Django REST error response into one readable line. */
export function errorText(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error;
    if (body && typeof body === 'object') {
      const parts = Object.entries(body as Record<string, unknown>).map(([key, value]) => {
        const text = Array.isArray(value) ? value.join(' ') : String(value);
        return key === 'detail' ? text : `${key}: ${text}`;
      });
      if (parts.length) return parts.join(' | ');
    }
    if (err.status === 0) return 'Cannot reach the server.';
    return err.message;
  }
  return 'Something went wrong.';
}

/** Shared look for the three restaurant pages. */
export const ADMIN_CSS = `
:host { display: block; padding: 20px; color: #222; font-family: inherit; }
h1 { font-size: 22px; margin: 0 0 4px; }
.sub { color: #666; margin: 0 0 16px; font-size: 14px; }
.bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 14px; }
.tabs { display: flex; gap: 6px; flex-wrap: wrap; }
.tab { border: 1px solid #d0d5dd; background: #fff; border-radius: 18px; padding: 6px 14px; cursor: pointer; font-size: 14px; }
.tab.on { background: #2e7d32; border-color: #2e7d32; color: #fff; font-weight: 600; }
input, select, textarea { border: 1px solid #d0d5dd; border-radius: 8px; padding: 8px 10px; font-size: 14px; font-family: inherit; background: #fff; }
textarea { width: 100%; box-sizing: border-box; min-height: 80px; }
.btn { border: 1px solid #2e7d32; background: #2e7d32; color: #fff; border-radius: 8px; padding: 7px 14px; cursor: pointer; font-size: 14px; text-decoration: none; display: inline-block; }
.btn.ghost { background: #fff; color: #2e7d32; }
.btn.red { background: #c62828; border-color: #c62828; }
.btn.grey { background: #fff; color: #444; border-color: #d0d5dd; }
.btn.sm { padding: 4px 10px; font-size: 13px; }
.btn:disabled { opacity: .5; cursor: default; }
.card { background: #fff; border: 1px solid #e4e7ec; border-radius: 12px; padding: 16px; margin-bottom: 14px; }
.wrap { overflow-x: auto; background: #fff; border: 1px solid #e4e7ec; border-radius: 12px; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th { text-align: left; background: #f6f8fa; padding: 10px 12px; font-weight: 600; white-space: nowrap; }
td { padding: 10px 12px; border-top: 1px solid #eef0f3; vertical-align: top; }
tr.click { cursor: pointer; }
tr.click:hover td { background: #fafbfc; }
.badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; background: #eee; color: #444; white-space: nowrap; }
.badge.pending, .badge.placed, .badge.awaiting_payment { background: #fff3e0; color: #bf360c; }
.badge.approved, .badge.delivered, .badge.paid { background: #e8f5e9; color: #1b5e20; }
.badge.rejected, .badge.suspended, .badge.cancelled, .badge.refund_pending { background: #ffebee; color: #b71c1c; }
.badge.accepted, .badge.preparing, .badge.ready, .badge.out_for_delivery { background: #e3f2fd; color: #0d47a1; }
.err { background: #ffebee; color: #b71c1c; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px; font-size: 14px; }
.ok { background: #e8f5e9; color: #1b5e20; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px; font-size: 14px; }
.muted { color: #777; font-size: 13px; }
.actions { display: flex; gap: 6px; flex-wrap: wrap; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
label.f { display: flex; flex-direction: column; gap: 4px; font-size: 13px; font-weight: 600; color: #444; }
label.f input, label.f select { font-weight: 400; }
label.chk { display: flex; align-items: center; gap: 8px; font-size: 14px; }
h2 { font-size: 16px; margin: 0 0 12px; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.shade { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 50; }
.modal { background: #fff; border-radius: 12px; padding: 20px; width: min(440px, 92vw); }
.modal h3 { margin: 0 0 10px; font-size: 17px; }
.row-end { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
.detail td { background: #fafbfc; }
.imgs { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 10px; }
.imgs img { height: 90px; border-radius: 8px; border: 1px solid #e4e7ec; }
`;
