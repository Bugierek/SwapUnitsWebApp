'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, ArrowUpRight, Check, Copy, Info, Lightbulb, TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getCategoryPath } from '@/lib/category-info';
import { copyTextToClipboard } from '@/lib/copy-to-clipboard';
import { unitData } from '@/lib/unit-data';
import {
  COMPOUND_CONVERTER_PATH,
  compoundConverterHref,
  convertCompoundQuery,
  describeAnswerParts,
  describeAtomValue,
  describeWorking,
  formatCompoundNumber,
  formatCompoundPlain,
  listCategoryValues,
  renderDimensions,
  type CompoundAnswer,
  type CompoundAtom,
  type CompoundError,
} from '@/lib/compound-units';

// Hands ?q= to the converter after hydration and on client-side navigation (the examples link
// to ?q=...). The page is pre-rendered without search params; the Suspense boundary around this
// keeps any bailout confined to it, as on the pair pages. `onQuery` must be stable.
function QueryFromUrl({ onQuery }: { onQuery: (query: string) => void }) {
  const query = useSearchParams().get('q');
  React.useEffect(() => {
    if (query !== null) onQuery(query);
  }, [query, onQuery]);
  return null;
}

function CopyButton({ value }: { value: number }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="h-9 w-9 shrink-0 rounded-full"
      aria-label={copied ? 'Copied' : 'Copy the result'}
      onClick={async () => {
        if (await copyTextToClipboard(formatCompoundPlain(value))) {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        }
      }}
    >
      {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
    </Button>
  );
}

/** Each unit used, with what was typed for it where that differs ("KN" for kN). */
function readAsRows(answer: CompoundAnswer): Map<CompoundAtom, Set<string>> {
  const rows = new Map<CompoundAtom, Set<string>>();
  [answer.from, answer.to].forEach((side) => {
    if (!side) return;
    side.terms.forEach(({ atom }) => rows.set(atom, rows.get(atom) ?? new Set()));
    side.readings.forEach(({ typed, atoms }) => {
      atoms.forEach((atom) => rows.set(atom, rows.get(atom) ?? new Set()));
      if (atoms.length === 1 && typed !== atoms[0].symbol) rows.get(atoms[0])!.add(typed);
    });
  });
  return rows;
}

function AnswerCard({ answer }: { answer: CompoundAnswer }) {
  const working = describeWorking(answer);
  const rows = Array.from(readAsRows(answer));
  const categoryValues = answer.to ? [] : listCategoryValues(answer);
  const { left, right } = describeAnswerParts(answer);

  return (
    <div className="space-y-5 rounded-2xl border border-border/60 bg-card px-5 py-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          <span className="text-muted-foreground">{left}</span>
          {right && (
            <>
              {' = '}
              <span className="break-words">{right}</span>
            </>
          )}
        </p>
        {right && <CopyButton value={answer.result ?? answer.siValue} />}
      </div>

      <div className="space-y-2 text-sm text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">Dimension: </span>
          {answer.quantity ? answer.quantity.name : 'no common name'}
          {renderDimensions(answer.from.dims) && <> · {renderDimensions(answer.from.dims)}</>}
        </p>
        {answer.categories.length > 0 && (
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            {answer.categories.map((category) => (
              <Link
                key={category}
                href={getCategoryPath(category)}
                className="inline-flex items-center gap-1 font-semibold text-primary-text transition hover:text-primary-text/80"
              >
                {unitData[category].name} converter
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ))}
          </p>
        )}
      </div>

      {answer.notes.length > 0 && (
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          {answer.notes.map((note) => (
            <li key={note} className="flex gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary-text" aria-hidden="true" />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      )}

      {categoryValues.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">In {unitData[answer.categories[0]].name.toLowerCase()} units</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {categoryValues.map((row) => (
              <li key={row.symbol}>
                <Link
                  href={compoundConverterHref(`${formatCompoundPlain(answer.value)} ${answer.from.display} to ${row.symbol}`)}
                  scroll={false}
                  className="flex items-baseline justify-between gap-3 rounded-xl border border-border/60 px-3 py-2 text-sm transition hover:border-primary/60 hover:bg-primary/5"
                >
                  <span className="font-medium text-foreground">
                    {formatCompoundNumber(row.value)} {row.symbol}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">{row.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {working.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">How it&apos;s worked out</h3>
          <ol className="space-y-1 rounded-xl bg-[hsl(var(--control-background))] px-4 py-3 text-sm text-foreground">
            {working.map((line) => (
              <li key={line} className="break-words tabular-nums">
                {line}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Read as</h3>
        <ul className="divide-y divide-border/60 rounded-xl border border-border/60 text-sm">
          {rows.map(([atom, typed]) => (
            <li key={atom.symbol} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-3 py-2">
              <span>
                <span className="font-semibold text-foreground">{atom.symbol}</span>{' '}
                <span className="text-muted-foreground">
                  {atom.name}
                  {typed.size > 0 && <> (typed as {Array.from(typed).join(', ')})</>}
                </span>
              </span>
              <span className="tabular-nums text-muted-foreground">{describeAtomValue(atom)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ErrorCard({ error }: { error: CompoundError }) {
  const { suggestion } = error;
  return (
    <div className="space-y-4 rounded-2xl border border-destructive/40 bg-card px-5 py-5 shadow-sm">
      <p className="flex gap-2 text-sm text-foreground">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
        <span>{error.message}</span>
      </p>
      {error.category && (
        <Link
          href={getCategoryPath(error.category)}
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary-text transition hover:text-primary-text/80"
        >
          {unitData[error.category].name} converter
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
      {suggestion && (
        <div className="space-y-1 rounded-xl bg-primary/5 px-4 py-3 text-sm">
          <p className="flex gap-2 text-muted-foreground">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary-text" aria-hidden="true" />
            <span>{suggestion.reason}</span>
          </p>
          <Link
            href={compoundConverterHref(suggestion.query)}
            scroll={false}
            className="inline-flex items-center gap-1 pl-6 font-semibold text-primary-text transition hover:text-primary-text/80"
          >
            {suggestion.preview}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      )}
    </div>
  );
}

export function CompoundConverter() {
  const router = useRouter();
  const [input, setInput] = React.useState('');
  const [submitted, setSubmitted] = React.useState<string | null>(null);

  const trimmed = input.trim();
  const result = React.useMemo(() => (trimmed ? convertCompoundQuery(trimmed) : null), [trimmed]);
  // Errors wait for Enter (or a ?q= link), so half-typed text doesn't flash a warning.
  const showError = submitted !== null && submitted.trim() === trimmed;

  const applyQuery = React.useCallback((query: string) => {
    setInput(query);
    setSubmitted(query);
  }, []);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(trimmed);
    router.replace(trimmed ? compoundConverterHref(trimmed) : COMPOUND_CONVERTER_PATH, { scroll: false });
  };

  return (
    <div className="space-y-6">
      <React.Suspense fallback={null}>
        <QueryFromUrl onQuery={applyQuery} />
      </React.Suspense>

      <form onSubmit={handleSubmit} className="space-y-2 rounded-3xl border border-border/60 bg-card px-5 py-5 shadow-lg">
        <label htmlFor="compound-query" className="text-sm font-semibold text-foreground">
          Unit expression
        </label>
        <div className="flex gap-2">
          <Input
            id="compound-query"
            name="q"
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="3 kN/cm² to MPa"
            // Case changes the unit (mW vs MW), so phones mustn't capitalise or correct it.
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            className="h-11 rounded-xl border border-border/60 bg-[hsl(var(--control-background))] px-3 text-base font-medium text-foreground placeholder:text-muted-foreground focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/20 sm:text-sm"
          />
          <Button type="submit" className="h-11 shrink-0 rounded-xl px-4">
            Convert
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Multiply with · * or a space, divide with / or &quot;per&quot;, powers as m2, m^2 or m². Leave out
          &quot;to …&quot; to see the value in SI and related units.
        </p>
      </form>

      <div aria-live="polite" className="space-y-4">
        {result?.ok && (
          <>
            {result.ambiguity && (
              <p className="flex gap-2 rounded-2xl border border-border/60 bg-primary/5 px-4 py-3 text-sm text-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary-text" aria-hidden="true" />
                <span>
                  {result.ambiguity} Both readings are worked out below; type the symbol in its exact case to pick one.
                </span>
              </p>
            )}
            {result.answers.map((answer) => (
              <AnswerCard key={`${answer.from.display}:${answer.to?.display ?? ''}:${answer.siValue}`} answer={answer} />
            ))}
          </>
        )}
        {result && !result.ok && showError && <ErrorCard error={result.error} />}
        {result && !result.ok && !showError && (
          <p className="px-1 text-sm text-muted-foreground">Press Enter to check this expression.</p>
        )}
      </div>

    </div>
  );
}
