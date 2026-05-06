import { GameState, Airline, Player } from '../types/GameTypes';
import { ROUTES } from '../data/routeData';
import { getInitialState } from '../data/initialState';

export type GameAction =
  | { type: 'BUY_STOCK'; payload: { airlineId: string; playerId: string; shares: number } }
  | { type: 'SELL_STOCK'; payload: { airlineId: string; playerId: string; shares: number } }
  | { type: 'PLACE_ROUTE'; payload: { airlineId: string; routeId: string; slot: 'primary' | 'secondary' } }
  | { type: 'REMOVE_ROUTE'; payload: { airlineId: string; routeId: string; slot: 'primary' | 'secondary' } }
  | { type: 'BUILD_HUB'; payload: { airlineId: string; cityId: string } }
  | { type: 'DECLARE_DIVIDEND'; payload: { airlineId: string; perShareAmount: number } }
  | { type: 'DECLARE_MA'; payload: { attackingAirlineId: string; targetAirlineId: string } }
  | { type: 'RESOLVE_MA' }
  | { type: 'DECLARE_BANKRUPTCY'; payload: { airlineId: string } }
  | { type: 'ADVANCE_PHASE' }
  | { type: 'PASS_TURN'; payload: { playerId?: string; airlineId?: string } }
  | { type: 'FOUND_AIRLINE'; payload: { airlineId: string; playerId: string } }
  | { type: 'START_GAME'; payload: { players: Player[]; era: string } }
  | { type: 'DISMISS_EVENT' }
  | { type: 'DISMISS_INTRO' }
  | { type: 'LOG'; payload: string };

const calculateRevenue = (state: GameState, airline: Airline): number => {
  if (airline.isBankrupt) return 0;
  let netRevenue = 0;
  Object.entries(state.routeState).forEach(([routeId, slotState]) => {
    let count = 0;
    if (slotState.primary === airline.id) count++;
    if (slotState.secondary === airline.id) count++;
    if (count === 0) return;
    const routeDef = ROUTES.find(r => r.id === routeId);
    if (!routeDef) return;
    let routeRevenue = (state.cityDemand[routeDef.from] ?? 1) + (state.cityDemand[routeDef.to] ?? 1);
    if (airline.hubs.includes(routeDef.from) || airline.hubs.includes(routeDef.to)) routeRevenue += 2;
    if (slotState.primary && slotState.secondary && slotState.primary !== slotState.secondary) routeRevenue -= 2;
    netRevenue += (routeRevenue * count);
  });
  return netRevenue;
};

const computeStockPrice = (airline: Airline, state: GameState): number => {
  if (airline.isBankrupt) return 0;
  const rev = calculateRevenue(state, airline);
  return Math.max(1, Math.floor(rev / 2));
};

const updateAllStockPrices = (state: GameState): Record<string, Airline> => {
  const newAirlines = { ...state.airlines };
  Object.values(newAirlines).forEach(a => {
    newAirlines[a.id] = { ...a, stockPrice: computeStockPrice(a, state) };
  });
  return newAirlines;
};

const updateCEO = (airline: Airline, players: Player[]): string | null => {
  let topPlayerId: string | null = null;
  let maxShares = 0;
  players.forEach(p => {
    const shares = p.holdings[airline.id] || 0;
    if (shares >= 5 && shares > maxShares) {
      maxShares = shares;
      topPlayerId = p.id;
    }
  });
  return topPlayerId;
};

const nextActivePlayerIndex = (state: GameState): number => {
  let nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
  for (let i = 0; i < state.players.length; i++) {
    const p = state.players[nextIndex];
    if (!state.passedPlayers.includes(p.id)) return nextIndex;
    nextIndex = (nextIndex + 1) % state.players.length;
  }
  return state.currentPlayerIndex;
};

const nextActiveAirlineIndex = (state: GameState): number => {
  const airlineList = Object.values(state.airlines);
  let nextIndex = (state.currentAirlineIndex + 1) % airlineList.length;
  for (let i = 0; i < airlineList.length; i++) {
    const a = airlineList[nextIndex];
    if (a.ceoPlayerId && !a.isBankrupt && !state.passedAirlines.includes(a.id)) return nextIndex;
    nextIndex = (nextIndex + 1) % airlineList.length;
  }
  return -1; // SIGNAL: No more airlines can act
};

const calculateExpenses = (state: GameState, airline: Airline): number => {
  const fuelCost = airline.routes.length * state.fuelPrice;
  let hubTax = 0;
  airline.hubs.forEach((_, i) => {
    const multiplier = (i === 0 ? 2 : i === 1 ? 3 : 5);
    hubTax += multiplier * state.fuelPrice;
  });
  return fuelCost + hubTax;
};

export const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'START_GAME': {
      const newState = getInitialState(action.payload.era, action.payload.players);
      return { ...newState, gameLog: [`Game started: ${action.payload.era} era.`, ...newState.gameLog].slice(0, 50) };
    }
    case 'DISMISS_EVENT': return { ...state, currentEvent: null };
    case 'DISMISS_INTRO': return { ...state, showIntro: false };

    case 'FOUND_AIRLINE': {
      const { airlineId, playerId } = action.payload;
      const airline = state.airlines[airlineId];
      const player = state.players.find(p => p.id === playerId);
      if (!airline || !player || airline.stockPrice > 1 || player.cash < 10) return state;
      const newAirline = { ...airline, sharesOutstanding: 5, treasury: 10, ceoPlayerId: playerId, isBankrupt: false, freeRoutePlacements: 0 };
      const newPlayers = state.players.map(p => p.id === playerId ? { ...p, cash: p.cash - 10, holdings: { ...p.holdings, [airlineId]: 5 } } : p);
      let nextState = { ...state, players: newPlayers, airlines: { ...state.airlines, [airlineId]: newAirline }, gameLog: [`${player.name} founded ${airline.name} (CEO)!`, ...state.gameLog].slice(0, 50) };
      nextState.airlines = updateAllStockPrices(nextState);
      if (state.currentPhase === 'STOCK_MARKET') nextState.currentPlayerIndex = nextActivePlayerIndex(nextState);
      return nextState;
    }

    case 'BUY_STOCK': {
      const { airlineId, playerId, shares } = action.payload;
      const airline = state.airlines[airlineId];
      const player = state.players.find(p => p.id === playerId);
      if (!airline || !player || airline.isBankrupt) return state;
      const cost = shares * airline.stockPrice;
      if (player.cash < cost) return state;
      const newAirline = { ...airline, treasury: airline.treasury + cost, sharesOutstanding: airline.sharesOutstanding + shares };
      const newPlayers = state.players.map(p => p.id === playerId ? { ...p, cash: p.cash - cost, holdings: { ...p.holdings, [airlineId]: (p.holdings[airlineId] || 0) + shares } } : p);
      newAirline.ceoPlayerId = updateCEO(newAirline, newPlayers);
      let nextState = { ...state, players: newPlayers, airlines: { ...state.airlines, [airlineId]: newAirline }, gameLog: [`${player.name} bought ${shares} sh ${airline.name}`, ...state.gameLog].slice(0, 50) };
      nextState.airlines = updateAllStockPrices(nextState);
      if (state.currentPhase === 'STOCK_MARKET') nextState.currentPlayerIndex = nextActivePlayerIndex(nextState);
      return nextState;
    }

    case 'SELL_STOCK': {
      const { airlineId, playerId, shares } = action.payload;
      const airline = state.airlines[airlineId];
      const player = state.players.find(p => p.id === playerId);
      if (!airline || !player || (player.holdings[airlineId] || 0) < shares) return state;
      const gain = shares * airline.stockPrice;
      const newPlayers = state.players.map(p => p.id === playerId ? { ...p, cash: p.cash + gain, holdings: { ...p.holdings, [airlineId]: (p.holdings[airlineId] || 0) - shares } } : p);
      const newAirline = { ...airline, sharesOutstanding: airline.sharesOutstanding - shares };
      newAirline.ceoPlayerId = updateCEO(newAirline, newPlayers);
      let nextState = { ...state, players: newPlayers, airlines: { ...state.airlines, [airlineId]: newAirline }, gameLog: [`${player.name} sold ${shares} sh ${airline.name}`, ...state.gameLog].slice(0, 50) };
      nextState.airlines = updateAllStockPrices(nextState);
      if (state.currentPhase === 'STOCK_MARKET') nextState.currentPlayerIndex = nextActivePlayerIndex(nextState);
      return nextState;
    }

    case 'PASS_TURN': {
      const { playerId, airlineId } = action.payload;
      if (['PLAN_ROUTES', 'DIVIDENDS'].includes(state.currentPhase) && airlineId) {
        const newPassed = [...new Set([...state.passedAirlines, airlineId])];
        const founded = Object.values(state.airlines).filter(a => a.ceoPlayerId && !a.isBankrupt);
        if (newPassed.length >= founded.length) return gameReducer(state, { type: 'ADVANCE_PHASE' });
        const nextIndex = nextActiveAirlineIndex({ ...state, passedAirlines: newPassed });
        if (nextIndex === -1) return gameReducer(state, { type: 'ADVANCE_PHASE' });
        return { ...state, passedAirlines: newPassed, currentAirlineIndex: nextIndex, gameLog: [`${state.airlines[airlineId]?.name} passed`, ...state.gameLog].slice(0, 50) };
      } else if (playerId) {
        const newPassed = [...new Set([...state.passedPlayers, playerId])];
        if (newPassed.length >= state.players.length) return gameReducer(state, { type: 'ADVANCE_PHASE' });
        return { ...state, passedPlayers: newPassed, currentPlayerIndex: nextActivePlayerIndex({ ...state, passedPlayers: newPassed }), gameLog: [`${state.players.find(p => p.id === playerId)?.name} passed`, ...state.gameLog].slice(0, 50) };
      }
      return state;
    }

    case 'PLACE_ROUTE': {
      const { airlineId, routeId, slot } = action.payload;
      const airline = state.airlines[airlineId];
      if (!airline || (state.routeState[routeId].primary === airlineId || state.routeState[routeId].secondary === airlineId)) return state;
      const newAirline = { ...airline, routes: [...airline.routes, routeId], freeRoutePlacements: Math.max(0, (airline.freeRoutePlacements || 0) - 1) };
      let nextState = { ...state, airlines: { ...state.airlines, [airlineId]: newAirline }, routeState: { ...state.routeState, [routeId]: { ...state.routeState[routeId], [slot]: airlineId } }, gameLog: [`${airline.name} expanded to ${routeId}`, ...state.gameLog].slice(0, 50) };
      nextState.airlines = updateAllStockPrices(nextState);
      nextState.currentAirlineIndex = nextActiveAirlineIndex(nextState);
      if (nextState.currentAirlineIndex === -1) return gameReducer(nextState, { type: 'ADVANCE_PHASE' });
      return nextState;
    }

    case 'REMOVE_ROUTE': {
      const { airlineId, routeId, slot } = action.payload;
      const airline = state.airlines[airlineId];
      if (!airline) return state;
      const idx = airline.routes.indexOf(routeId);
      if (idx === -1) return state;
      const newRoutes = [...airline.routes]; newRoutes.splice(idx, 1);
      let nextState = { ...state, airlines: { ...state.airlines, [airlineId]: { ...airline, routes: newRoutes } }, routeState: { ...state.routeState, [routeId]: { ...state.routeState[routeId], [slot]: null } }, gameLog: [`${airline.name} removed route ${routeId}`, ...state.gameLog].slice(0, 50) };
      nextState.airlines = updateAllStockPrices(nextState);
      nextState.currentAirlineIndex = nextActiveAirlineIndex(nextState);
      if (nextState.currentAirlineIndex === -1) return gameReducer(nextState, { type: 'ADVANCE_PHASE' });
      return nextState;
    }

    case 'BUILD_HUB': {
      const { airlineId, cityId } = action.payload;
      const airline = state.airlines[airlineId];
      if (!airline || airline.treasury < 15 || Object.values(state.airlines).some(a => a.hubs.includes(cityId))) return state;
      const newAirline = { ...airline, treasury: airline.treasury - 15, hubs: [...airline.hubs, cityId], freeRoutePlacements: (airline.freeRoutePlacements || 0) + 2 };
      let nextState = { ...state, airlines: { ...state.airlines, [airlineId]: newAirline }, gameLog: [`${airline.name} built hub in ${cityId}`, ...state.gameLog].slice(0, 50) };
      nextState.airlines = updateAllStockPrices(nextState);
      nextState.currentAirlineIndex = nextActiveAirlineIndex(nextState);
      if (nextState.currentAirlineIndex === -1) return gameReducer(nextState, { type: 'ADVANCE_PHASE' });
      return nextState;
    }

    case 'DECLARE_DIVIDEND': {
      const { airlineId, perShareAmount } = action.payload;
      const airline = state.airlines[airlineId];
      const total = perShareAmount * airline.sharesOutstanding;
      if (!airline || airline.treasury < total) return state;
      const newPlayers = state.players.map(p => ({ ...p, cash: p.cash + (p.holdings[airlineId] || 0) * perShareAmount }));
      let nextState = { ...state, players: newPlayers, airlines: { ...state.airlines, [airlineId]: { ...airline, treasury: airline.treasury - total } }, gameLog: [`${airline.name} paid $${perShareAmount}/sh div`, ...state.gameLog].slice(0, 50) };
      nextState.currentAirlineIndex = nextActiveAirlineIndex(nextState);
      if (nextState.currentAirlineIndex === -1) return gameReducer(nextState, { type: 'ADVANCE_PHASE' });
      return nextState;
    }

    case 'DECLARE_MA': {
      const { attackingAirlineId, targetAirlineId } = action.payload;
      let nextState = { ...state, activeMA: { attackingAirlineId, targetAirlineId, roundDeclared: state.round, roundsRemaining: 3 }, gameLog: [`${attackingAirlineId} declared M&A on ${targetAirlineId}!`, ...state.gameLog].slice(0, 50) };
      nextState.currentAirlineIndex = nextActiveAirlineIndex(nextState);
      if (nextState.currentAirlineIndex === -1) return gameReducer(nextState, { type: 'ADVANCE_PHASE' });
      return nextState;
    }

    case 'RESOLVE_MA': {
      if (!state.activeMA) return state;
      const attacker = state.airlines[state.activeMA.attackingAirlineId];
      const target = state.airlines[state.activeMA.targetAirlineId];
      const targetMC = target.stockPrice * target.sharesOutstanding;
      if (attacker.treasury >= targetMC) {
        const newPlayers = state.players.map(p => ({ ...p, cash: p.cash + (p.holdings[target.id] || 0) * target.stockPrice }));
        const newAttacker = { ...attacker, treasury: attacker.treasury - targetMC, routes: [...new Set([...attacker.routes, ...target.routes])] };
        const newRS = { ...state.routeState };
        Object.keys(newRS).forEach(r => { if (newRS[r].primary === target.id) newRS[r].primary = attacker.id; if (newRS[r].secondary === target.id) newRS[r].secondary = attacker.id; });
        let nextState = { ...state, players: newPlayers, routeState: newRS, airlines: { ...state.airlines, [attacker.id]: newAttacker, [target.id]: { ...target, isBankrupt: true, routes: [], treasury: 0, stockPrice: 0 } }, activeMA: null, gameLog: [`SUCCESS: ${attacker.name} absorbed ${target.name}!`, ...state.gameLog].slice(0, 50) };
        nextState.airlines = updateAllStockPrices(nextState);
        return nextState;
      } else return { ...state, airlines: { ...state.airlines, [attacker.id]: { ...attacker, treasury: Math.max(0, attacker.treasury - 20) } }, activeMA: null, gameLog: [`FAILURE: ${attacker.name} failed M&A. $20 penalty.`, ...state.gameLog].slice(0, 50) };
    }

    case 'ADVANCE_PHASE': {
      const phases: GameState['currentPhase'][] = ['STOCK_MARKET', 'COLLECT_REVENUE', 'PLAN_ROUTES', 'PAY_EXPENSES', 'RESOLVE_BANKRUPTCY', 'DIVIDENDS', 'EVENT_CARD'];
      const nextPhase = phases[(phases.indexOf(state.currentPhase) + 1) % phases.length];
      let nextState = { ...state, currentPhase: nextPhase, currentPlayerIndex: 0, currentAirlineIndex: 0, passedPlayers: [], passedAirlines: [], gameLog: [`Phase: ${nextPhase}`, ...state.gameLog].slice(0, 50) };
      
      if (nextPhase === 'STOCK_MARKET') {
        nextState.round++;
        if (state.activeMA) { nextState.activeMA = { ...state.activeMA, roundsRemaining: state.activeMA.roundsRemaining - 1 }; if (nextState.activeMA.roundsRemaining <= 0) return gameReducer(nextState, { type: 'RESOLVE_MA' }); }
        nextState.currentPlayerIndex = nextActivePlayerIndex(nextState);
      } else if (['PLAN_ROUTES', 'DIVIDENDS'].includes(nextPhase)) {
        const first = Object.values(state.airlines).findIndex(a => a.ceoPlayerId && !a.isBankrupt);
        if (first === -1) return gameReducer(nextState, { type: 'ADVANCE_PHASE' });
        nextState.currentAirlineIndex = first;
      } else if (nextPhase === 'COLLECT_REVENUE') {
        const newAirlines = { ...state.airlines }; let newPlayers = [...state.players];
        Object.values(newAirlines).forEach(a => {
          if (a.isBankrupt) return;
          const rev = calculateRevenue(state, a); newAirlines[a.id] = { ...a, treasury: a.treasury + rev };
          if (!a.ceoPlayerId) newPlayers = newPlayers.map(p => ({ ...p, cash: p.cash + (p.holdings[a.id] || 0) * 1 }));
        });
        nextState.airlines = newAirlines; nextState.players = newPlayers;
        return gameReducer(nextState, { type: 'ADVANCE_PHASE' });
      } else if (nextPhase === 'PAY_EXPENSES') {
        const newAirlines = { ...state.airlines };
        Object.values(newAirlines).forEach(a => { if (!a.isBankrupt && a.stockPrice > 0) newAirlines[a.id] = { ...a, treasury: a.treasury - calculateExpenses(state, a) }; });
        nextState.airlines = newAirlines;
        return gameReducer(nextState, { type: 'ADVANCE_PHASE' });
      }
      return nextState;
    }
    default: return state;
  }
};