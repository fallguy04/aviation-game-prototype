import { GameState, Player, Airline } from '../types/GameTypes';
import { GameAction } from '../store/gameReducer';
import { ROUTES } from '../data/routeData';

const calculateExpectedGhostYield = (airline: Airline): number => {
  if (!airline.isGhost) return 0;
  // Ghost dividend roll: 1-3: $0, 4-5: base, 6: base + 1
  const expectedDiv = (0 * 3 + airline.ghostDividendBase * 2 + (airline.ghostDividendBase + 1) * 1) / 6;
  return airline.stockPrice > 0 ? expectedDiv / airline.stockPrice : 0;
};

export const getAIAction = (state: GameState, player: Player): GameAction => {
  const airlineList = Object.values(state.airlines);
  const activeCEOAirline = airlineList.find(a => a.ceoPlayerId === player.id);

  if (state.currentPhase === 'STOCK_MARKET') {
    // 1. Can we FOUND a Live airline?
    const liveAirlines = airlineList.filter(a => !a.isGhost && !a.isBankrupt);
    for (const a of liveAirlines) {
      if (a.stockPrice === 0 && player.cash >= 10) {
        return { type: 'FOUND_AIRLINE', payload: { airlineId: a.id, playerId: player.id } };
      }
      const owned = player.holdings[a.id] || 0;
      if (owned < 5 && player.cash >= a.stockPrice && a.stockPrice > 0) {
        return { type: 'BUY_STOCK', payload: { airlineId: a.id, playerId: player.id, shares: 1 } };
      }
    }

    // 2. Buy high-yield ghost stocks if we have decent cash
    const ghostAirlines = airlineList.filter(a => a.isGhost && !a.isBankrupt).sort((a, b) => calculateExpectedGhostYield(b) - calculateExpectedGhostYield(a));
    if (ghostAirlines.length > 0) {
      const bestGhost = ghostAirlines[0];
      const yieldScore = calculateExpectedGhostYield(bestGhost);
      if (yieldScore > 0.08 && player.cash >= bestGhost.stockPrice + 10) { // Keep $10 buffer
        return { type: 'BUY_STOCK', payload: { airlineId: bestGhost.id, playerId: player.id, shares: 1 } };
      }
    }

    // 3. Sell poorly performing stocks if cash is low and not a CEO
    if (player.cash < 10) {
      for (const [aid, count] of Object.entries(player.holdings)) {
        if (count > 0 && state.airlines[aid] && state.airlines[aid].isGhost) {
           const yieldScore = calculateExpectedGhostYield(state.airlines[aid]);
           if (yieldScore < 0.1) {
             return { type: 'SELL_STOCK', payload: { airlineId: aid, playerId: player.id, shares: 1 } };
           }
        }
      }
    }

    // Default to PASS
    return { type: 'PASS_TURN', payload: { playerId: player.id } };
  }

  if (state.currentPhase === 'PLAN_ROUTES') {
    if (!activeCEOAirline) {
      return { type: 'ADVANCE_PHASE' };
    }

    // Calculate projected expenses
    const projectedFuel = (activeCEOAirline.routes.length + 1) * state.fuelPrice;
    let hubTax = 0;
    activeCEOAirline.hubs.forEach((_, i) => hubTax += (i === 0 ? 6 : i === 1 ? 8 : 12));
    const projectedExpenses = projectedFuel + hubTax;

    // Check if we can safely build a hub
    if (activeCEOAirline.hubs.length === 0 && activeCEOAirline.treasury >= 15 + projectedExpenses) {
      // Pick a high-demand city for a hub, ideally one where we have a route or just a generic good one
      const hubCandidates = ['ATL', 'ORD', 'DFW', 'LAX', 'JFK', 'MIA', 'DEN'];
      for (const city of hubCandidates) {
        if (!airlineList.some(a => a.hubs.includes(city))) {
          return { type: 'BUILD_HUB', payload: { airlineId: activeCEOAirline.id, cityId: city } };
        }
      }
    }

    // Check if we can expand routes
    if (activeCEOAirline.freeRoutePlacements! > 0 || activeCEOAirline.treasury > projectedExpenses + 10) {
      // Find a route connected to current network, or any high demand route
      const networkCities = new Set<string>(activeCEOAirline.hubs);
      activeCEOAirline.routes.forEach(rId => {
        const route = ROUTES.find(r => r.id === rId);
        if (route) { networkCities.add(route.from); networkCities.add(route.to); }
      });

      // Find an unoccupied slot on a route connecting to networkCities
      for (const route of ROUTES) {
        if (networkCities.has(route.from) || networkCities.has(route.to) || networkCities.size === 0) {
           const stateSlot = state.routeState[route.id];
           if (stateSlot && stateSlot.primary !== activeCEOAirline.id && stateSlot.secondary !== activeCEOAirline.id) {
             if (!stateSlot.primary) {
               return { type: 'PLACE_ROUTE', payload: { airlineId: activeCEOAirline.id, routeId: route.id, slot: 'primary' } };
             } else if (!stateSlot.secondary) {
               return { type: 'PLACE_ROUTE', payload: { airlineId: activeCEOAirline.id, routeId: route.id, slot: 'secondary' } };
             }
           }
        }
      }
    }

    // If nothing else, pass
    return { type: 'ADVANCE_PHASE' };
  }

  if (state.currentPhase === 'DIVIDENDS') {
    if (!activeCEOAirline) {
      return { type: 'ADVANCE_PHASE' };
    }

    // Calculate buffer needed
    const projectedFuel = activeCEOAirline.routes.length * state.fuelPrice;
    let hubTax = 0;
    activeCEOAirline.hubs.forEach((_, i) => hubTax += (i === 0 ? 6 : i === 1 ? 8 : 12));
    const safeBuffer = projectedFuel + hubTax + 15; // keep 15 for a hub or expansion buffer

    if (activeCEOAirline.treasury > safeBuffer) {
      const excess = activeCEOAirline.treasury - safeBuffer;
      const dividendPerShare = Math.floor(excess / activeCEOAirline.sharesOutstanding);
      if (dividendPerShare > 0) {
        return { type: 'DECLARE_DIVIDEND', payload: { airlineId: activeCEOAirline.id, perShareAmount: dividendPerShare } };
      }
    }
    
    // Default pay 0 and pass
    return { type: 'DECLARE_DIVIDEND', payload: { airlineId: activeCEOAirline.id, perShareAmount: 0 } };
  }

  // Auto-advance for phases where AI doesn't have active choices
  return { type: 'ADVANCE_PHASE' };
};
