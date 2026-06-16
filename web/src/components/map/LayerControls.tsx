'use client';

interface LayerControlsProps {
  visibleLayers: {
    firmNames: boolean;
    piggyBanks: boolean;
    toCollect: boolean;
    overdue: boolean;
    heatmap: boolean;
  };
  onChange: (layers: LayerControlsProps['visibleLayers']) => void;
}

export function LayerControls({ visibleLayers, onChange }: LayerControlsProps) {
  const toggleLayer = (layer: keyof LayerControlsProps['visibleLayers']) => {
    onChange({ ...visibleLayers, [layer]: !visibleLayers[layer] });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 border">
      <h3 className="font-semibold mb-3 text-sm text-gray-700">Katmanlar</h3>
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={visibleLayers.firmNames}
            onChange={() => toggleLayer('firmNames')}
            className="rounded"
          />
          <span className="text-sm">Firma İsimleri</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={visibleLayers.piggyBanks}
            onChange={() => toggleLayer('piggyBanks')}
            className="rounded"
          />
          <span className="text-sm">Kumbara Konumları</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={visibleLayers.toCollect}
            onChange={() => toggleLayer('toCollect')}
            className="rounded"
          />
          <span className="text-sm">Toplanacak Kumbaralar</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={visibleLayers.overdue}
            onChange={() => toggleLayer('overdue')}
            className="rounded"
          />
          <span className="text-sm">Geciken Kumbaralar</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={visibleLayers.heatmap}
            onChange={() => toggleLayer('heatmap')}
            className="rounded"
          />
          <span className="text-sm">Isı Haritası</span>
        </label>
      </div>
    </div>
  );
}
