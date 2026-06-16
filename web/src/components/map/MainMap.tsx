'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl, { Map, Marker, GeoJSONSource, LngLatBounds } from 'maplibre-gl';
import { useMockData } from '@/hooks/useMockData';
import { calculateKumbaraStatus, KUMBARA_STATUS_COLORS } from '@/lib/utils';
import { FirmDetailsPanel } from './FirmDetailsPanel';
import { LayerControls } from './LayerControls';
import type { Database } from '@/types/database';

type Firm = Database['public']['Tables']['firms']['Row'];
type PiggyBank = Database['public']['Tables']['piggy_banks']['Row'];

interface MapFeature {
  type: 'Feature';
  properties: {
    firm: Firm;
    piggyBanks: PiggyBank[];
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
}

export function MainMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const { firms, piggyBanks } = useMockData();
  const [selectedFirm, setSelectedFirm] = useState<Firm | null>(null);
  const [visibleLayers, setVisibleLayers] = useState({
    firmNames: true,
    piggyBanks: true,
    toCollect: true,
    overdue: true,
    heatmap: false,
  });

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [32.8597, 39.9334], // Ankara merkez
      zoom: 10,
    });

    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    return () => {
      map.remove();
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !firms.length) return;

    const map = mapRef.current;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    firms.forEach(firm => {
      if (!firm.latitude || !firm.longitude) return;

      const firmPiggyBanks = piggyBanks.filter(pb => pb.firm_id === firm.id);
      const hasOverdue = firmPiggyBanks.some(pb => 
        calculateKumbaraStatus(pb.next_replacement_date) === 'Kırmızı'
      );
      const hasThisWeek = firmPiggyBanks.some(pb => 
        calculateKumbaraStatus(pb.next_replacement_date) === 'Turuncu'
      );

      let color: string = KUMBARA_STATUS_COLORS['Yeni'];
      if (hasOverdue) color = KUMBARA_STATUS_COLORS['Kırmızı'];
      else if (hasThisWeek) color = KUMBARA_STATUS_COLORS['Turuncu'];

      const el = document.createElement('div');
      el.className = 'marker';
      el.style.width = '30px';
      el.style.height = '30px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = color;
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      el.style.cursor = 'pointer';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.color = 'white';
      el.style.fontWeight = 'bold';
      el.style.fontSize = '12px';
      el.textContent = firmPiggyBanks.length.toString();

      const marker = new Marker(el)
        .setLngLat([firm.longitude, firm.latitude])
        .addTo(map);

      marker.getElement().addEventListener('click', () => {
        setSelectedFirm(firm);
      });

      markersRef.current.push(marker);
    });

    // Fit bounds to all markers
    if (markersRef.current.length > 0) {
      const bounds = new LngLatBounds();
      markersRef.current.forEach(marker => {
        bounds.extend(marker.getLngLat());
      });
      map.fitBounds(bounds, { padding: 50 });
    }
  }, [firms, piggyBanks, visibleLayers]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />
      <div className="absolute top-4 left-4 z-10">
        <LayerControls 
          visibleLayers={visibleLayers} 
          onChange={setVisibleLayers}
        />
      </div>
      {selectedFirm && (
        <FirmDetailsPanel 
          firm={selectedFirm}
          piggyBanks={piggyBanks.filter(pb => pb.firm_id === selectedFirm.id)}
          onClose={() => setSelectedFirm(null)}
        />
      )}
    </div>
  );
}
