export type CityTier = 'Mega-Hub' | 'Focus City' | 'Regional';

export interface City {
  id: string;
  name: string;
  tier: CityTier;
  demandCubes: number;
}

export type Slot = 'Primary' | 'Secondary';

export interface RouteInstance {
  id: string; // References a static route definition ID
  occupants: {
    Primary?: string; // Airline ID
    Secondary?: string; // Airline ID
  };
}

export interface TakeoverState {
  targetAirlineId: string;
  roundsRemaining: number;
  attackerTreasuryAtStart: number;
}

export interface Airline {
  id: string;
  name: string;
  color: string;
  treasury: number;
  hubs: string[]; // Array of City IDs
  sharesOutstanding: number;
  shareholders: Record<string, number>; // PlayerID -> Share count
  ceoId: string | null;
  isBankrupt: boolean;
  takeoverInProgress?: TakeoverState;
}

export interface Player {
  id: string;
  name: string;
  cash: number;
}

export type TurnPhase =
  | 'STOCK_MARKET'
  | 'AIRLINES_REVENUE'
  | 'AIRLINES_PLANNING'
  | 'AIRLINES_EXPENSES'
  | 'AIRLINES_DIVIDENDS'
  | 'EVENT_ADMIN';

export type Era = '1950s' | '1980s' | '2010s';

export interface EraSetup {
  era: Era;
  ghostBaseDividend: Record<string, number>; // Airline ID -> Base Dividend
  fuelRange: [number, number];
}

export interface GameState {
  players: Player[];
  airlines: Airline[];
  cities: City[];
  routes: RouteInstance[];
  fuelPrice: number;
  phase: TurnPhase;
  currentTurn: number;
  activePlayerIndex: number;
  consecutivePasses: number;
  era: Era;
  eraSetup: EraSetup;
  lastRoll?: number;
  gameLog: string[];
}

export type GameAction =
  | { type: 'BUY_STOCK'; payload: { playerId: string; airlineId: string; count: number } }
  | { type: 'SELL_STOCK'; payload: { playerId: string; airlineId: string; count: number } }
  | { type: 'PASS_PHASE'; payload: { playerId: string } }
  | { type: 'COLLECT_REVENUE' }
  | { type: 'ADD_ROUTE'; payload: { airlineId: string; routeId: string; slot: Slot } }
  | { type: 'REMOVE_ROUTE'; payload: { airlineId: string; routeId: string; slot: Slot } }
  | { type: 'BUILD_HUB'; payload: { airlineId: string; cityId: string } }
  | { type: 'DECLARE_MA'; payload: { attackerId: string; targetId: string } }
  | { type: 'PAY_EXPENSES' }
  | { type: 'RESOLVE_BANKRUPTCY'; payload: { airlineId: string } }
  | { type: 'DECLARE_DIVIDEND'; payload: { airlineId: string; amountPerShare: number } }
  | { type: 'NEXT_PHASE' }
  | { type: 'RESOLVE_EVENT'; payload: { fuelPrice: number; logMessage: string } }
  | { type: 'RELAUNCH_AIRLINE'; payload: { airlineId: string; playerId: string; bid: number } };
