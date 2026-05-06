import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CITIES as STATIC_CITIES, ROUTES, CityTier } from './data/routeData';

interface MapComponentProps {
  routeState: Record<string, { primary: string | null; secondary: string | null }>;
  cityDemand?: Record<string, number>;
  onSlotClick: (routeId: string, slot: 'primary' | 'secondary') => void;
  onCityClick: (cityId: string) => void;
  airlineColors: Record<string, string>;
  airlineHubs: Record<string, string[]>;
  activeAirlineId: string | null;
  isPlanning: boolean;
}

const AIRLINE_CODES: Record<string, string> = {
  Continental: 'CO', Eastern: 'EA', PanAm: 'PA', TWA: 'TW', Braniff: 'BN', Northeast: 'NE',
  Southwest: 'WN', Piedmont: 'PI', American: 'AA', United: 'UA', Delta: 'DL', JetBlue: 'B6', Spirit: 'NK', Alaska: 'AS'
};

const getContrastColor = (hexcolor: string) => {
  if (!hexcolor || hexcolor.length < 6) return 'white';
  const r = parseInt(hexcolor.slice(1, 3), 16);
  const g = parseInt(hexcolor.slice(3, 5), 16);
  const b = parseInt(hexcolor.slice(5, 7), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? 'black' : 'white';
};

const MapComponent: React.FC<MapComponentProps> = ({
  routeState, cityDemand = {}, onSlotClick, onCityClick, airlineColors, airlineHubs, activeAirlineId, isPlanning
}) => {
  const [viewTransform, setViewTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hasMoved, setHasMoved] = useState(false);
  const [geoData, setGeoData] = useState<{ states: any; nation: any } | null>(null);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const svgRef = useRef<SVGSVGElement>(null);

  const d3 = (window as any).d3;
  const topojson = (window as any).topojson;

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!topojson) return;
    fetch('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json')
      .then(res => res.json())
      .then(data => {
        const states = topojson.feature(data, data.objects.states);
        states.features = states.features.filter((f: any) => f.id !== '02' && f.id !== '15');
        const nation = topojson.feature(data, data.objects.nation);
        setGeoData({ states, nation });
      });
  }, [topojson]);

  const projection = useMemo(() => {
    if (!d3 || !geoData || typeof d3.geoAlbersUsa !== 'function') return null;
    return d3.geoAlbersUsa().fitSize([windowSize.width, windowSize.height], geoData.states);
  }, [d3, geoData, windowSize]);

  const pathGenerator = useMemo(() => {
    if (!d3 || !projection) return null;
    return d3.geoPath().projection(projection);
  }, [d3, projection]);

  const CITIES = useMemo(() => {
    if (!projection) return [];
    return STATIC_CITIES.map(city => {
      const coords = projection([city.lon, city.lat]);
      return {
        ...city,
        x: coords ? coords[0] : -100,
        y: coords ? coords[1] : -100
      };
    });
  }, [projection]);

  const getCityPos = (id: string) => CITIES.find(c => c.id === id) || { x: 0, y: 0 };

  const getRadius = (tier: CityTier, demandCount: any) => {
    const base = tier === 'Mega-Hub' ? 8 : tier === 'Focus City' ? 6 : 4;
    const count = typeof demandCount === 'number' ? demandCount : 0;
    if (count >= 5) return base + 6;
    if (count >= 3) return base + 4;
    if (count >= 1) return base + 2;
    return base;
  };

  const handleWheel = (e: React.WheelEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const zoomSpeed = 0.0015;
    const delta = e.deltaY * -zoomSpeed;
    const newScale = Math.min(Math.max(viewTransform.scale + delta, 0.8), 4);
    const scaleRatio = newScale / viewTransform.scale;
    const newX = mouseX - (mouseX - viewTransform.x) * scaleRatio;
    const newY = mouseY - (mouseY - viewTransform.y) * scaleRatio;
    setViewTransform({ x: newX, y: newY, scale: newScale });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as SVGElement;
    if (target.tagName === 'line' || target.tagName === 'circle') return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - viewTransform.x, y: e.clientY - viewTransform.y });
    setHasMoved(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    if (Math.abs(dx - viewTransform.x) > 10 || Math.abs(dy - viewTransform.y) > 10) setHasMoved(true);
    setViewTransform(prev => ({ ...prev, x: dx, y: dy }));
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'fixed', inset: 0, overflow: 'hidden', background: '#D4E6F1' }}>
      <svg 
        ref={svgRef} width="100%" height="100%"
        onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
        style={{ cursor: isDragging ? 'grabbing' : 'grab', background: '#D4E6F1' }}
      >
        <g transform={`translate(${viewTransform.x}, ${viewTransform.y}) scale(${viewTransform.scale})`}>
          <rect width={windowSize.width * 2} height={windowSize.height * 2} x={-windowSize.width} y={-windowSize.height} fill="#D4E6F1" />
          
          {geoData && pathGenerator && (
            <g>
              {geoData.states.features.map((feature: any, i: number) => (
                <path 
                  key={`state-${i}`} 
                  d={pathGenerator(feature)} 
                  fill="#E8EDF2" 
                  stroke="#C5CDD8" 
                  strokeWidth="0.4" 
                />
              ))}
            </g>
          )}

          {ROUTES.map(route => {
            const from = getCityPos(route.from);
            const to = getCityPos(route.to);
            if (from.x < 0 || to.x < 0) return null;

            const state = routeState[route.id] || { primary: null, secondary: null };
            const dx = to.x - from.x; const dy = to.y - from.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            if (length === 0) return null;
            const nx = -dy / length; const ny = dx / length;
            const isDual = state.primary && state.secondary;
            const offset = isDual ? 2 : 0;

            const renderPill = (airlineId: string, slot: 'primary' | 'secondary') => {
              if (length < 60) return null;
              const mx = (from.x + to.x) / 2; const my = (from.y + to.y) / 2;
              const sOff = slot === 'primary' ? -2 : 2;
              const airlineColor = airlineColors[airlineId] || '#CCCCCC';
              const contrastColor = getContrastColor(airlineColor);
              const displayCode = AIRLINE_CODES[airlineId] || airlineId.substring(0, 2).toUpperCase();

              return (
                <g transform={`translate(${mx - nx * sOff}, ${my - ny * sOff})`} pointerEvents="none">
                  <rect x="-6" y="-5" width="12" height="10" rx="3" fill={airlineColor} />
                  <text textAnchor="middle" y="3" fill={contrastColor} fontSize="8" fontWeight="bold" style={{ pointerEvents: 'none' }}>{displayCode}</text>
                </g>
              );
            };

            const isPulsing = (airlineId: string | null) => isPlanning && airlineId === activeAirlineId;

            return (
              <g key={route.id}>
                <line 
                  x1={from.x - nx * offset} y1={from.y - ny * offset} x2={to.x - nx * offset} y2={to.y - ny * offset}
                  stroke={state.primary ? airlineColors[state.primary] : '#CFD8DC'} 
                  strokeWidth={state.primary ? 3 : 1.5} strokeOpacity={state.primary ? 0.9 : 0.4} strokeDasharray={state.primary ? "none" : "4 4"}
                  className={isPulsing(state.primary) ? 'route-pulse' : ''}
                  pointerEvents="none"
                />
                {state.primary && renderPill(state.primary, 'primary')}
                
                <line 
                  x1={from.x + nx * offset} y1={from.y + ny * offset} x2={to.x + nx * offset} y2={to.y + ny * offset}
                  stroke={state.secondary ? airlineColors[state.secondary] : '#CFD8DC'} 
                  strokeWidth={state.secondary ? 3 : 1.5} strokeOpacity={state.secondary ? 0.9 : 0.4} strokeDasharray={state.secondary ? "none" : "4 4"}
                  className={isPulsing(state.secondary) ? 'route-pulse' : ''}
                  pointerEvents="none"
                />
                {state.secondary && renderPill(state.secondary, 'secondary')}

                {/* Hitboxes for easier clicking - Rendered LAST to be on top */}
                <line 
                  x1={from.x - nx * offset} y1={from.y - ny * offset} x2={to.x - nx * offset} y2={to.y - ny * offset}
                  stroke="transparent" strokeWidth="15" 
                  style={{ cursor: isPlanning && (!state.primary || state.primary === activeAirlineId) ? 'crosshair' : 'default' }}
                  onClick={() => !hasMoved && onSlotClick(route.id, 'primary')} 
                />
                <line 
                  x1={from.x + nx * offset} y1={from.y + ny * offset} x2={to.x + nx * offset} y2={to.y + ny * offset}
                  stroke="transparent" strokeWidth="15" 
                  style={{ cursor: isPlanning && (!state.secondary || state.secondary === activeAirlineId) ? 'crosshair' : 'default' }}
                  onClick={() => !hasMoved && onSlotClick(route.id, 'secondary')} 
                />
              </g>
            );
          })}

          {CITIES.map(city => {
            if (city.x < 0) return null;
            const demand = cityDemand[city.id] !== undefined ? cityDemand[city.id] : 1;
            const radius = getRadius(city.tier, demand);
            let hubAirlineId: string | null = null;
            Object.entries(airlineHubs).forEach(([aid, hubs]) => { if (hubs.includes(city.id)) hubAirlineId = aid; });
            
            // Render demand cubes (small squares)
            const renderCubes = () => {
              const cubes = [];
              const cubeSize = 4;
              const spacing = 1;
              for (let i = 0; i < (demand || 0); i++) {
                const ox = (i % 3) * (cubeSize + spacing) - 7;
                const oy = Math.floor(i / 3) * (cubeSize + spacing) - radius - 12;
                cubes.push(
                  <rect 
                    key={`cube-${city.id}-${i}`}
                    x={city.x + ox}
                    y={city.y + oy}
                    width={cubeSize}
                    height={cubeSize}
                    fill="#1A237E"
                    opacity="0.8"
                    pointerEvents="none"
                  />
                );
              }
              return cubes;
            };

            return (
              <g key={city.id} style={{ cursor: 'pointer' }} onClick={() => !hasMoved && onCityClick(city.id)}>
                {renderCubes()}
                {hubAirlineId && <circle cx={city.x} cy={city.y} r={radius + 5} stroke={airlineColors[hubAirlineId]} strokeWidth="2" fill="none" />}
                <circle cx={city.x} cy={city.y} r={radius} fill="white" stroke="#455A64" strokeWidth="1.5" />
                {hubAirlineId && <rect x={city.x - 2} y={city.y - 2} width="4" height="4" transform={`rotate(45, ${city.x}, ${city.y})`} fill={airlineColors[hubAirlineId]} />}
                <text x={city.x} y={city.y + radius + 10} textAnchor="middle" fill="#263238" fontSize="9" fontFamily="Arial" style={{ userSelect: 'none' }}>{city.name}</text>
              </g>
            );
          })}
        </g>
      </svg>
      
      {/* Zoom Controls */}
      <div style={{ position: 'absolute', bottom: '12px', left: '12px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <button onClick={() => setViewTransform(p => ({ ...p, scale: Math.min(p.scale + 0.2, 4) }))} style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.92)', border: '0.5px solid #B0BEC5', borderRadius: '8px', fontSize: '16px', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>+</button>
        <button onClick={() => setViewTransform(p => ({ ...p, scale: Math.max(p.scale - 0.2, 0.8) }))} style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.92)', border: '0.5px solid #B0BEC5', borderRadius: '8px', fontSize: '16px', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>-</button>
        <button onClick={() => setViewTransform({ x: 0, y: 0, scale: 1 })} style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.92)', border: '0.5px solid #B0BEC5', borderRadius: '8px', fontSize: '16px', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>⌂</button>
      </div>

      <style>{`
        @keyframes routePulse {
          0% { opacity: 0.7; }
          50% { opacity: 1; }
          100% { opacity: 0.7; }
        }
        .route-pulse {
          animation: routePulse 2s ease infinite;
        }
        line:hover {
          opacity: 1.0 !important;
        }
      `}</style>
    </div>
  );
};

export default MapComponent;
