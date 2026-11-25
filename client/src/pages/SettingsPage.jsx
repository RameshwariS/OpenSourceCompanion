import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUpdateProfile } from '../hooks/useProfile';
import FormField from '../components/FormField';
import { useEffect, useState as useLocalState } from 'react';
import * as aiApi from '../api/ai';

const textarea =
  'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-900';

export default function SettingsPage() {
  const { user } = useAuth();
  const update = useUpdateProfile();

  const [form, setForm] = useState({
    name: user.name,
    bio: user.bio ?? '',
    skills: (user.skills ?? []).join(', '),
    location: user.location ?? '',
    portfolioUrl: user.portfolioUrl ?? '',
    linkedinUrl: user.linkedinUrl ?? '',
  });
  const [aiKey, setAiKey] = useLocalState('');
  const [provider, setProvider] = useLocalState('openai');
  const [model, setModel] = useLocalState('gpt-4o-mini');
  const [keyStatus, setKeyStatus] = useLocalState({ configured: false });
  const [aiMessage, setAiMessage] = useLocalState('');
  useEffect(() => { aiApi.getAIKey().then(setKeyStatus).catch(() => {}); }, [setKeyStatus]);
  async function saveLLMKey(e) {
    e.preventDefault(); setAiMessage('');
    try { setKeyStatus(await aiApi.saveAIKey({ provider, model, apiKey: aiKey })); setAiKey(''); setAiMessage('Key validated and saved.'); }
    catch (err) { setAiMessage(err.response?.data?.message || 'Could not save key.'); }
  }
  async function removeLLMKey() { await aiApi.deleteAIKey(); setKeyStatus({ configured: false }); setAiMessage('Key removed.'); }
  function changeProvider(value) { setProvider(value); setModel(({ openai: 'gpt-4o-mini', gemini: 'gemini-2.0-flash', anthropic: 'claude-3-5-haiku-latest' })[value]); }
  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  function handleSubmit(e) {
    e.preventDefault();
    update.mutate({
      ...form,
      skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
    });
  }

  return (
    <section className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold tracking-tight">Edit profile</h1>
      <p className="mt-1 text-sm text-slate-500">
        Everything here is public on your{' '}
        <Link to={`/users/${user.username}`} className="text-emerald-500 hover:underline">
          profile page
        </Link>{' '}
        except your email, which is never shown.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <FormField id="name" label="Name" required maxLength={80} value={form.name} onChange={change} />

        <div>
          <label htmlFor="bio" className="block text-sm font-medium">Bio</label>
          <textarea id="bio" name="bio" rows={4} maxLength={500} value={form.bio} onChange={change} className={textarea} />
          <p className="mt-1 text-xs text-slate-500">{form.bio.length}/500</p>
        </div>

        <FormField id="skills" label="Skills (comma separated, max 15)" placeholder="Go, Docker, React" value={form.skills} onChange={change} />
        <FormField id="location" label="Location (optional)" maxLength={100} value={form.location} onChange={change} />
        <FormField id="portfolioUrl" label="Portfolio URL" type="url" placeholder="https://" value={form.portfolioUrl} onChange={change} />
        <FormField id="linkedinUrl" label="LinkedIn URL" type="url" placeholder="https://www.linkedin.com/in/…" value={form.linkedinUrl} onChange={change} />

        <button
          type="submit"
          disabled={update.isPending}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
        >
          {update.isPending ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      <section className="mt-10 border-t border-slate-200 pt-6 dark:border-slate-800">
        <h2 className="text-xl font-semibold">AI provider key</h2>
        <p className="mt-1 text-sm text-slate-500">Your key is encrypted before storage and only a masked version is shown.</p>
        {keyStatus.configured && <p className="mt-3 text-sm">Saved {keyStatus.provider} key: <code>{keyStatus.maskedKey}</code> · {keyStatus.model}</p>}
        <form onSubmit={saveLLMKey} className="mt-4 space-y-3">
          <label className="block text-sm font-medium">Provider
            <select value={provider} onChange={(e) => changeProvider(e.target.value)} className={textarea}>
              <option value="openai">OpenAI</option><option value="gemini">Google Gemini</option><option value="anthropic">Anthropic Claude</option>
            </select>
          </label>
          <FormField id="llm-model" label="Model" value={model} onChange={(e) => setModel(e.target.value)} maxLength={120} />
          <FormField id="llm-api-key" label="API key" type="password" autoComplete="new-password" value={aiKey} onChange={(e) => setAiKey(e.target.value)} required />
          <div className="flex gap-3"><button className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white">Validate and save</button>
            {keyStatus.configured && <button type="button" onClick={removeLLMKey} className="rounded-md border px-4 py-2 text-sm">Remove key</button>}</div>
          {aiMessage && <p role="status" className="text-sm text-slate-600">{aiMessage}</p>}
        </form>
      </section>
    </section>
  );
}
