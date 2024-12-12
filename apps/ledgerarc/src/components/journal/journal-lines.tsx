import { CheckCircle2, XCircle } from 'lucide-react';
import type { JournalLineDto } from '@igaming/contracts';
import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from '@igaming/ui';
import { Money } from '@/components/common/money';
import { ShortId } from '@/components/common/short-id';
import { lineTotals } from '@/lib/money';
import { LEDGER_KIND_LABEL } from '@/lib/labels';

export function BalancedPill({
  lines,
  className,
}: {
  lines: Pick<JournalLineDto, 'direction' | 'amountMinor'>[];
  className?: string;
}) {
  const totals = lineTotals(lines);
  return totals.balanced ? (
    <Badge variant="success" className={className}>
      <CheckCircle2 className="h-3 w-3" aria-hidden />
      Balanced ✓
    </Badge>
  ) : (
    <Badge variant="destructive" className={className}>
      <XCircle className="h-3 w-3" aria-hidden />
      Unbalanced
    </Badge>
  );
}

export function JournalLines({
  lines,
  compact = false,
}: {
  lines: JournalLineDto[];
  compact?: boolean;
}) {
  const totals = lineTotals(lines);
  return (
    <div className={cn('rounded-md border border-border bg-background', compact && 'text-xs')}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Account</TableHead>
            <TableHead className="hidden sm:table-cell">Type</TableHead>
            <TableHead className="text-right">Debit</TableHead>
            <TableHead className="text-right">Credit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line) => (
            <TableRow key={line.id}>
              <TableCell>
                <div className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate font-medium">{line.accountName}</span>
                  <ShortId
                    value={line.accountCode}
                    length={line.accountCode.startsWith('WALLET:') ? 15 : 24}
                    label="account code"
                    className="-ml-1 w-fit"
                  />
                </div>
              </TableCell>
              <TableCell className="hidden text-muted-foreground sm:table-cell">
                {LEDGER_KIND_LABEL[line.accountKind] ?? line.accountKind}
              </TableCell>
              <TableCell className="text-right">
                {line.direction === 'DEBIT' ? (
                  <Money minor={line.amountMinor} />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                {line.direction === 'CREDIT' ? (
                  <Money minor={line.amountMinor} />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-muted/40 font-medium hover:bg-muted/40">
            <TableCell colSpan={2}>
              <div className="flex items-center gap-2">
                Totals
                <BalancedPill lines={lines} />
              </div>
            </TableCell>
            <TableCell className="text-right">
              <Money minor={totals.debit.toString()} />
            </TableCell>
            <TableCell className="text-right">
              <Money minor={totals.credit.toString()} />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
