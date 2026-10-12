import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleAccessGuard: CanActivateChildFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.parseUrl('/');
  }

  const targetPath = state.url.split('?')[0];
  if (auth.isRestaurant()) {
    return targetPath === '/restaurants'
      || /^\/restaurants\/\d+$/.test(targetPath)
      || targetPath === '/restaurants/menu-items'
      || targetPath === '/restaurants/menu-categories'
      ? true
      : router.parseUrl('/restaurants/menu-items');
  }

  if (!auth.isStaff()) {
    return router.parseUrl('/');
  }

  return targetPath.startsWith('/restaurants/menu-items')
    ? router.parseUrl('/restaurants')
    : true;
};
