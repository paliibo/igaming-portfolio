import type { MarketType } from '@igaming/database';

export interface MarketTemplate {
  type: MarketType;
  name: string;
  line: number | null;
  selections: { outcomeKey: string; name: string; priceMilli: number }[];
}

export const SPORTS = [
  { slug: 'football', name: 'Football' },
  { slug: 'basketball', name: 'Basketball' },
] as const;

export const FOOTBALL_TEAMS = [
  'Northgate United',
  'Riverside Athletic',
  'Harbour City FC',
  'Ironbridge Rovers',
  'Silverlake Town',
  'Oakmont Wanderers',
  'Eastmoor FC',
  'Westbrook Albion',
  'Kingsport City',
  'Fenwick Rangers',
];
export const BASKETBALL_TEAMS = [
  'Metro Comets',
  'Bayfront Titans',
  'Summit Hawks',
  'Granite Peaks',
  'Coastline Sharks',
  'Capital Wolves',
  'Highland Stags',
  'Lakeside Pioneers',
];
export const FOOTBALL_COMPETITIONS = ['Demo Premier League', 'Demo Cup', 'Demo Championship'];
export const BASKETBALL_COMPETITIONS = ['Demo Pro League', 'Demo Continental Cup'];

export function footballMarkets(
  homeName: string,
  awayName: string,
  favourite: 'home' | 'away' | 'even' = 'even',
): MarketTemplate[] {
  const [h, d, a] =
    favourite === 'home'
      ? [1850, 3600, 4200]
      : favourite === 'away'
        ? [4100, 3500, 1900]
        : [2600, 3200, 2750];
  return [
    {
      type: 'MATCH_WINNER',
      name: 'Match Result',
      line: null,
      selections: [
        { outcomeKey: 'HOME', name: homeName, priceMilli: h },
        { outcomeKey: 'DRAW', name: 'Draw', priceMilli: d },
        { outcomeKey: 'AWAY', name: awayName, priceMilli: a },
      ],
    },
    {
      type: 'TOTAL',
      name: 'Total Goals',
      line: 2.5,
      selections: [
        { outcomeKey: 'OVER', name: 'Over 2.5', priceMilli: 1950 },
        { outcomeKey: 'UNDER', name: 'Under 2.5', priceMilli: 1850 },
      ],
    },
    {
      type: 'BOTH_TEAMS_TO_SCORE',
      name: 'Both Teams To Score',
      line: null,
      selections: [
        { outcomeKey: 'YES', name: 'Yes', priceMilli: 1800 },
        { outcomeKey: 'NO', name: 'No', priceMilli: 1950 },
      ],
    },
    {
      type: 'HANDICAP',
      name: 'Handicap',
      line: favourite === 'away' ? 1.5 : -1.5,
      selections: [
        {
          outcomeKey: 'HOME',
          name: `${homeName} (${favourite === 'away' ? '+1.5' : '-1.5'})`,
          priceMilli: favourite === 'even' ? 3400 : 2100,
        },
        {
          outcomeKey: 'AWAY',
          name: `${awayName} (${favourite === 'away' ? '-1.5' : '+1.5'})`,
          priceMilli: favourite === 'even' ? 1300 : 1700,
        },
      ],
    },
  ];
}

export function basketballMarkets(
  homeName: string,
  awayName: string,
  favourite: 'home' | 'away' | 'even' = 'even',
): MarketTemplate[] {
  const [h, a] =
    favourite === 'home' ? [1450, 2750] : favourite === 'away' ? [2650, 1500] : [1900, 1900];
  const spread = favourite === 'home' ? -6.5 : favourite === 'away' ? 6.5 : -1.5;
  return [
    {
      type: 'MATCH_WINNER',
      name: 'Money Line',
      line: null,
      selections: [
        { outcomeKey: 'HOME', name: homeName, priceMilli: h },
        { outcomeKey: 'AWAY', name: awayName, priceMilli: a },
      ],
    },
    {
      type: 'TOTAL',
      name: 'Total Points',
      line: 212.5,
      selections: [
        { outcomeKey: 'OVER', name: 'Over 212.5', priceMilli: 1900 },
        { outcomeKey: 'UNDER', name: 'Under 212.5', priceMilli: 1900 },
      ],
    },
    {
      type: 'HANDICAP',
      name: 'Point Spread',
      line: spread,
      selections: [
        {
          outcomeKey: 'HOME',
          name: `${homeName} (${spread > 0 ? '+' : ''}${spread})`,
          priceMilli: 1900,
        },
        {
          outcomeKey: 'AWAY',
          name: `${awayName} (${-spread > 0 ? '+' : ''}${-spread})`,
          priceMilli: 1900,
        },
      ],
    },
  ];
}

export function marketsFor(
  sportSlug: string,
  home: string,
  away: string,
  favourite: 'home' | 'away' | 'even' = 'even',
): MarketTemplate[] {
  return sportSlug === 'basketball'
    ? basketballMarkets(home, away, favourite)
    : footballMarkets(home, away, favourite);
}

export const FULL_TIME_MINUTE: Record<string, number> = { football: 90, basketball: 48 };
