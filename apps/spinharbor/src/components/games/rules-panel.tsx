import type { GameRulesDto } from '@igaming/contracts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from '@igaming/ui';
import { diceMultiplierMilli, diceWinChancePercent } from '@/lib/dice-math';
import { formatMultiplier, formatMultiplierMilli, formatPercent } from '@/lib/format';
import { SymbolGlyph, symbolLabel } from './symbol-glyph';

const EXAMPLE_TARGETS = [5, 10, 25, 50, 75, 90, 95] as const;

function DiceRules({ rules }: { rules: NonNullable<GameRulesDto['dice']> }) {
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div className="rounded-md bg-muted p-3">
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">House edge</dt>
          <dd className="mt-1 font-semibold tabular-nums">
            {formatPercent(rules.houseEdgePercent)}
          </dd>
        </div>
        <div className="rounded-md bg-muted p-3">
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Target range</dt>
          <dd className="mt-1 font-semibold tabular-nums">
            {rules.minTarget} – {rules.maxTarget}
          </dd>
        </div>
        <div className="col-span-2 rounded-md bg-muted p-3">
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Multiplier</dt>
          <dd className="mt-1 font-mono text-sm">{rules.multiplierFormula}</dd>
        </div>
      </dl>
      <p className="text-sm text-muted-foreground">
        The roll is a number from 0.00 to 99.99. “Under” wins when the roll is below your target
        (chance = target %); “over” wins when it is above (chance = 99 − target %). Multipliers are
        rounded down to thousandths.
      </p>
      <div className="overflow-x-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Target</TableHead>
              <TableHead>Under — chance</TableHead>
              <TableHead>Under — multiplier</TableHead>
              <TableHead>Over — chance</TableHead>
              <TableHead>Over — multiplier</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {EXAMPLE_TARGETS.map((target) => (
              <TableRow key={target}>
                <TableCell className="font-medium tabular-nums">{target}</TableCell>
                <TableCell className="tabular-nums">
                  {formatPercent(diceWinChancePercent(target, 'under'))}
                </TableCell>
                <TableCell className="tabular-nums text-brand">
                  {formatMultiplierMilli(diceMultiplierMilli(target, 'under'))}
                </TableCell>
                <TableCell className="tabular-nums">
                  {formatPercent(diceWinChancePercent(target, 'over'))}
                </TableCell>
                <TableCell className="tabular-nums text-brand">
                  {formatMultiplierMilli(diceMultiplierMilli(target, 'over'))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function SlotsPaytable({
  rules,
  compact = false,
  highlight = null,
}: {
  rules: NonNullable<GameRulesDto['slots']>;
  compact?: boolean;
  highlight?: string | null;
}) {
  const totalWeight = rules.symbols.reduce((acc, s) => acc + s.weight, 0);
  return (
    <div className="space-y-5">
      <div>
        <h4 className="mb-2 text-sm font-semibold">Paytable</h4>
        <ul className="divide-y divide-border rounded-md border border-border">
          {rules.paytable.map((row) => (
            <li
              key={row.label}
              className={cn(
                'flex items-center gap-3 px-3 py-2 transition-colors',
                highlight === row.label && 'bg-brand-soft',
              )}
              aria-current={highlight === row.label ? 'true' : undefined}
            >
              <div
                className="flex gap-1"
                aria-label={row.combination.map((c) => symbolLabel(c, rules.symbols)).join(', ')}
              >
                {row.combination.map((symbol, idx) => (
                  <SymbolGlyph
                    key={idx}
                    symbol={symbol}
                    className={compact ? 'h-6 w-6' : 'h-7 w-7'}
                  />
                ))}
              </div>
              <span className="min-w-0 flex-1 truncate text-sm">{row.label}</span>
              <span className="font-semibold tabular-nums text-brand">
                {formatMultiplier(row.multiplier)}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h4 className="mb-2 text-sm font-semibold">Symbol weights</h4>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {rules.symbols.map((symbol) => (
            <li
              key={symbol.key}
              className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm"
            >
              <SymbolGlyph symbol={symbol.key} className="h-6 w-6" />
              <span className="min-w-0 flex-1 truncate">{symbol.label}</span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {formatPercent((symbol.weight / totalWeight) * 100, 1)}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">
          Each reel draws independently with these weights ({totalWeight} total).
        </p>
      </div>
    </div>
  );
}

export function RulesPanel({ rules }: { rules: GameRulesDto }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>How it plays</CardTitle>
        <CardDescription>{rules.summary}</CardDescription>
      </CardHeader>
      <CardContent>
        {rules.dice ? <DiceRules rules={rules.dice} /> : null}
        {rules.slots ? <SlotsPaytable rules={rules.slots} /> : null}
        {!rules.dice && !rules.slots ? (
          <p className="text-sm text-muted-foreground">
            This showcase title publishes no engine rules in the demo.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
