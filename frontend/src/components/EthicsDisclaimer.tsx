import { AlertTriangle } from 'lucide-react'

export default function EthicsDisclaimer() {
  return (
    <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900 flex items-start gap-3">
      <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
      <p className="leading-relaxed">
        <strong>⚠️ Cette fiche est une expérience partagée</strong> — elle ne remplace pas les consignes officielles,
        la formation, la consignation ou l'habilitation. <strong>L'humain décide.</strong>
      </p>
    </div>
  )
}
