import { sl } from '../i18n/sl.js';
import { navigate, paths } from '../router.js';

/** Explains why scanning can't start (no key / offline). */
export function ScanBlocked({ reason }) {
  return (
    <div class="stack" style="display:flex;flex-direction:column;gap:8px;margin-bottom:8px">
      <p class="question" style="font-size:20px;font-weight:700">
        {reason === 'key' ? sl.needKey : sl.needInternet}
      </p>
      {reason === 'key' && (
        <button class="btn btn-primary" type="button" onClick={() => navigate(paths.settings())}>
          {sl.openSettings}
        </button>
      )}
    </div>
  );
}
