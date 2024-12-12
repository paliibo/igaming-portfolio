'use client';
import * as React from 'react';
import { Plus } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { createEventSchema } from '@igaming/contracts';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@igaming/ui';
import { describeError } from '@/lib/errors';
import { isoToLocalInput, localInputToIso } from '@/lib/format';
import { useCreateEvent } from '@/lib/operator';
import { useSports } from '@/lib/sportsbook';

const formSchema = createEventSchema.omit({ startsAt: true }).extend({
  startsAt: z
    .string()
    .min(1, 'Pick a start time')
    .refine((value) => localInputToIso(value) !== null, 'Invalid date'),
});
type FormInput = z.input<typeof formSchema>;
type FormOutput = z.output<typeof formSchema>;

function defaultStart(): string {
  const date = new Date(Date.now() + 2 * 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  return isoToLocalInput(date.toISOString());
}

export function CreateEventDialog() {
  const [open, setOpen] = React.useState(false);
  const sports = useSports();
  const create = useCreateEvent();
  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sportSlug: '',
      competition: '',
      homeTeam: '',
      awayTeam: '',
      startsAt: defaultStart(),
      featured: false,
    },
  });
  const { errors } = form.formState;
  const sportSlug = useWatch({ control: form.control, name: 'sportSlug' });
  const featured = useWatch({ control: form.control, name: 'featured' });

  const onSubmit = form.handleSubmit(async (values) => {
    const startsAt = localInputToIso(values.startsAt);
    if (!startsAt) return;
    try {
      const event = await create.mutateAsync({ ...values, startsAt });
      toast.success(`Created ${event.homeTeam} vs ${event.awayTeam}`);
      form.reset({
        sportSlug: values.sportSlug,
        competition: values.competition,
        homeTeam: '',
        awayTeam: '',
        startsAt: defaultStart(),
        featured: false,
      });
      setOpen(false);
    } catch (error) {
      form.setError('root', { message: describeError(error, 'Could not create the event') });
    }
  });

  const field = (
    name: 'competition' | 'homeTeam' | 'awayTeam',
    label: string,
    placeholder: string,
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={`create-${name}`}>{label}</Label>
      <Input
        id={`create-${name}`}
        placeholder={placeholder}
        aria-invalid={Boolean(errors[name])}
        {...form.register(name)}
      />
      {errors[name] ? <p className="text-xs text-destructive">{errors[name]?.message}</p> : null}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus aria-hidden /> New event
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create fixture</DialogTitle>
          <DialogDescription>
            A default market set (match winner, totals, handicap and more) is generated
            automatically.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="create-sport">Sport</Label>
            <Select
              value={sportSlug}
              onValueChange={(value) => form.setValue('sportSlug', value, { shouldValidate: true })}
            >
              <SelectTrigger id="create-sport" aria-invalid={Boolean(errors.sportSlug)}>
                <SelectValue
                  placeholder={sports.isLoading ? 'Loading sports…' : 'Choose a sport'}
                />
              </SelectTrigger>
              <SelectContent>
                {(sports.data ?? []).map((sport) => (
                  <SelectItem key={sport.id} value={sport.slug}>
                    {sport.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.sportSlug ? (
              <p className="text-xs text-destructive">{errors.sportSlug.message}</p>
            ) : null}
          </div>
          {field('competition', 'Competition', 'Demo Premier League')}
          <div className="grid gap-4 sm:grid-cols-2">
            {field('homeTeam', 'Home team', 'Kingsport City')}
            {field('awayTeam', 'Away team', 'Fenwick Rangers')}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="create-startsAt">Start time</Label>
            <Input
              id="create-startsAt"
              type="datetime-local"
              aria-invalid={Boolean(errors.startsAt)}
              {...form.register('startsAt')}
            />
            {errors.startsAt ? (
              <p className="text-xs text-destructive">{errors.startsAt.message}</p>
            ) : null}
          </div>
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <Label htmlFor="create-featured" className="cursor-pointer">
              Feature on the home page
            </Label>
            <Switch
              id="create-featured"
              checked={featured ?? false}
              onCheckedChange={(checked) => form.setValue('featured', checked)}
            />
          </div>
          {errors.root ? (
            <p
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {errors.root.message}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending}>
              Create event
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
