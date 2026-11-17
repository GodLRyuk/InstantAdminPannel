import { HttpContextToken } from '@angular/common/http';

/** The caller renders a sanitized local error instead of a global response-body alert. */
export const LOCAL_API_ERROR = new HttpContextToken<boolean>(() => false);
