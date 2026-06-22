'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl, { Map, Marker, GeoJSONSource, LngLatBounds, Popup } from 'maplibre-gl';
import { calculateKumbaraStatus, KUMBARA_STATUS_COLORS } from '@/lib/utils';
import { FirmDetailsPanel } from './FirmDetailsPanel';
import { LayerControls } from './LayerControls';
import type { Database } from '@/types/database';

type Firma = Database['public']['Tables']['firms']['Row'];
type Kumbara = Database['public']['Tables']['piggy_banks']['Row'];

interface MainMapProps {
  firmalar: Firma[];
  kumbaralar: Kumbara[];
  locationMode?: boolean;
  onLocationSelect?: (lat: number, lng: number) => void;
}

export function MainMap({ firmalar, kumbaralar, locationMode = false, onLocationSelect }: MainMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const locationMarkerRef = useRef<Marker | null>(null);
  const isInitialLoadRef = useRef(true); // Sadece ilk yüklemede zoom yap
  const [selectedFirm, setSelectedFirm] = useState<Firma | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
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

    // Harita hazır olduğunda initial flag'i false yap
    map.on('load', () => {
      isInitialLoadRef.current = false;
    });

    // Location mode click handler
    if (locationMode) {
      map.getCanvas().style.cursor = 'crosshair';
      
      map.on('click', (e) => {
        const { lng, lat } = e.lngLat;
        setSelectedLocation({ lat, lng });

        // Update or create location marker
        if (locationMarkerRef.current) {
          locationMarkerRef.current.remove();
        }

        const el = document.createElement('div');
        el.style.width = '20px';
        el.style.height = '20px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = '#3b82f6';
        el.style.border = '3px solid white';
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';

        const marker = new Marker({ color: '#3b82f6' })
          .setLngLat([lng, lat])
          .addTo(map);

        locationMarkerRef.current = marker;

        // Notify parent component
        if (onLocationSelect) {
          onLocationSelect(lat, lng);
        }
      });
    }

    return () => {
      map.remove();
    };
  }, [locationMode, onLocationSelect]);

  useEffect(() => {
    if (!mapRef.current || !firmalar.length) return;

    const map = mapRef.current;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    firmalar.forEach(firm => {
      if (!firm.latitude || !firm.longitude) return;

      const firmKumbaralar = kumbaralar.filter(k => k.firm_id === firm.id);
      const hasOverdue = firmKumbaralar.some(k => 
        calculateKumbaraStatus(k.next_replacement_date) === 'Kırmızı'
      );
      const hasThisWeek = firmKumbaralar.some(k => 
        calculateKumbaraStatus(k.next_replacement_date) === 'Turuncu'
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
      el.textContent = firmKumbaralar.length.toString();

      const marker = new Marker(el)
        .setLngLat([firm.longitude, firm.latitude])
        .addTo(map);

      marker.getElement().addEventListener('click', () => {
        setSelectedFirm(firm);
      });

      markersRef.current.push(marker);
    });

    // Sadece ilk yüklemede tüm işaretçilere zoom yap
    if (isInitialLoadRef.current && markersRef.current.length > 0) {
      const bounds = new LngLatBounds();
      markersRef.current.forEach(marker => {
        bounds.extend(marker.getLngLat());
      });
      map.fitBounds(bounds, { padding: 50 });
    }
  }, [firmalar, kumbaralar, visibleLayers]);

  return (
    <div className="relative w-full h-full">
      <div 
        ref={mapContainerRef} 
        className="w-full h-full" 
      />
      {locationMode && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg">
          {selectedLocation ? (
            <span>📍 Seçilen: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}</span>
          ) : (
            <span>🗺️ Haritaya tıklayarak konum seçin</span>
          )}
        </div>
      )}
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
