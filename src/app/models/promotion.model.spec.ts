import { getPromotionApiError } from './promotion.model';

describe('getPromotionApiError', () => {
  it('returns a useful message for HTML error responses', () => {
    const message = getPromotionApiError(
      { error: '<!doctype html><html><body>Not Found</body></html>', status: 404 },
      'Request failed.'
    );

    expect(message).toBe(
      'The API returned an HTML error page (HTTP 404). Confirm that the endpoint is configured on the server.'
    );
  });

  it('preserves readable API error messages', () => {
    expect(getPromotionApiError({ error: { detail: 'Coupons are for Pass members only.' } }, 'Request failed.'))
      .toBe('Coupons are for Pass members only.');
  });
});
