import { GameState, City, RouteInstance, Airline, Player } from './types';

const cities: City[] = [
  { id: 'NYC', name: 'New York', tier: 'Mega-Hub', demandCubes: 5 },
  { id: 'CHI', name: 'Chicago', tier: 'Mega-Hub', demandCubes: 5 },
  { id: 'ATL', name: 'Atlanta', tier: 'Mega-Hub', demandCubes: 4 },
  { id: 'DAL', name: 'Dallas', tier: 'Mega-Hub', demandCubes: 4 },
  { id: 'LAX', name: 'Los Angeles', tier: 'Mega-Hub', demandCubes: 4 },
  { id: 'MIA', name: 'Miami', tier: 'Focus City', demandCubes: 3 },
  { id: 'SFO', name: 'San Francisco', tier: 'Focus City', demandCubes: 3 },
  { id: 'DCA', name: 'Washington D.C.', tier: 'Focus City', demandCubes: 3 },
  { id: 'LON', name: 'London', tier: 'Mega-Hub', demandCubes: 5 },
];

const routes: RouteInstance[] = [
  { id: 'NYC-CHI', occupants: { Primary: 'G1', Secondary: 'G2' } },
  { id: 'CHI-LAX', occupants: { Primary: 'L1' } },
  { id: 'NYC-MIA', occupants: { Primary: 'G3' } },
  { id: 'ATL-MIA', occupants: { Primary: 'G4' } },
  { id: 'NYC-LON', occupants: { Primary: 'L2' } },
  { id: 'CHI-DAL', occupants: {} },
  { id: 'DAL-LAX', occupants: {} },
  { id: 'SFO-LAX', occupants: {} },
];

const players: Player[] = [
  { id: 'P1', name: 'Howard Hughes', cash: 100 },
  { id: 'P2', name: 'Juan Trippe', cash: 100 },
  { id: 'P3', name: 'C.R. Smith', cash: 100 },
];

const airlines: Airline[] = [
  {
    id: 'L1',
    name: 'Trans World',
    color: '#E01933',
    treasury: 50,
    hubs: ['LAX'],
    sharesOutstanding: 10,
    shareholders: { 'P1': 6, 'P2': 2, 'P3': 2 },
    ceoId: 'P1',
    isBankrupt: false,
  },
  {
    id: 'L2',
    name: 'Pan Am',
    color: '#0057B8',
    treasury: 60,
    hubs: ['NYC'],
    sharesOutstanding: 10,
    shareholders: { 'P2': 7, 'P1': 1, 'P3': 2 },
    ceoId: 'P2',
    isBankrupt: false,
  },
  {
    id: 'G1',
    name: 'American (Ghost)',
    color: '#A7A9AC',
    treasury: 0,
    hubs: [],
    sharesOutstanding: 4,
    shareholders: { 'P3': 4 },
    ceoId: null, // Less than 5 shares
    isBankrupt: false,
  },
  {
    id: 'G2',
    name: 'United (Ghost)',
    color: '#002244',
    treasury: 0,
    hubs: [],
    sharesOutstanding: 3,
    shareholders: { 'P1': 3 },
    ceoId: null,
    isBankrupt: false,
  },
  {
    id: 'G3',
    name: 'Eastern (Ghost)',
    color: '#003366',
    treasury: 0,
    hubs: [],
    sharesOutstanding: 2,
    shareholders: { 'P2': 2 },
    ceoId: null,
    isBankrupt: false,
  },
  {
    id: 'G4',
    name: 'Delta (Ghost)',
    color: '#E01933',
    treasury: 0,
    hubs: [],
    sharesOutstanding: 2,
    shareholders: { 'P3': 2 },
    ceoId: null,
    isBankrupt: false,
  },
];

export const initialState1950s: GameState = {
  players,
  airlines,
  cities,
  routes,
  fuelPrice: 2,
  phase: 'STOCK_MARKET',
  currentTurn: 1,
  activePlayerIndex: 0,
  consecutivePasses: 0,
  era: '1950s',
  gameLog: ['Game Started: 1950s Golden Age scenario.'],
};
