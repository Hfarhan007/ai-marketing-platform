import { languages } from './languages';
import { setLanguage, useLanguage } from './config';

export function LanguageSelector() {
  const language = useLanguage();
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="sr-only">Language</span>
      <select
        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900"
        value={language}
        onChange={(event) => {
          const selected = languages.find((item) => item.code === event.target.value);
          if (selected) setLanguage(selected.code);
        }}
      >
        {languages.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
      </select>
    </label>
  );
}
