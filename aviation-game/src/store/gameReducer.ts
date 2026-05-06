import { GameState, Airline, Player } from '../types/GameTypes';
import { ROUTES } from '../data/routeData';

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
  | { type: 'PASS_TURN'; payload: { playerId: string } }
  | { type: 'FOUND_AIRLINE'; payload: { airlineId: string; playerId: string } }
  | { type: 'START_GAME'; payload: { players: Player[] } }
  | { type: 'LOG'; payload: string };

const computeStockPrice = (airline: Airline): number => {
  if (airline.isBankrupt) return 0;
  return airline.routes.length + airline.hubs.length * 3;
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

const calculateRevenue = (state: GameState, airline: Airline): number => {
  let netRevenue = 0;
  airline.routes.forEach(routeId => {
    const routeDef = ROUTES.find(r => r.id === routeId);
    if (!routeDef) return;
    let routeRevenue = (state.cityDemand[routeDef.from] ?? 1) + (state.cityDemand[routeDef.to] ?? 1);
    if (airline.hubs.includes(routeDef.from) || airline.hubs.includes(routeDef.to)) routeRevenue += 2;
    const slotState = state.routeState[routeId];
    if (slotState?.primary && slotState?.secondary && slotState.primary !== slotState.secondary) routeRevenue -= 2;
    netRevenue += routeRevenue;
  });
  return netRevenue;
};

const calculateExpenses = (state: GameState, airline: Airline): number => {
  const fuelCost = airline.routes.length * state.fuelPrice;
  let hubTax = 0;
  airline.hubs.forEach((_, i) => hubTax += (i === 0 ? 6 : i === 1 ? 8 : 12));
  return fuelCost + hubTax;
};

export const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'START_GAME': {
      return {
        ...state,
        players: action.payload.players,
        currentPlayerIndex: 0,
        currentPhase: 'STOCK_MARKET',
        gameLog: [`Game started with ${action.payload.players.length} players.`, ...state.gameLog].slice(0, 50),
      };
    }

    case 'FOUND_AIRLINE': {
      const { airlineId, playerId } = action.payload;
      const airline = state.airlines[airlineId];
      const player = state.players.find(p => p.id === playerId);
      if (!airline || !player || airline.stockPrice > 0 || player.cash < 10) return state;

      const newAirline: Airline = {
        ...airline,
        sharesOutstanding: 3,
        treasury: 10,
        ceoPlayerId: playerId,
        isBankrupt: false,
        freeRoutePlacements: 0, // Handled by unlimited placement rule
        stockPrice: 0
      };
      
      const newPlayers = state.players.map(p => p.id === playerId ? { ...p, cash: p.cash - 10, holdings: { ...p.holdings, [airlineId]: 3 } } : p);

      const nextState = {
        ...state,
        players: newPlayers,
        airlines: { ...state.airlines, [airlineId]: newAirline },
        gameLog: [`${player.name} founded ${airline.name} for $10!`, ...state.gameLog].slice(0, 50),
      };

      if (state.currentPhase === 'STOCK_MARKET') {
        nextState.currentPlayerIndex = nextActivePlayerIndex(nextState);
      }
      return nextState;
    }

    case 'BUY_STOCK': {
      const { airlineId, playerId, shares } = action.payload;
      const airline = state.airlines[airlineId];
      const player = state.players.find(p => p.id === playerId);
      if (!airline || !player || airline.isBankrupt || airline.stockPrice <= 0) return state;
      
      const cost = shares * airline.stockPrice;
      if (player.cash < cost) return state;

      const newAirline = { ...airline, treasury: airline.treasury + cost, sharesOutstanding: airline.sharesOutstanding + shares };
      const newPlayers = state.players.map(p => p.id === playerId ? { ...p, cash: p.cash - cost, holdings: { ...p.holdings, [airlineId]: (p.holdings[airlineId] || 0) + shares } } : p);
      newAirline.ceoPlayerId = updateCEO(newAirline, newPlayers);
      newAirline.stockPrice = computeStockPrice(newAirline);

      const nextState = {
        ...state,
        players: newPlayers,
        airlines: { ...state.airlines, [airlineId]: newAirline },
        gameLog: [`${player.name} bought ${shares} sh of ${airline.name}`, ...state.gameLog].slice(0, 50),
      };

      if (state.currentPhase === 'STOCK_MARKET') {
        nextState.currentPlayerIndex = nextActivePlayerIndex(nextState);
      }
      return nextState;
    }

    case 'SELL_STOCK': {
      const { airlineId, playerId, shares } = action.payload;
      const airline = state.airlines[airlineId];
      const player = state.players.find(p => p.id === playerId);
      if (!airline || !player) return state;
      const owned = player.holdings[airlineId] || 0;
      if (owned < shares) return state;

      const gain = shares * airline.stockPrice;
      const newPlayers = state.players.map(p => p.id === playerId ? { ...p, cash: p.cash + gain, holdings: { ...p.holdings, [airlineId]: owned - shares } } : p);
      const newAirline = { ...airline, sharesOutstanding: airline.sharesOutstanding - shares };
      newAirline.ceoPlayerId = updateCEO(newAirline, newPlayers);
      newAirline.stockPrice = computeStockPrice(newAirline);

      const nextState = {
        ...state,
        players: newPlayers,
        airlines: { ...state.airlines, [airlineId]: newAirline },
        gameLog: [`${player.name} sold ${shares} sh of ${airline.name}`, ...state.gameLog].slice(0, 50),
      };

      if (state.currentPhase === 'STOCK_MARKET') {
        nextState.currentPlayerIndex = nextActivePlayerIndex(nextState);
      }
      return nextState;
    }

    case 'PASS_TURN': {
      const { playerId } = action.payload;
      const newPassed = [...new Set([...state.passedPlayers, playerId])];
      if (newPassed.length >= state.players.length) {
        return gameReducer(state, { type: 'ADVANCE_PHASE' });
      }
      const nextState = {
        ...state,
        passedPlayers: newPassed,
        gameLog: [`${state.players.find(p => p.id === playerId)?.name} passed`, ...state.gameLog].slice(0, 50),
      };
      nextState.currentPlayerIndex = nextActivePlayerIndex(nextState);
      return nextState;
    }

    case 'PLACE_ROUTE': {
      const { airlineId, routeId, slot } = action.payload;
      const airline = state.airlines[airlineId];
      if (!airline) return state;
      
      // Rule 5.3: Placement is FREE. Cost is operational overhead at end of phase.
      const newAirline = { ...airline, routes: [...airline.routes, routeId] };
      newAirline.stockPrice = computeStockPrice(newAirline);
      
      return { 
        ...state, 
        airlines: { ...state.airlines, [airlineId]: newAirline }, 
        routeState: { ...state.routeState, [routeId]: { ...state.routeState[routeId], [slot]: airlineId } }, 
        gameLog: [`${airline.name} expanded to ${routeId}`, ...state.gameLog].slice(0, 50) 
      };
    }

    case 'REMOVE_ROUTE': {
      const { airlineId, routeId, slot } = action.payload;
      const airline = state.airlines[airlineId];
      if (!airline) return state;
      const newAirline = { ...airline, routes: airline.routes.filter(r => r !== routeId) };
      newAirline.stockPrice = computeStockPrice(newAirline);
      return { ...state, airlines: { ...state.airlines, [airlineId]: newAirline }, routeState: { ...state.routeState, [routeId]: { ...state.routeState[routeId], [slot]: null } }, gameLog: [`${airline.name} removed route ${routeId}`, ...state.gameLog].slice(0, 50) };
    }

    case 'BUILD_HUB': {
      const { airlineId, cityId } = action.payload;
      const airline = state.airlines[airlineId];
      if (!airline || airline.treasury < 15) return state;
      const newAirline = { ...airline, treasury: airline.treasury - 15, hubs: [...airline.hubs, cityId] };
      newAirline.stockPrice = computeStockPrice(newAirline);
      return { ...state, airlines: { ...state.airlines, [airlineId]: newAirline }, gameLog: [`${airline.name} built hub in ${cityId}`, ...state.gameLog].slice(0, 50) };
    }

    case 'DECLARE_DIVIDEND': {
      const { airlineId, perShareAmount } = action.payload;
      const airline = state.airlines[airlineId];
      if (!airline) return state;
      const totalCost = perShareAmount * airline.sharesOutstanding;
      if (airline.treasury < totalCost) return state;
      const newPlayers = state.players.map(p => ({ ...p, cash: p.cash + (p.holdings[airlineId] || 0) * perShareAmount }));
      return { ...state, players: newPlayers, airlines: { ...state.airlines, [airlineId]: { ...airline, treasury: airline.treasury - totalCost } }, gameLog: [`${airline.name} paid $${perShareAmount}/sh div`, ...state.gameLog].slice(0, 50) };
    }

    case 'DECLARE_MA': {
      const { attackingAirlineId, targetAirlineId } = action.payload;
      return { ...state, activeMA: { attackingAirlineId, targetAirlineId, roundDeclared: state.round, roundsRemaining: 3 }, gameLog: [`${attackingAirlineId} declared M&A on ${targetAirlineId}!`, ...state.gameLog].slice(0, 50) };
    }

    case 'RESOLVE_MA': {
      if (!state.activeMA) return state;
      const attacker = state.airlines[state.activeMA.attackingAirlineId];
      const target = state.airlines[state.activeMA.targetAirlineId];
      const targetMarketCap = target.stockPrice * target.sharesOutstanding;
      if (attacker.treasury >= targetMarketCap) {
        const newPlayers = state.players.map(p => ({ ...p, cash: p.cash + (p.holdings[target.id] || 0) * target.stockPrice }));
        const newAttacker = { ...attacker, treasury: attacker.treasury - targetMarketCap, routes: [...new Set([...attacker.routes, ...target.routes])] };
        const newRouteState = { ...state.routeState };
        Object.keys(newRouteState).forEach(rId => {
          if (newRouteState[rId].primary === target.id) newRouteState[rId].primary = attacker.id;
          if (newRouteState[rId].secondary === target.id) newRouteState[rId].secondary = attacker.id;
        });
        return { ...state, players: newPlayers, routeState: newRouteState, airlines: { ...state.airlines, [attacker.id]: newAttacker, [target.id]: { ...target, isBankrupt: true, routes: [], treasury: 0, stockPrice: 0 } }, activeMA: null, gameLog: [`SUCCESS: ${attacker.name} absorbed ${target.name}!`, ...state.gameLog].slice(0, 50) };
      } else {
        return { ...state, airlines: { ...state.airlines, [attacker.id]: { ...attacker, treasury: Math.max(0, attacker.treasury - 20) } }, activeMA: null, gameLog: [`FAILURE: ${attacker.name} failed M&A. $20 penalty.`, ...state.gameLog].slice(0, 50) };
      }
    }

    case 'ADVANCE_PHASE': {
      const phases: GameState['currentPhase'][] = ['STOCK_MARKET', 'COLLECT_REVENUE', 'PLAN_ROUTES', 'PAY_EXPENSES', 'RESOLVE_BANKRUPTCY', 'DIVIDENDS', 'EVENT_CARD'];
      const nextIndex = (phases.indexOf(state.currentPhase) + 1) % phases.length;
      const nextPhase = phases[nextIndex];
      let nextRound = state.round;
      
      let nextState = { 
        ...state, 
        currentPhase: nextPhase, 
        round: nextRound, 
        currentPlayerIndex: 0, 
        currentAirlineIndex: 0, 
        passedPlayers: [], 
        gameLog: [`Phase: ${nextPhase}`, ...state.gameLog].slice(0, 50) 
      };

      if (nextPhase === 'STOCK_MARKET') { 
        nextRound++; 
        nextState.round = nextRound; 
      }

      // Automation logic
      if (nextPhase === 'COLLECT_REVENUE') {
        const newAirlines = { ...state.airlines };
        Object.values(newAirlines).forEach(a => {
          if (a.isBankrupt) return;
          const rev = calculateRevenue(state, a);
          newAirlines[a.id] = { ...a, treasury: a.treasury + rev };
        });
        nextState.airlines = newAirlines;
        nextState.gameLog = [`Automated Revenue Collection complete.`, ...nextState.gameLog];
      }

      if (nextPhase === 'PAY_EXPENSES') {
        const newAirlines = { ...state.airlines };
        Object.values(newAirlines).forEach(a => {
          if (a.isBankrupt || a.stockPrice === 0) return;
          const exp = calculateExpenses(state, a);
          newAirlines[a.id] = { ...a, treasury: a.treasury - exp };
        });
        nextState.airlines = newAirlines;
        nextState.gameLog = [`Automated Expense Payouts complete.`, ...nextState.gameLog];
      }

      if (nextPhase === 'DIVIDENDS') {
        // Handle Ghost Fleet Dividends automatically
        const newPlayers = [...state.players];
        Object.values(state.airlines).forEach(a => {
          if (a.isGhost && !a.isBankrupt) {
            const roll = Math.floor(Math.random() * 6) + 1;
            let payout = 0;
            if (roll >= 4 && roll <= 5) payout = a.ghostDividendBase;
            else if (roll === 6) payout = a.ghostDividendBase + 1;
            
            newPlayers.forEach((p, idx) => {
              const count = p.holdings[a.id] || 0;
              newPlayers[idx] = { ...p, cash: p.cash + (count * payout) };
            });
            nextState.gameLog = [`Ghost Fleet ${a.name} roll: ${roll} -> $${payout}/sh paid`, ...nextState.gameLog];
          }
        });
        nextState.players = newPlayers;
      }

      if (nextPhase === 'EVENT_CARD') {
        const type = Math.random();
        if (type < 0.4) {
           const f = Math.max(1, Math.min(5, state.fuelPrice + (Math.random() > 0.5 ? 1 : -1)));
           nextState.fuelPrice = f; 
           nextState.gameLog = [`EVENT: Fuel shifted to $${f}`, ...nextState.gameLog];
        } else if (type < 0.7) {
           const keys = Object.keys(state.cityDemand);
           const r = keys[Math.floor(Math.random() * keys.length)];
           const d = Math.min(6, (state.cityDemand[r] || 1) + 1);
           nextState.cityDemand = { ...state.cityDemand, [r]: d };
           nextState.gameLog = [`EVENT: Demand boom in ${r} (+1)`, ...nextState.gameLog];
        } else nextState.gameLog = [`EVENT: Quiet quarter.`, ...nextState.gameLog];
      }

      return nextState;
    }

    default: return state;
  }
};
