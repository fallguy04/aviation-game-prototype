export interface Airline {
  id: string
  name: string
  color: string
  treasury: number
  routes: string[]        // routeIds occupying slots
  hubs: string[]          // cityIds with hubs built
  sharesOutstanding: number
  stockPrice: number      // computed: routes.length + hubs.length * 3
  isGhost: boolean
  ghostDividendBase: number  // 0, 1, or 2 per era setup
  ceoPlayerId: string | null
  isBankrupt?: boolean
  freeRoutePlacements?: number
  history?: string        // Historical context for intro popup
}

export interface Player {
  id: string
  name: string
  cash: number
  holdings: Record<string, number>  // airlineId -> share count
  isAI: boolean
}

export interface RouteSlotState {
  primary: string | null    // airlineId or null
  secondary: string | null
}

export interface MandA {
  attackingAirlineId: string
  targetAirlineId: string
  roundDeclared: number
  roundsRemaining: number
}

export interface GameState {
  players: Player[]
  airlines: Record<string, Airline>
  routeState: Record<string, RouteSlotState>
  cityDemand: Record<string, number>
  fuelPrice: number
  currentPhase: 'STOCK_MARKET' | 'COLLECT_REVENUE' | 
                'PLAN_ROUTES' | 'PAY_EXPENSES' | 
                'RESOLVE_BANKRUPTCY' | 'DIVIDENDS' | 
                'EVENT_CARD' | 'GAME_OVER'
  currentPlayerIndex: number
  currentAirlineIndex: number
  round: number
  activeMA: MandA | null
  gameLog: string[]
  passedPlayers: string[] // IDs of players who passed in current phase
  passedAirlines: string[] // IDs of airlines who passed in current phase
  currentEvent?: { title: string; description: string; effect: string } | null
  showIntro?: boolean
  eraIntro?: string
}