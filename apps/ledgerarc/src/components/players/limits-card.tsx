'use client';
import * as React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { LIMIT_TYPES, type LimitType, type PlayerLimitDto } from '@igaming/contracts';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from '@igaming/ui';
import { useSetLimit } from '@/lib/api/admin';
import { formatCredits, formatDateTime, formatMinor, parseCreditsInput } from '@/lib/format';
import { LIMIT_DESCRIPTION, LIMIT_LABEL } from '@/lib/labels';
import { usagePercent } from '@/lib/money';
import { Money } from '@/components/common/money';

function LimitDialog({
  playerId,
  type,
  existing,
  open,
  onOpenChange,
}: {
  playerId: string;
  type: LimitType;
  existing: PlayerLimitDto | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const setLimit = useSetLimit(playerId);
  const [amount, setAmount] = React.useState(
    existing ? formatMinor(existing.amountMinor).replace(/,/g, '') : '',
  );
  const [error, setError] = React.useState<string | null>(null);
  const parsed = parseCreditsInput(amount);
  const invalid = amount.trim() !== '' && (parsed === null || BigInt(parsed) === 0n);

  const close = (next: boolean) => {
    if (!next) {
      setAmount(existing ? formatMinor(existing.amountMinor).replace(/,/g, '') : '');
      setError(null);
    }
    onOpenChange(next);
  };

  const save = (amountMinor: string | null) => {
    setError(null);
    setLimit.mutate(
      { type, amountMinor },
      {
        onSuccess: () => {
          toast.success(
            amountMinor === null
              ? `${LIMIT_LABEL[type]} limit removed`
              : `${LIMIT_LABEL[type]} limit set to ${formatCredits(amountMinor)}`,
          );
          close(false);
        },
        onError: (err) => setError(err.message),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {existing ? 'Edit' : 'Set'} {LIMIT_LABEL[type].toLowerCase()} limit
          </DialogTitle>
          <DialogDescription>{LIMIT_DESCRIPTION[type]}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (parsed && BigInt(parsed) > 0n) save(parsed);
          }}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-1.5">
            <Label htmlFor={`limit-${type}`}>Limit per day (DMO credits)</Label>
            <Input
              id={`limit-${type}`}
              inputMode="decimal"
              placeholder="500.00"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              aria-invalid={invalid}
              aria-describedby={`limit-${type}-hint`}
              autoFocus
            />
            <p
              id={`limit-${type}-hint`}
              className={cn('text-xs', invalid ? 'text-destructive' : 'text-muted-foreground')}
            >
              {invalid
                ? 'Enter a positive amount with up to two decimals.'
                : parsed
                  ? `Will be stored as ${formatCredits(parsed)}.`
                  : 'Up to two decimal places.'}
            </p>
            {existing ? (
              <p className="text-xs text-muted-foreground">
                Used today:{' '}
                <Money minor={existing.usedTodayMinor} currency className="text-foreground" /> ·
                last changed {formatDateTime(existing.updatedAt)}
              </p>
            ) : null}
          </div>
          {error ? (
            <p
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}
          <DialogFooter className="sm:justify-between">
            {existing ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => save(null)}
                disabled={setLimit.isPending}
              >
                <Trash2 aria-hidden />
                Remove limit
              </Button>
            ) : (
              <span />
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                loading={setLimit.isPending}
                disabled={!parsed || BigInt(parsed) === 0n}
              >
                Save limit
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function LimitsCard({ playerId, limits }: { playerId: string; limits: PlayerLimitDto[] }) {
  const [editing, setEditing] = React.useState<LimitType | null>(null);
  const byType = new Map(limits.map((limit) => [limit.type, limit]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Responsible gaming limits</CardTitle>
        <CardDescription>
          Daily caps enforced by the API on top-ups, stakes and losses. Usage resets at midnight
          UTC.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 sm:px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4 sm:pl-5">Limit</TableHead>
              <TableHead className="text-right">Cap</TableHead>
              <TableHead className="min-w-48">Used today</TableHead>
              <TableHead className="pr-4 text-right sm:pr-5">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {LIMIT_TYPES.map((type) => {
              const limit = byType.get(type);
              const pct = limit ? usagePercent(limit.usedTodayMinor, limit.amountMinor) : 0;
              return (
                <TableRow key={type}>
                  <TableCell className="pl-4 sm:pl-5">
                    <div className="flex flex-col leading-tight">
                      <span className="font-medium">{LIMIT_LABEL[type]}</span>
                      <span className="hidden text-xs text-muted-foreground lg:inline">
                        {LIMIT_DESCRIPTION[type]}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {limit ? (
                      <Money minor={limit.amountMinor} currency className="font-medium" />
                    ) : (
                      <span className="text-muted-foreground">No limit</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {limit ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <Money minor={limit.usedTodayMinor} />
                          <span
                            className={cn(
                              'tabular-nums',
                              pct >= 100
                                ? 'text-destructive'
                                : pct >= 80
                                  ? 'text-warning'
                                  : 'text-muted-foreground',
                            )}
                          >
                            {pct}%
                          </span>
                        </div>
                        <div
                          className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                          role="progressbar"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={pct}
                          aria-label={`${LIMIT_LABEL[type]} used today`}
                        >
                          <div
                            className={cn(
                              'h-full rounded-full transition-[width]',
                              pct >= 100
                                ? 'bg-destructive'
                                : pct >= 80
                                  ? 'bg-warning'
                                  : 'bg-primary',
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="pr-4 text-right sm:pr-5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditing(type)}
                    >
                      <Pencil aria-hidden />
                      {limit ? 'Edit' : 'Set'}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
      {editing ? (
        <LimitDialog
          key={editing}
          playerId={playerId}
          type={editing}
          existing={byType.get(editing)}
          open
          onOpenChange={(open) => !open && setEditing(null)}
        />
      ) : null}
    </Card>
  );
}
