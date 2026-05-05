import { GameState, GameAction, Airline, RouteInstance, City, Slot } from './types';

// --- Utilities ---

export const getAirlineRoutes = (routes: RouteInstance[], airlineId: string): RouteInstance[] => {
  return routes.filter(r => r.occupants.Primary === airlineId || r.occupants.Secondary === airlineId);
};

export const calculateStockPrice = (airline: Airline, routes: RouteInstance[]): number => {
  if (airline.isBankrupt) return 0;
  const airlineRoutes = getAirlineRoutes(routes, airline.id);
  return airlineRoutes.length + (airline.hubs.length * 3);
};

export const calculateRevenue = (airline: Airline, routes: RouteInstance[], cities: City[]): number => {
  let revenue = 0;
  const airlineRoutes = getAirlineRoutes(routes, airline.id);

  airlineRoutes.forEach(route => {
    const cityA = cities.find(c => c.id === route.id.split('-')[0]); // Simplified ID assumption
    const cityB = cities.find(c => c.id === route.id.split('-')[1]);
    
    // Base Revenue: Sum of Demand Cubes
    if (cityA) revenue += cityA.demandCubes;
    if (cityB) revenue += cityB.demandCubes;

    // Hub Bonus: +$2 if route touches a hub city
    const touchesHub = airline.hubs.includes(cityA?.id || '') || airline.hubs.includes(cityB?.id || '');
    if (touchesHub) revenue += 2;

    // Fare War Penalty: -$2 if both slots occupied
    if (route.occupants.Primary && route.occupants.Secondary) {
      revenue -= 2;
    }
  });

  return revenue;
};

export const calculateExpenses = (airline: Airline, routes: RouteInstance[], fuelPrice: number): number => {
  const airlineRoutes = getAirlineRoutes(routes, airline.id);
  
  // Fuel Costs
  const fuelCosts = airlineRoutes.length * fuelPrice;

  // Hub Tax
  let hubTax = 0;
  if (airline.hubs.length >= 1) hubTax += 6;
  if (airline.hubs.length >= 2) hubTax += 8;
  if (airline.hubs.length >= 3) {
    hubTax += (airline.hubs.length - 2) * 12;
  }

  return fuelCosts + hubTax;
};

export const updateCEOs = (state: GameState): Airline[] => {
  return state.airlines.map(airline => {
    if (airline.isBankrupt) return { ...airline, ceoId: null };

    const sortedShareholders = Object.entries(airline.shareholders)
      .filter(([_, count]) => count >= 5)
      .sort((a, b) => b[1] - a[1]);

    const topShareholder = sortedShareholders[0];
    const newCeoId = topShareholder ? topShareholder[0] : null;

    return { ...airline, ceoId: newCeoId };
  });
};

// --- Reducer ---

export const gameReducer = (state: GameState, action: GameAction): GameState => {
  const log = (msg: string) => [...state.gameLog, msg];

  switch (action.type) {
    case 'BUY_STOCK': {
      const { playerId, airlineId, count } = action.payload;
      const player = state.players.find(p => p.id === playerId);
      const airline = state.airlines.find(a => a.id === airlineId);
      
      if (!player || !airline || airline.isBankrupt) return state;
      
      const price = calculateStockPrice(airline, state.routes) * count;
      if (player.cash < price) return state;

      return {
        ...state,
        players: state.players.map(p => 
          p.id === playerId ? { ...p, cash: p.cash - price } : p
        ),
        airlines: state.airlines.map(a => 
          a.id === airlineId 
            ? { 
                ...a, 
                treasury: a.treasury + price,
                sharesOutstanding: a.sharesOutstanding + count,
                shareholders: { 
                  ...a.shareholders, 
                  [playerId]: (a.shareholders[playerId] || 0) + count 
                } 
              } 
            : a
        ),
        consecutivePasses: 0,
        gameLog: log(`${player.name} bought ${count} shares of ${airline.name} for $${price}`),
      };
    }

    case 'SELL_STOCK': {
      const { playerId, airlineId, count } = action.payload;
      const player = state.players.find(p => p.id === playerId);
      const airline = state.airlines.find(a => a.id === airlineId);
      
      if (!player || !airline) return state;
      const owned = airline.shareholders[playerId] || 0;
      if (owned < count) return state;

      const price = calculateStockPrice(airline, state.routes) * count;

      return {
        ...state,
        players: state.players.map(p => 
          p.id === playerId ? { ...p, cash: p.cash + price } : p
        ),
        airlines: state.airlines.map(a => 
          a.id === airlineId 
            ? { 
                ...a, 
                shareholders: { 
                  ...a.shareholders, 
                  [playerId]: owned - count 
                } 
              } 
            : a
        ),
        consecutivePasses: 0,
        gameLog: log(`${player.name} sold ${count} shares of ${airline.name} for $${price}`),
      };
    }

    case 'PASS_PHASE': {
      const nextPasses = state.consecutivePasses + 1;
      const isLastPlayer = nextPasses >= state.players.length;
      
      if (isLastPlayer) {
        // Automatically transition to next phase if needed, or wait for NEXT_PHASE
        return {
          ...state,
          consecutivePasses: 0,
          activePlayerIndex: 0,
          gameLog: log(`All players passed. End of ${state.phase}.`),
        };
      }

      return {
        ...state,
        activePlayerIndex: (state.activePlayerIndex + 1) % state.players.length,
        consecutivePasses: nextPasses,
      };
    }

    case 'COLLECT_REVENUE': {
      if (state.phase !== 'AIRLINES_REVENUE') return state;
      
      const newAirlines = state.airlines.map(airline => {
        if (airline.isBankrupt || !airline.ceoId) {
          // Ghost Fleets are handled differently or during dividends?
          // GDD: Ghost airlines automatically pay a flat $1/share dividend from the Bank
          // They don't seem to have a treasury.
          return airline;
        }
        const revenue = calculateRevenue(airline, state.routes, state.cities);
        return { ...airline, treasury: airline.treasury + revenue };
      });

      return {
        ...state,
        airlines: newAirlines,
        gameLog: log(`Revenue collected for all active airlines.`),
      };
    }

    case 'ADD_ROUTE': {
      const { airlineId, routeId, slot } = action.payload;
      const airline = state.airlines.find(a => a.id === airlineId);
      if (!airline || airline.isBankrupt) return state;

      return {
        ...state,
        routes: state.routes.map(r => 
          r.id === routeId 
            ? { ...r, occupants: { ...r.occupants, [slot]: airlineId } } 
            : r
        ),
        gameLog: log(`${airline.name} added route ${routeId}`),
      };
    }

    case 'REMOVE_ROUTE': {
      const { airlineId, routeId, slot } = action.payload;
      return {
        ...state,
        routes: state.routes.map(r => 
          (r.id === routeId && r.occupants[slot] === airlineId)
            ? { ...r, occupants: { ...r.occupants, [slot]: undefined } } 
            : r
        ),
        gameLog: log(`${airlineId} removed route ${routeId}`),
      };
    }

    case 'BUILD_HUB': {
      const { airlineId, cityId } = action.payload;
      const airline = state.airlines.find(a => a.id === airlineId);
      if (!airline || airline.treasury < 15) return state;

      return {
        ...state,
        airlines: state.airlines.map(a => 
          a.id === airlineId 
            ? { ...a, treasury: a.treasury - 15, hubs: [...a.hubs, cityId] } 
            : a
        ),
        gameLog: log(`${airline.name} built a hub at ${cityId}`),
      };
    }

    case 'PAY_EXPENSES': {
      let newPlayers = [...state.players];
      const newAirlines = state.airlines.map(airline => {
        if (airline.isBankrupt || !airline.ceoId) return airline;
        const expenses = calculateExpenses(airline, state.routes, state.fuelPrice);
        const newTreasury = airline.treasury - expenses;
        
        if (newTreasury < 0) {
          // Trigger Bankruptcy: Shareholders get $1/share from Bank
          Object.entries(airline.shareholders).forEach(([playerId, shares]) => {
            newPlayers = newPlayers.map(p => 
              p.id === playerId ? { ...p, cash: p.cash + shares } : p
            );
          });
          return { ...airline, treasury: 0, isBankrupt: true, hubs: [], ceoId: null };
        }
        return { ...airline, treasury: newTreasury };
      });

      // Remove routes of bankrupt airlines
      const bankruptIds = newAirlines.filter(a => a.isBankrupt).map(a => a.id);
      const newRoutes = state.routes.map(r => ({
        ...r,
        occupants: {
          Primary: bankruptIds.includes(r.occupants.Primary || '') ? undefined : r.occupants.Primary,
          Secondary: bankruptIds.includes(r.occupants.Secondary || '') ? undefined : r.occupants.Secondary,
        }
      }));

      return {
        ...state,
        players: newPlayers,
        airlines: newAirlines,
        routes: newRoutes,
        gameLog: log(`Expenses paid. Check for bankruptcies complete.`),
      };
    }

    case 'DECLARE_MA': {
      const { attackerId, targetId } = action.payload;
      const attacker = state.airlines.find(a => a.id === attackerId);
      const target = state.airlines.find(a => a.id === targetId);
      if (!attacker || !target || target.isBankrupt) return state;

      return {
        ...state,
        airlines: state.airlines.map(a => 
          a.id === attackerId 
            ? { 
                ...a, 
                takeoverInProgress: { 
                  targetAirlineId: targetId, 
                  roundsRemaining: 3, 
                  attackerTreasuryAtStart: a.treasury 
                } 
              } 
            : a
        ),
        gameLog: log(`${attacker.name} launched a takeover bid for ${target.name}`),
      };
    }

    case 'RELAUNCH_AIRLINE': {
      const { airlineId, playerId, bid } = action.payload;
      const airline = state.airlines.find(a => a.id === airlineId);
      const player = state.players.find(p => p.id === playerId);
      if (!airline || !airline.isBankrupt || !player || player.cash < bid) return state;

      return {
        ...state,
        players: state.players.map(p => p.id === playerId ? { ...p, cash: p.cash - bid } : p),
        airlines: state.airlines.map(a => 
          a.id === airlineId 
            ? { 
                ...a, 
                isBankrupt: false, 
                treasury: bid, 
                sharesOutstanding: 3, 
                shareholders: { [playerId]: 3 },
                ceoId: playerId 
              } 
            : a
        ),
        gameLog: log(`${player.name} relaunched ${airline.name} with a bid of $${bid}`),
      };
    }

    case 'DECLARE_DIVIDEND': {
      const { airlineId, amountPerShare } = action.payload;
      const airline = state.airlines.find(a => a.id === airlineId);
      if (!airline) return state;

      const totalPayout = amountPerShare * airline.sharesOutstanding;
      if (airline.treasury < totalPayout) return state;

      const newPlayers = state.players.map(player => {
        const shares = airline.shareholders[player.id] || 0;
        return { ...player, cash: player.cash + (shares * amountPerShare) };
      });

      return {
        ...state,
        players: newPlayers,
        airlines: state.airlines.map(a => 
          a.id === airlineId ? { ...a, treasury: a.treasury - totalPayout } : a
        ),
        gameLog: log(`${airline.name} declared dividend of $${amountPerShare}/share`),
      };
    }

    case 'NEXT_PHASE': {
      const phases: TurnPhase[] = [
        'STOCK_MARKET',
        'AIRLINES_REVENUE',
        'AIRLINES_PLANNING',
        'AIRLINES_EXPENSES',
        'AIRLINES_DIVIDENDS',
        'EVENT_ADMIN'
      ];
      const currentIndex = phases.indexOf(state.phase);
      let nextPhase = phases[(currentIndex + 1) % phases.length];
      let nextTurn = state.currentTurn;

      if (nextPhase === 'STOCK_MARKET') {
        nextTurn++;
      }

      let nextAirlines = [...state.airlines];
      let nextPlayers = [...state.players];
      let nextRoutes = [...state.routes];
      let nextLog = [...state.gameLog];

      // --- END OF PHASE LOGIC ---

      if (state.phase === 'AIRLINES_PLANNING') {
        // Resolve M&A Countdown
        nextAirlines = nextAirlines.map(attacker => {
          if (!attacker.takeoverInProgress) return attacker;

          const { targetAirlineId, roundsRemaining } = attacker.takeoverInProgress;
          const target = state.airlines.find(a => a.id === targetAirlineId);
          
          if (!target || target.isBankrupt) {
            return { ...attacker, takeoverInProgress: undefined };
          }

          if (roundsRemaining > 1) {
            return { 
              ...attacker, 
              takeoverInProgress: { ...attacker.takeoverInProgress, roundsRemaining: roundsRemaining - 1 } 
            };
          }

          // RESOLVE AT END OF ROUND 3 (roundsRemaining === 1 here)
          const targetPrice = calculateStockPrice(target, state.routes);
          
          // M&A threshold for Ghost Fleets is Stock Price x 5
          const isGhost = !target.ceoId;
          const targetMarketCap = isGhost ? targetPrice * 5 : targetPrice * target.sharesOutstanding;

          if (attacker.treasury >= targetMarketCap) {
            // SUCCESS
            nextLog.push(`SUCCESS: ${attacker.name} has acquired ${target.name}!`);
            
            // Absorbs routes
            nextRoutes = nextRoutes.map(r => ({
              ...r,
              occupants: {
                Primary: r.occupants.Primary === target.id ? attacker.id : r.occupants.Primary,
                Secondary: r.occupants.Secondary === target.id ? attacker.id : r.occupants.Secondary,
              }
            }));

            // Payout target shareholders
            Object.entries(target.shareholders).forEach(([pid, shares]) => {
              const payout = shares * targetPrice;
              nextPlayers = nextPlayers.map(p => p.id === pid ? { ...p, cash: p.cash + payout } : p);
            });

            // Target ceases to exist
            nextAirlines = nextAirlines.map(a => a.id === target.id ? { ...a, isBankrupt: true, ceoId: null } : a);

            return { ...attacker, treasury: attacker.treasury - targetMarketCap, takeoverInProgress: undefined };
          } else {
            // FAILURE: $20 penalty
            nextLog.push(`FAILURE: ${attacker.name} failed to acquire ${target.name}. $20 penalty paid.`);
            return { ...attacker, treasury: Math.max(0, attacker.treasury - 20), takeoverInProgress: undefined };
          }
        });
      }

      if (state.phase === 'AIRLINES_DIVIDENDS') {
        // Ghost Fleet Payouts (D6 Volatility Roll)
        const roll = Math.floor(Math.random() * 6) + 1;

        nextAirlines.forEach(a => {
          if (!a.isBankrupt && !a.ceoId) {
            const baseDividend = state.eraSetup.ghostBaseDividend[a.id] ?? 1;
            let finalPayoutPerShare = 0;

            if (roll >= 4 && roll <= 5) {
              finalPayoutPerShare = baseDividend;
            } else if (roll === 6) {
              finalPayoutPerShare = baseDividend + 1;
            }

            if (finalPayoutPerShare > 0) {
              nextLog.push(`Ghost Fleet ${a.name} pays $${finalPayoutPerShare}/share (Roll: ${roll}, Base: ${baseDividend})`);
              nextPlayers = nextPlayers.map(p => {
                const shares = a.shareholders[p.id] || 0;
                return { ...p, cash: p.cash + (shares * finalPayoutPerShare) };
              });
            } else {
              nextLog.push(`Ghost Fleet ${a.name} pays $0 (Roll: ${roll}, Stagnation)`);
            }
          }
        });

        // Set lastRoll and continue to updateCEOs if next phase is EVENT_ADMIN
        state.lastRoll = roll; 
      }

      if (nextPhase === 'EVENT_ADMIN') {
        nextAirlines = updateCEOs({ ...state, airlines: nextAirlines });
      }

      return {
        ...state,
        phase: nextPhase,
        currentTurn: nextTurn,
        airlines: nextAirlines,
        players: nextPlayers,
        routes: nextRoutes,
        gameLog: nextLog,
      };
    }

    default:
      return state;
  }
};
