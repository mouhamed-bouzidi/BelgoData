"use client";

import { useEffect, useState } from "react";

interface ProvinceData {
  name: string;
  count: number;
  percentage: number;
}

export default function GeoDistributionCard() {
  const [data, setData] = useState<ProvinceData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Appel de ton API Node.js existante
    fetch("http://localhost:5000/api/prospects/dashboard/geo-distribution")
      .then((res) => res.json())
      .then((resData) => {
        // Supporte les deux formats (tableau direct ou objet contenant {data: [...]})
        const cleanData = resData.data || resData;
        setData(cleanData);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Erreur de chargement des statistiques géo:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2"></div>
        <p className="text-gray-400 text-xs">Chargement de la répartition...</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full justify-between">
      {/* En-tête simplifié */}
      <div className="mb-4">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Répartition géographique</h3>
        <p className="text-xs text-gray-400">Top 5 des provinces les plus représentées</p>
      </div>

      {/* Les 5 barres de pourcentage demandées */}
      <div className="space-y-4 my-auto">
        {data.slice(0, 5).map((province) => (
          <div key={province.name} className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-gray-700">{province.name}</span>
              <div className="flex items-center space-x-2 text-gray-500">
                <span className="font-bold text-gray-900">{province.count.toLocaleString()}</span>
                <span className="text-gray-400 w-8 text-right">{province.percentage}%</span>
              </div>
            </div>
            
            {/* Ligne de progression Violette de ton design */}
            <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${province.percentage}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}