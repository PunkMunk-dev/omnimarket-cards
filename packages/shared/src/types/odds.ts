export interface OddsOutcome {
  name: string;
  price: number;
  point?: number;
}

export interface OddsMarket {
  key: string;
  lastUpdate: string;
  outcomes: OddsOutcome[];
}

export interface OddsBookmaker {
  key: string;
  title: string;
  lastUpdate: string;
  markets: OddsMarket[];
}

export interface OddsEvent {
  id: string;
  sportKey: string;
  sportTitle: string;
  commenceTime: string;
  homeTeam: string;
  awayTeam: string;
  bookmakers: OddsBookmaker[];
}

export interface OddsIngestionResult {
  sportKey: string;
  eventsProcessed: number;
  oddsRecordsInserted: number;
  ingestedAt: string;
}
