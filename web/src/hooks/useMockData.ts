'use client';

// Ankara'nın gerçek önemli mekanları
const ANKARA_LOCATIONS = [
  { name: 'Kızılay Meydanı', lat: 39.9334, lng: 32.8597, district: 'Çankaya', neighborhood: 'Kızılay' },
  { name: 'Ankara Üniversitesi', lat: 39.9283, lng: 32.8545, district: 'Çankaya', neighborhood: 'Anıttepe' },
  { name: 'Anıtkabir', lat: 39.9234, lng: 32.8334, district: 'Çankaya', neighborhood: 'Anıttepe' },
  { name: 'Armada Alışveriş Merkezi', lat: 39.9186, lng: 32.8286, district: 'Çankaya', neighborhood: 'Dikmen' },
  { name: 'Etimesgut Belediyesi', lat: 39.9456, lng: 32.6912, district: 'Etimesgut', neighborhood: 'Etimesgut Merkez' },
  { name: 'Keçiören Belediyesi', lat: 40.0023, lng: 32.8654, district: 'Keçiören', neighborhood: 'Sanatoryum' },
  { name: 'Mamak Belediyesi', lat: 39.9567, lng: 32.9456, district: 'Mamak', neighborhood: 'Mamak Merkez' },
  { name: 'Sincan Belediyesi', lat: 39.9678, lng: 32.5876, district: 'Sincan', neighborhood: 'Sincan Merkez' },
  { name: 'Yenimahalle Belediyesi', lat: 39.9456, lng: 32.7987, district: 'Yenimahalle', neighborhood: 'Yenimahalle Merkez' },
  { name: 'AŞTİ', lat: 39.9123, lng: 32.7934, district: 'Yenimahalle', neighborhood: 'AŞTİ' },
  { name: 'GENÇLİK Parkı', lat: 39.9345, lng: 32.8512, district: 'Çankaya', neighborhood: 'Gençlik' },
  { name: 'Atatürk Orman Çiftliği', lat: 39.9567, lng: 32.8765, district: 'Çankaya', neighborhood: 'A.O.Ç.' },
  { name: 'Bahçelievler', lat: 39.9098, lng: 32.8123, district: 'Çankaya', neighborhood: 'Bahçelievler' },
  { name: 'Söğütözü', lat: 39.9076, lng: 32.7765, district: 'Çankaya', neighborhood: 'Söğütözü' },
  { name: 'Ostim', lat: 39.9765, lng: 32.8345, district: 'Yenimahalle', neighborhood: 'Ostim' },
  { name: 'Batıkent', lat: 39.9543, lng: 32.6987, district: 'Yenimahalle', neighborhood: 'Batıkent' },
  { name: 'Elmadağ', lat: 39.9212, lng: 32.8765, district: 'Elmadağ', neighborhood: 'Elmadağ Merkez' },
  { name: 'Polatlı', lat: 39.5823, lng: 32.1543, district: 'Polatlı', neighborhood: 'Polatlı Merkez' },
  { name: 'Beypazarı', lat: 40.1634, lng: 31.9176, district: 'Beypazarı', neighborhood: 'Beypazarı Merkez' },
  { name: 'Nallıhan', lat: 40.1876, lng: 31.3654, district: 'Nallıhan', neighborhood: 'Nallıhan Merkez' },
];

const FIRM_TYPES = [
  'Market', 'Kafe', 'Restoran', 'Otel', 'Okul', 
  'Hastane', 'Avukat', 'Diş Hekimi', 'Giyim', 'Elektronik'
];

export function useMockData() {
  const firms = [];
  const piggyBanks = [];
  const teams = [];

  // Teams
  teams.push({
    id: 'team-1',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    name: 'Ankara Ekibi',
    color: '#3B82F6',
    vehicle_info: '06 ABC 123',
    status: 'active',
  });

  teams.push({
    id: 'team-2',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    name: 'Bölge Ekibi',
    color: '#10B981',
    vehicle_info: '06 XYZ 789',
    status: 'active',
  });

  // Ankara'nın gerçek lokasyonlarını kullanarak firmalar oluştur
  ANKARA_LOCATIONS.forEach((location, index) => {
    const firmType = FIRM_TYPES[index % FIRM_TYPES.length];
    
    const firm = {
      id: `firm-${index + 1}`,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      deleted_at: null,
      name: `${location.name} ${firmType}`,
      type: firmType,
      representative_name: `Mehmet Kaya ${index + 1}`,
      representative_phone: `0532${String(5550000 + index).padStart(7, '0')}`,
      alternative_phone: index % 2 === 0 ? `0555${String(4440000 + index).padStart(7, '0')}` : null,
      whatsapp: null,
      email: `firma${index + 1}@ankara.com`,
      address: `${location.neighborhood} Mah. ${index + 1}. Sok. No: ${index + 1}`,
      city: 'Ankara',
      district: location.district,
      neighborhood: location.neighborhood,
      street: `${index + 1}. Sokak`,
      building_no: String(index + 1),
      latitude: location.lat,
      longitude: location.lng,
      location: {
        type: 'Point',
        coordinates: [location.lng, location.lat],
      },
      description: `${location.name} bölgesinde ${firmType.toLowerCase()} hizmeti veriyor.`,
      status: index % 10 === 0 ? 'inactive' : 'active',
      tags: ['vakıf', 'bağış', firmType.toLowerCase()],
      notes: index % 3 === 0 ? 'Yetkili izinli, hafta içi 10:00-16:00 arasında ziyaret edilebilir.' : null,
      custom_fields: null,
    };

    firms.push(firm);

    // Her firmaya 1-3 arası kumbara ekle
    const numPiggyBanks = (index % 3) + 1;
    for (let j = 0; j < numPiggyBanks; j++) {
      const placementDate = new Date();
      placementDate.setDate(placementDate.getDate() - (90 - index * 4 + j * 10));
      
      const nextReplacementDate = new Date(placementDate);
      nextReplacementDate.setDate(nextReplacementDate.getDate() + 90);

      piggyBanks.push({
        id: `pb-${index + 1}-${j + 1}`,
        created_at: placementDate.toISOString(),
        updated_at: '2024-01-01T00:00:00.000Z',
        deleted_at: null,
        number: `KB${String(index + 1).padStart(3, '0')}-${j + 1}`,
        qr_code: null,
        barcode: null,
        type: 'standard',
        placement_date: placementDate.toISOString(),
        last_replacement_date: null,
        next_replacement_date: nextReplacementDate.toISOString(),
        period_days: 90,
        status: 'new',
        total_collections: Math.floor(index / 3),
        total_donation: index * 50,
        last_donation: index * 10,
        notes: null,
        custom_fields: null,
        firm_id: firm.id,
      });
    }
  });

  return { firms, piggyBanks, teams };
}
