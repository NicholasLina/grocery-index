'use client';

import { useEffect } from 'react';
import {
  RELOAD_FLAG_KEY,
  isDeploymentSkewErrorMessage,
  shouldReloadForFailedAsset,
} from '../lib/deploymentSkew';

/**
 * After a deploy, a tab can briefly request old hashed CSS/JS that no longer
 * exist. Vercel answers those with text/plain 404 bodies, which show up as
 * MIME-type stylesheet/script failures. Reload once to pick up the new HTML.
 */
export default function DeploymentSkewRecovery() {
  useEffect(() => {
    const reloadOnce = () => {
      if (sessionStorage.getItem(RELOAD_FLAG_KEY) === '1') {
        return;
      }

      sessionStorage.setItem(RELOAD_FLAG_KEY, '1');
      window.location.reload();
    };

    const onResourceError = (event) => {
      const target = event.target;
      if (!(target instanceof HTMLLinkElement) && !(target instanceof HTMLScriptElement)) {
        return;
      }

      const url = target instanceof HTMLLinkElement ? target.href : target.src;
      const alreadyReloaded = sessionStorage.getItem(RELOAD_FLAG_KEY) === '1';
      if (!shouldReloadForFailedAsset({ url, alreadyReloaded })) {
        return;
      }

      reloadOnce();
    };

    const onUnhandledRejection = (event) => {
      const reason = event.reason;
      const message =
        typeof reason === 'string'
          ? reason
          : reason && typeof reason.message === 'string'
            ? reason.message
            : '';

      if (!isDeploymentSkewErrorMessage(message)) {
        return;
      }

      if (sessionStorage.getItem(RELOAD_FLAG_KEY) === '1') {
        return;
      }

      reloadOnce();
    };

    // Allow a later deploy in the same tab to recover again after a successful load.
    const clearTimer = window.setTimeout(() => {
      sessionStorage.removeItem(RELOAD_FLAG_KEY);
    }, 15000);

    window.addEventListener('error', onResourceError, true);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      window.clearTimeout(clearTimer);
      window.removeEventListener('error', onResourceError, true);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  return null;
}
