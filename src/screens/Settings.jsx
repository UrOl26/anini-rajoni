// Nastavitve: API key and backups (export / import).
import { useRef, useState } from 'preact/hooks';
import { sl, formatDate } from '../i18n/sl.js';
import { navigate, paths } from '../router.js';
import { useData, exportJson, markBackup, parseImport, importMerge, importReplace } from '../store.js';
import { getApiKey, setApiKey } from '../lib/cloudReader.js';
import { TopBar, Sheet, Confirm, toast } from '../components/ui.jsx';

async function shareOrDownload(text) {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const name = `anini-rajoni-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
  const file = new File([text], name, { type: 'application/json' });
  // On the iPhone the share sheet lets Ana save to Files / iCloud Drive or send it.
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: name });
    return;
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function Settings() {
  const data = useData();
  const [hasKey, setHasKey] = useState(Boolean(getApiKey()));
  const [keyDraft, setKeyDraft] = useState('');
  const [incoming, setIncoming] = useState(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const fileRef = useRef();

  const exportNow = async () => {
    try {
      await shareOrDownload(exportJson());
      markBackup();
      toast(sl.exported);
    } catch (err) {
      if (err?.name !== 'AbortError') console.error(err);
    }
  };

  const onFile = async (e) => {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = '';
    if (!file) return;
    try {
      setIncoming(parseImport(await file.text()));
    } catch (err) {
      console.error(err);
      toast(sl.importFailed);
    }
  };

  const last = data.lastBackupAt ? new Date(data.lastBackupAt) : null;

  return (
    <div class="screen settings">
      <TopBar title={sl.settings} onBack={() => navigate(paths.home())} />
      <main class="content">
        <section>
          <h2>{sl.apiKey}</h2>
          <p>{sl.apiKeyHint}</p>
          {hasKey ? (
            <div class="stack">
              <p class="ok">✓ {sl.apiKeySaved}</p>
              <button
                class="btn btn-secondary"
                type="button"
                onClick={() => {
                  setApiKey('');
                  setHasKey(false);
                }}
              >
                {sl.deleteKey}
              </button>
            </div>
          ) : (
            <form
              class="stack"
              onSubmit={(e) => {
                e.preventDefault();
                if (!keyDraft.trim()) return;
                setApiKey(keyDraft.trim());
                setKeyDraft('');
                setHasKey(true);
              }}
            >
              <input
                class="input"
                type="password"
                value={keyDraft}
                placeholder={sl.apiKeyPlaceholder}
                aria-label={sl.apiKey}
                autoComplete="off"
                autoCapitalize="off"
                spellcheck={false}
                onInput={(e) => setKeyDraft(e.currentTarget.value)}
              />
              <button class="btn btn-primary" type="submit">
                {sl.save}
              </button>
            </form>
          )}
        </section>

        <section>
          <h2>{sl.backup}</h2>
          <p>{sl.backupHint}</p>
          <p style="color:var(--text);font-weight:700">
            {last ? sl.lastBackup(formatDate(last)) : sl.noBackupYet}
          </p>
          <div class="stack">
            <button class="btn btn-primary" type="button" onClick={exportNow}>
              {sl.exportData}
            </button>
            <button class="btn btn-secondary" type="button" onClick={() => fileRef.current.click()}>
              {sl.importData}
            </button>
            <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={onFile} />
          </div>
        </section>
      </main>

      {incoming && !confirmReplace && (
        <Sheet onClose={() => setIncoming(null)}>
          <p class="question">{sl.importHow}</p>
          <p class="hint">{sl.importMergeHint}</p>
          <div class="stack">
            <button
              class="btn btn-primary"
              type="button"
              onClick={() => {
                const added = importMerge(incoming);
                setIncoming(null);
                toast(sl.importedMerge(added.routes, added.locations, added.layouts));
              }}
            >
              {sl.importMerge}
            </button>
            <button class="btn btn-secondary" type="button" onClick={() => setConfirmReplace(true)}>
              {sl.importReplaceAll}
            </button>
            <button class="btn btn-secondary" type="button" onClick={() => setIncoming(null)}>
              {sl.cancel}
            </button>
          </div>
        </Sheet>
      )}
      {incoming && confirmReplace && (
        <Confirm
          text={sl.confirmImport}
          confirmLabel={sl.importReplace}
          onCancel={() => setConfirmReplace(false)}
          onConfirm={() => {
            importReplace(incoming);
            setIncoming(null);
            setConfirmReplace(false);
            toast(sl.imported);
          }}
        />
      )}
    </div>
  );
}
