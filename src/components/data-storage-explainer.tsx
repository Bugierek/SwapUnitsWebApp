import Link from 'next/link';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { buildConversionPairUrl } from '@/lib/conversion-pairs';
import { unitData } from '@/lib/unit-data';

// Decimal vs binary storage units, shown on the Data Storage category page and on every Data
// Storage pair page. Plain markup with no hooks, so it is part of the server-rendered HTML.
// Facts checked against NIST ("Prefixes for binary multiples": IEC approval in December 1998,
// 1 MB = 10⁶ B, 1 MiB = 2²⁰ B), Apple Support 102119 (drive makers count in decimal; only
// OS X Leopard and earlier / iOS 10 and earlier reported binary) and `man df` (-h powers of 1024,
// -H powers of 1000).

const PREFIX_PAIRS = [
  { decimal: 'KB', binary: 'KiB' },
  { decimal: 'MB', binary: 'MiB' },
  { decimal: 'GB', binary: 'GiB' },
  { decimal: 'TB', binary: 'TiB' },
] as const;

const storageUnits = unitData['Data Storage'].units;
const unitBySymbol = (symbol: string) => storageUnits.find((unit) => unit.symbol === symbol);
const bytesOf = (symbol: string): number => unitBySymbol(symbol)?.factor ?? Number.NaN;
const formatBytes = (value: number): string => value.toLocaleString('en-US');
const isBinaryUnit = (symbol: string): boolean => /^[KMGT]iB$/.test(symbol);

const describeUnit = (symbol: string): string => {
  const unit = unitBySymbol(symbol);
  const name = unit ? `${unit.name} (${symbol})` : symbol;
  if (symbol === 'B') return `${name} is the same in both systems`;
  const bytes = formatBytes(bytesOf(symbol));
  return isBinaryUnit(symbol)
    ? `${name} is a binary unit of ${bytes} bytes`
    : `${name} is a decimal unit of ${bytes} bytes`;
};

type DataStorageExplainerProps = {
  /** On a pair page, the two units of that page, described in the opening paragraph. */
  fromSymbol?: string;
  toSymbol?: string;
};

export function DataStorageExplainer({ fromSymbol, toSymbol }: DataStorageExplainerProps) {
  const pairLine =
    fromSymbol && toSymbol ? `On this page, ${describeUnit(fromSymbol)}, and ${describeUnit(toSymbol)}.` : null;

  return (
    <section
      aria-labelledby="storage-units-explainer"
      className="space-y-6 rounded-3xl border border-border/60 bg-card px-6 py-6 shadow-sm"
    >
      <div className="space-y-2">
        <h2 id="storage-units-explainer" className="text-xl font-semibold text-foreground">
          KB or KiB? Decimal and binary storage units
        </h2>
        <p className="text-sm text-muted-foreground">
          The same number of bytes can be written as 1 TB or as 931.32 GiB. Storage is counted in two
          systems: one goes up by 1,000 at each prefix, the other by 1,024.
        </p>
        {pairLine && <p className="text-sm font-medium text-foreground">{pairLine}</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2 rounded-2xl border border-border/60 bg-background/80 px-4 py-4">
          <h3 className="text-sm font-semibold text-foreground">Decimal (SI): steps of 1,000</h3>
          <p className="font-mono text-xs text-muted-foreground">KB · MB · GB · TB</p>
          <p className="text-sm text-muted-foreground">
            Kilo means 1,000 here, exactly as in kilometer or kilogram. Makers of hard drives, SSDs, USB sticks
            and memory cards label capacity this way, and macOS (since OS X 10.6 Snow Leopard) and iOS (since
            iOS 11) show file and disk sizes the same way.
          </p>
        </div>
        <div className="space-y-2 rounded-2xl border border-border/60 bg-background/80 px-4 py-4">
          <h3 className="text-sm font-semibold text-foreground">Binary (IEC): steps of 1,024</h3>
          <p className="font-mono text-xs text-muted-foreground">KiB · MiB · GiB · TiB</p>
          <p className="text-sm text-muted-foreground">
            Kibi means 2¹⁰ = 1,024. RAM is sized this way, and Windows File Explorer and the{' '}
            <code className="whitespace-nowrap font-mono text-xs">df -h</code> command count this way too, although Windows still
            labels the results KB, MB and GB.
          </p>
        </div>
      </div>

      {/* Three columns with the byte count under each name, so it fits a phone without scrolling. */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-2 sm:px-4">Decimal</TableHead>
            <TableHead className="px-2 sm:px-4">Binary</TableHead>
            <TableHead className="hidden text-right sm:table-cell">Binary is larger by</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {PREFIX_PAIRS.map(({ decimal, binary }) => {
            const decimalBytes = bytesOf(decimal);
            const binaryBytes = bytesOf(binary);
            const gap = `${((binaryBytes / decimalBytes - 1) * 100).toFixed(2)}%`;
            return (
              <TableRow key={decimal}>
                <TableCell className="px-2 align-top sm:px-4">
                  <span className="block font-medium text-foreground">
                    1 {unitBySymbol(decimal)?.name.toLowerCase()} ({decimal})
                  </span>
                  <span className="block font-mono text-xs text-muted-foreground">{formatBytes(decimalBytes)} bytes</span>
                </TableCell>
                <TableCell className="px-2 align-top sm:px-4">
                  <span className="block font-medium text-foreground">
                    1 {unitBySymbol(binary)?.name.toLowerCase()} ({binary})
                  </span>
                  <span className="block font-mono text-xs text-muted-foreground">{formatBytes(binaryBytes)} bytes</span>
                  {/* Phones: the gap goes here instead of in its own column. */}
                  <span className="block text-xs text-muted-foreground sm:hidden">{gap} larger</span>
                </TableCell>
                <TableCell className="hidden text-right align-top text-sm text-muted-foreground sm:table-cell">
                  {gap}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <div className="space-y-2">
        <h3 className="text-base font-semibold text-foreground">Why 1,024?</h3>
        <p className="text-sm text-muted-foreground">
          Computers address memory in binary. Every extra address bit doubles the number of locations that can be
          reached, so memory sizes come in powers of two. 2¹⁰ = 1,024 is close to 1,000, so early computing borrowed
          &ldquo;kilo&rdquo; for it, and &ldquo;megabyte&rdquo; ended up meaning 1,000,000 bytes to some people and
          1,048,576 to others.
        </p>
        <p className="text-sm text-muted-foreground">
          In December 1998 the International Electrotechnical Commission (IEC) approved separate prefixes for the
          binary meaning: kibi (Ki), mebi (Mi), gibi (Gi), tebi (Ti) and larger ones such as pebi (Pi). Each name
          blends the decimal prefix with &ldquo;binary&rdquo;, so kilo + binary gives kibi. With them, KB keeps its
          SI meaning of 1,000 bytes and KiB always means 1,024. NIST and IEC 80000-13 use this system, but many
          programs still use the older labels, so check which system a number is in.
        </p>
      </div>

      <div className="space-y-2">
        <h3 className="text-base font-semibold text-foreground">&ldquo;My 2 TB drive only shows 1.82 TB&rdquo;</h3>
        <p className="text-sm text-muted-foreground">
          A drive sold as 2 TB holds about 2,000,000,000,000 bytes. Divide that by 1,024 four times and you get
          1.82 TiB, which Windows displays as &ldquo;1.82 TB&rdquo;. A Mac shows the same drive as 2 TB. No space is
          missing: both numbers count the same bytes. The gap grows at every prefix, from 2.4% at kilo to almost 10%
          at tera, which is why a 1 TB drive shows up as about 931 GB in Windows. Formatting and the operating system
          then take a little of the space as well.
        </p>
      </div>

      <div className="space-y-2">
        <h3 className="text-base font-semibold text-foreground">Quick rules</h3>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
          <li>Drive and SSD packaging, and file sizes on a Mac or iPhone: decimal (KB, MB, GB, TB).</li>
          <li>
            RAM, Windows File Explorer and <code className="whitespace-nowrap font-mono text-xs">df -h</code>: binary, even when the
            label says GB. 16 GB of RAM is 16 GiB, or 17,179,869,184 bytes. (<code className="whitespace-nowrap font-mono text-xs">df -H</code>{' '}
            shows decimal sizes instead.)
          </li>
          <li>
            Comparing a drive label with what your computer reports? Convert both to the same system first, for
            example{' '}
            <Link
              href={buildConversionPairUrl('Data Storage', 'TB', 'GiB')}
              className="font-medium text-primary-text underline-offset-2 hover:underline"
            >
              TB to GiB
            </Link>{' '}
            or{' '}
            <Link
              href={buildConversionPairUrl('Data Storage', 'GB', 'GiB')}
              className="font-medium text-primary-text underline-offset-2 hover:underline"
            >
              GB to GiB
            </Link>
            .
          </li>
          <li>Small files show the gap too: a 1,500-byte file is 1.5 KB or 1.46 KiB.</li>
        </ul>
      </div>
    </section>
  );
}
