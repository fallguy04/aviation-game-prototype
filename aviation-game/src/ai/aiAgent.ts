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
  
  // In operational phases, AI must act for the airline at currentAirlineIndex
  const operationalActiveAirline = airlineList[state.currentAirlineIndex];
  const activeCEOAirline = (['PLAN_ROUTES', 'DIVIDENDS'].includes(state.currentPhase)) 
    ? (operationalActiveAirline?.ceoPlayerId === player.id ? operationalActiveAirline : null)
    : airlineList.find(a => a.ceoPlayerId === player.id);

  if (state.currentPhase === 'STOCK_MARKET') {
    // 1. Can we FOUND a Live airline?
    const startUps = airlineList.filter(a => !a.isGhost && !a.isBankrupt && !a.ceoPlayerId);
    for (const a of startUps) {
      if (player.cash >= 10) {
        return { type: 'FOUND_AIRLINE', payload: { airlineId: a.id, playerId: player.id } };
      }
    }

    // 2. Strategic Stock Selection
    const candidates = airlineList.filter(a => !a.isBankrupt && a.stockPrice > 0);
    
    // Score each candidate
    const scored = candidates.map(a => {
      // Base score: Projected Yield (Net Revenue / Stock Price)
      // Note: In board game terms, high revenue / low price is the goal
      const rev = a.routes.length * 4; // Simplified estimated revenue
      const yieldScore = a.stockPrice > 0 ? rev / a.stockPrice : 0;
      
      // Competition Penalty: How many other players own this?
      const rivals = state.players.filter(p => p.id !== player.id && (p.holdings[a.id] || 0) > 0).length;
      
      // CEO Potential: If we are close to 5 shares, high bonus
      const currentOwned = player.holdings[a.id] || 0;
      const ceoBonus = (currentOwned >= 3 && currentOwned < 5) ? 5 : 0;

      const finalScore = yieldScore - (rivals * 0.5) + ceoBonus + (Math.random() * 0.5);
      return { airlineId: a.id, score: finalScore, price: a.stockPrice };
    });

    scored.sort((a, b) => b.score - a.score);

    for (const c of scored) {
      if (player.cash >= c.price + 5) { // Keep small buffer
        return { type: 'BUY_STOCK', payload: { airlineId: c.airlineId, playerId: player.id, shares: 1 } };
      }
    }

    // 3. Sell poorly performing stocks if cash is low
    if (player.cash < 5) {
      for (const [aid, count] of Object.entries(player.holdings)) {
        if (count > 0) {
           return { type: 'SELL_STOCK', payload: { airlineId: aid, playerId: player.id, shares: 1 } };
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
    const calculateExp = (a: Airline) => {
      const fuel = a.routes.length * state.fuelPrice;
      let tax = 0;
      a.hubs.forEach((_, i) => {
        const multiplier = (i === 0 ? 2 : i === 1 ? 3 : 5);
        tax += multiplier * state.fuelPrice;
      });
      return fuel + tax;
    };
    
    const projectedExpenses = calculateExp(activeCEOAirline) + state.fuelPrice; // +1 route buffer

    // Check if we can build a hub (up to 3 hubs)
    // AI is more aggressive about hubs now because they grant 2 free placements
    if (activeCEOAirline.hubs.length < 3 && activeCEOAirline.treasury >= 15 + projectedExpenses + 10) {
      const hubCandidates = ['ATL', 'ORD', 'DFW', 'LAX', 'JFK', 'MIA', 'DEN', 'SEA', 'SFO', 'PHX'];
      for (const city of hubCandidates) {
        if (!airlineList.some(a => a.hubs.includes(city))) {
          return { type: 'BUILD_HUB', payload: { airlineId: activeCEOAirline.id, cityId: city } };
        }
      }
    }

    // Check if we can expand routes
    const hasFree = (activeCEOAirline.freeRoutePlacements || 0) > 0;
    if (hasFree || activeCEOAirline.treasury > projectedExpenses + 20) {
      const networkCities = new Set<string>(activeCEOAirline.hubs);
      activeCEOAirline.routes.forEach(rId => {
        const route = ROUTES.find(r => r.id === rId);
        if (route) { networkCities.add(route.from); networkCities.add(route.to); }
      });

      // Prioritize high-demand routes and routes connected to our hubs
      const sortedRoutes = [...ROUTES].sort((a, b) => {
        const demandA = (state.cityDemand[a.from] || 1) + (state.cityDemand[a.to] || 1);
        const demandB = (state.cityDemand[b.from] || 1) + (state.cityDemand[b.to] || 1);
        const scoreA = demandA + (activeCEOAirline.hubs.includes(a.from) || activeCEOAirline.hubs.includes(a.to) ? 8 : 0);
        const scoreB = demandB + (activeCEOAirline.hubs.includes(b.from) || activeCEOAirline.hubs.includes(b.to) ? 8 : 0);
        return scoreB - scoreA;
      });

      for (const route of sortedRoutes) {
        if (networkCities.has(route.from) || networkCities.has(route.to) || networkCities.size === 0) {
           const stateSlot = state.routeState[route.id];
           if (stateSlot) {
             // AI can only take a slot if it doesn't ALREADY own a slot on this route
             if (stateSlot.primary === activeCEOAirline.id || stateSlot.secondary === activeCEOAirline.id) {
               continue;
             }

             // Take primary if empty
             if (!stateSlot.primary) {
               return { type: 'PLACE_ROUTE', payload: { airlineId: activeCEOAirline.id, routeId: route.id, slot: 'primary' } };
             } 
             // Take secondary if empty (and we don't own primary, which is checked above)
             else if (!stateSlot.secondary) {
               return { type: 'PLACE_ROUTE', payload: { airlineId: activeCEOAirline.id, routeId: route.id, slot: 'secondary' } };
             }
           }
        }
      }
    }
// If nothing else, pass
return { type: 'PASS_TURN', payload: { airlineId: activeCEOAirline.id } };
}

if (state.currentPhase === 'DIVIDENDS') {
  if (!activeCEOAirline) {
    return { type: 'PASS_TURN', payload: { playerId: player.id } };
  }

  // Calculate buffer needed (Current expenses + next round expansion buffer)
  const calculateExp = (a: Airline) => {
    const fuel = a.routes.length * state.fuelPrice;
    let tax = 0;
    a.hubs.forEach((_, i) => {
      const multiplier = (i === 0 ? 2 : i === 1 ? 3 : 5);
      tax += multiplier * state.fuelPrice;
    });
    return fuel + tax;
  };

  const safeBuffer = calculateExp(activeCEOAirline) + 20;

  if (activeCEOAirline.treasury > safeBuffer) {
    const excess = activeCEOAirline.treasury - safeBuffer;
    const dividendPerShare = Math.floor(excess / activeCEOAirline.sharesOutstanding);
    if (dividendPerShare > 0) {
      return { type: 'DECLARE_DIVIDEND', payload: { airlineId: activeCEOAirline.id, perShareAmount: dividendPerShare } };
    }
  }

  return { type: 'PASS_TURN', payload: { airlineId: activeCEOAirline.id } };
}

  // Final Fallback for Operational Phases
  if (['PLAN_ROUTES', 'DIVIDENDS'].includes(state.currentPhase)) {
    if (activeCEOAirline) {
      return { type: 'PASS_TURN', payload: { airlineId: activeCEOAirline.id } };
    }
    const currentAirline = Object.values(state.airlines)[state.currentAirlineIndex];
    return { type: 'PASS_TURN', payload: { airlineId: currentAirline?.id } };
  }
  
  if (state.currentPhase === 'STOCK_MARKET') {
    return { type: 'PASS_TURN', payload: { playerId: player.id } };
  }

  return { type: 'ADVANCE_PHASE' };
};
