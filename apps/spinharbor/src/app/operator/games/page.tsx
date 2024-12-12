import type { Metadata } from 'next';
import { OperatorGamesView } from './operator-games-view';

export const metadata: Metadata = { title: 'Operator · Catalogue' };

export default function OperatorGamesPage() {
  return <OperatorGamesView />;
}
