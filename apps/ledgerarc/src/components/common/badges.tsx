import type {
  BetStatus,
  JournalKind,
  KycStatus,
  PlayerStatus,
  RiskAlertStatus,
  RiskSeverity,
} from '@igaming/contracts';
import { Badge } from '@igaming/ui';
import { humanize } from '@/lib/format';
import {
  ALERT_STATUS_TONE,
  BET_STATUS_TONE,
  JOURNAL_KIND_LABEL,
  JOURNAL_KIND_TONE,
  KYC_LABEL,
  KYC_TONE,
  PLAYER_STATUS_LABEL,
  PLAYER_STATUS_TONE,
  SEVERITY_TONE,
} from '@/lib/labels';

export function PlayerStatusBadge({ status }: { status: PlayerStatus }) {
  return <Badge variant={PLAYER_STATUS_TONE[status]}>{PLAYER_STATUS_LABEL[status]}</Badge>;
}

export function KycBadge({ status }: { status: KycStatus }) {
  return <Badge variant={KYC_TONE[status]}>{KYC_LABEL[status]}</Badge>;
}

export function BetStatusBadge({ status }: { status: BetStatus }) {
  return <Badge variant={BET_STATUS_TONE[status]}>{humanize(status)}</Badge>;
}

export function SeverityBadge({ severity }: { severity: RiskSeverity }) {
  return <Badge variant={SEVERITY_TONE[severity]}>{humanize(severity)}</Badge>;
}

export function AlertStatusBadge({ status }: { status: RiskAlertStatus }) {
  return <Badge variant={ALERT_STATUS_TONE[status]}>{humanize(status)}</Badge>;
}

export function KindBadge({ kind }: { kind: JournalKind }) {
  return <Badge variant={JOURNAL_KIND_TONE[kind]}>{JOURNAL_KIND_LABEL[kind]}</Badge>;
}

export function RoundStatusBadge({ status }: { status: 'COMPLETED' | 'FAILED' }) {
  return (
    <Badge variant={status === 'COMPLETED' ? 'success' : 'destructive'}>{humanize(status)}</Badge>
  );
}
