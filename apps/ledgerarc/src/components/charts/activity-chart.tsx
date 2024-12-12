'use client';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';
import type { Minor } from '@igaming/contracts';
import { formatDayLabel, formatMinor } from '@/lib/format';
import { minorToChartValue } from '@/lib/money';

const AXIS_STYLE = { fontSize: 11, fill: 'var(--muted-foreground)' };
const GRID_STROKE = 'var(--border)';

function creditsAxis(value: number): string {
  if (Math.abs(value) >= 1000)
    return `${(value / 1000).toLocaleString('en-GB', { maximumFractionDigits: 1 })}k`;
  return value.toLocaleString('en-GB', { maximumFractionDigits: 0 });
}

interface ChartPoint {
  day: string;
  label: string;
  [series: string]: string | number;
}

type ChartTooltipProps = Pick<TooltipContentProps, 'active' | 'payload' | 'label'> & {
  minorByKey: (day: string, key: string) => Minor | undefined;
};

function ChartTooltip({ active, payload, label, minorByKey }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const day = String(payload[0]?.payload?.day ?? '');
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium">{String(label)}</p>
      <ul className="space-y-0.5">
        {payload.map((item) => {
          const minor = minorByKey(day, String(item.dataKey));
          return (
            <li key={String(item.dataKey)} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span
                  className="h-2 w-2 rounded-sm"
                  style={{ background: item.color }}
                  aria-hidden
                />
                {item.name}
              </span>
              <span className="tabular-nums font-medium">
                {minor !== undefined ? formatMinor(minor) : String(item.value)} DMO
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export interface StackedSeries {
  key: string;
  name: string;
  color: string;
  stackId?: string;
}

export interface DailyRow {
  day: string;
  values: Record<string, Minor>;
}

/** Stacked bars of daily minor-unit amounts; `series` keys index into each row's `values`. */
export function DailyStackedBars({
  rows,
  series,
  height = 260,
}: {
  rows: DailyRow[];
  series: StackedSeries[];
  height?: number;
}) {
  const data: ChartPoint[] = rows.map((row) => ({
    day: row.day,
    label: formatDayLabel(row.day),
    ...Object.fromEntries(series.map((s) => [s.key, minorToChartValue(row.values[s.key] ?? '0')])),
  }));
  const byDay = new Map(rows.map((row) => [row.day, row.values]));
  const minorByKey = (day: string, key: string) => byDay.get(day)?.[key];

  return (
    <div style={{ height }} role="img" aria-label="Daily activity chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          barCategoryGap="25%"
        >
          <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tick={AXIS_STYLE}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <YAxis
            tick={AXIS_STYLE}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={creditsAxis}
          />
          <Tooltip
            cursor={{ fill: 'var(--accent)', opacity: 0.5 }}
            content={({ active, payload, label }) => (
              <ChartTooltip
                active={active}
                payload={payload}
                label={label}
                minorByKey={minorByKey}
              />
            )}
          />
          <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
          {series.map((s, index) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.name}
              fill={s.color}
              stackId={s.stackId}
              radius={index === series.length - 1 || s.stackId === undefined ? [3, 3, 0, 0] : 0}
              maxBarSize={36}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface LineSeries {
  key: string;
  name: string;
  color: string;
}

export function DailyLines({
  rows,
  series,
  height = 240,
}: {
  rows: DailyRow[];
  series: LineSeries[];
  height?: number;
}) {
  const data: ChartPoint[] = rows.map((row) => ({
    day: row.day,
    label: formatDayLabel(row.day),
    ...Object.fromEntries(series.map((s) => [s.key, minorToChartValue(row.values[s.key] ?? '0')])),
  }));
  const byDay = new Map(rows.map((row) => [row.day, row.values]));
  const minorByKey = (day: string, key: string) => byDay.get(day)?.[key];

  return (
    <div style={{ height }} role="img" aria-label="Daily trend chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tick={AXIS_STYLE}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <YAxis
            tick={AXIS_STYLE}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={creditsAxis}
          />
          <Tooltip
            cursor={{ stroke: 'var(--border)' }}
            content={({ active, payload, label }) => (
              <ChartTooltip
                active={active}
                payload={payload}
                label={label}
                minorByKey={minorByKey}
              />
            )}
          />
          <Legend iconType="plainline" iconSize={12} wrapperStyle={{ fontSize: 11 }} />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              dot={{ r: 2.5, strokeWidth: 0, fill: s.color }}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
