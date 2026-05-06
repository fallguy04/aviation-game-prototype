import { GameState } from '../types/GameTypes';
import { ROUTES } from './routeData';

// Initialize routeState for all 88 routes
const initialRouteState: Record<string, { primary: string | null; secondary: string | null }> = {};
ROUTES.forEach(r => {
  initialRouteState[r.id] = { primary: null, secondary: null };
});

// Ghost airline starting routes
const ghostRoutes: Record<string, string[]> = {
  'PanAm': ['R003', 'R005', 'R016', 'R017', 'R031', 'R054', 'R075', 'R076'],
  'TWA': ['R001', 'R004', 'R014', 'R027', 'R032', 'R069'],
  'Braniff': ['R018', 'R048', 'R053', 'R052', 'R062', 'R064'],
  'Northeast': ['R007', 'R009', 'R011', 'R013'],
};

// Apply ghost routes to initialRouteState
Object.entries(ghostRoutes).forEach(([airlineId, routeIds]) => {
  routeIds.forEach(rId => {
    if (initialRouteState[rId]) {
      initialRouteState[rId].primary = airlineId;
    }
  });
});

export const initialState: GameState = {
  players: [
    { id: 'P1', name: 'Player 1', cash: 80, holdings: {} },
    { id: 'P2', name: 'Player 2', cash: 80, holdings: {} },
    { id: 'P3', name: 'Player 3', cash: 80, holdings: {} },
  ],
  airlines: {
    'Continental': {
      id: 'Continental',
      name: 'Continental',
      color: '#C8960C',
      treasury: 0,
      routes: [],
      hubs: [],
      sharesOutstanding: 0,
      stockPrice: 0,
      isGhost: false,
      ghostDividendBase: 0,
      ceoPlayerId: null,
    },
    'Eastern': {
      id: 'Eastern',
      name: 'Eastern',
      color: '#E63946',
      treasury: 0,
      routes: [],
      hubs: [],
      sharesOutstanding: 0,
      stockPrice: 0,
      isGhost: false,
      ghostDividendBase: 0,
      ceoPlayerId: null,
    },
    'PanAm': {
      id: 'PanAm',
      name: 'Pan Am',
      color: '#457B9D',
      treasury: 0,
      routes: [...ghostRoutes.PanAm],
      hubs: [],
      sharesOutstanding: 5,
      stockPrice: 8,
      isGhost: true,
      ghostDividendBase: 2,
      ceoPlayerId: null,
    },
    'TWA': {
      id: 'TWA',
      name: 'TWA',
      color: '#2A9D8F',
      treasury: 0,
      routes: [...ghostRoutes.TWA],
      hubs: [],
      sharesOutstanding: 5,
      stockPrice: 6,
      isGhost: true,
      ghostDividendBase: 1,
      ceoPlayerId: null,
    },
    'Braniff': {
      id: 'Braniff',
      name: 'Braniff',
      color: '#E9C46A',
      treasury: 0,
      routes: [...ghostRoutes.Braniff],
      hubs: [],
      sharesOutstanding: 5,
      stockPrice: 6,
      isGhost: true,
      ghostDividendBase: 1,
      ceoPlayerId: null,
    },
    'Northeast': {
      id: 'Northeast',
      name: 'Northeast',
      color: '#9B5DE5',
      treasury: 0,
      routes: [...ghostRoutes.Northeast],
      hubs: [],
      sharesOutstanding: 5,
      stockPrice: 4,
      isGhost: true,
      ghostDividendBase: 0,
      ceoPlayerId: null,
    },
  },
  routeState: initialRouteState,
  cityDemand: {
    JFK: 4, BOS: 3, ORD: 4, ATL: 3, MIA: 3, LAX: 4,
    SFO: 3, DFW: 2, DEN: 2, SEA: 2, MSP: 2, DTW: 2,
  },
  fuelPrice: 2,
  currentPhase: 'STOCK_MARKET',
  currentPlayerIndex: 0,
  currentAirlineIndex: 0,
  round: 1,
  activeMA: null,
  gameLog: ['Game Started: 1950s Golden Age scenario.'],
  passedPlayers: [],
};
