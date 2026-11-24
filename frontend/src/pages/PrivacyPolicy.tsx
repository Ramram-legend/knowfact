import { Link } from 'react-router-dom'
import { Shield, ArrowLeft, AlertCircle, Eye, Trash2, Mail, Scale } from 'lucide-react'

export default function PrivacyPolicy() {
  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au tableau de bord
        </Link>
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100">
            <Shield className="h-5 w-5 text-primary-700" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Politique de Confidentialité &amp; Données
          </h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Dernière mise à jour : novembre 2026 · KnowFact 5.0 — Système de Gestion des Connaissances Industrielles
        </p>
      </div>

      {/* Section 1 — Données collectées */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2 text-base font-semibold text-gray-900">
          <AlertCircle className="h-4 w-4 text-primary-600" />
          <h2>1. Données collectées</h2>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">
          KnowFact collecte uniquement les informations strictement nécessaires à l'identification professionnelle
          au sein de la plateforme de capitalisation des connaissances. Ces données sont :
        </p>
        <ul className="text-sm text-gray-700 space-y-1.5 pl-4 list-disc leading-relaxed">
          <li><strong>Nom affiché</strong> — utilisé pour attribuer les fiches et les contributions à leur auteur.</li>
          <li><strong>Rôle</strong> — détermine les droits d'accès (opérateur, technicien, ingénieur, expert, administrateur).</li>
          <li><strong>Service / Département</strong> — permet de rattacher les fiches à leur unité de production.</li>
          <li><strong>Poste de travail</strong> — contextualise les procédures et retours d'expérience.</li>
        </ul>
        <p className="text-sm text-gray-500 leading-relaxed">
          Aucune donnée sensible (numéro de sécurité sociale, coordonnées personnelles, données de santé) n'est collectée ni stockée.
        </p>
      </div>

      {/* Section 2 — Finalité */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2 text-base font-semibold text-gray-900">
          <Scale className="h-4 w-4 text-primary-600" />
          <h2>2. Finalité unique de traitement</h2>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">
          Les données collectées ont une <strong>finalité exclusive</strong> : la capitalisation du savoir industriel
          au sein de l'organisation. Elles sont utilisées pour :
        </p>
        <ul className="text-sm text-gray-700 space-y-1.5 pl-4 list-disc leading-relaxed">
          <li>Attribuer la paternité des fiches de connaissance à leurs auteurs.</li>
          <li>Calculer les points de contribution (gamification) dans le cadre du programme de récompenses interne.</li>
          <li>Permettre aux experts et administrateurs d'identifier les contributeurs lors de la validation des fiches.</li>
          <li>Générer des statistiques agrégées et anonymisées sur l'activité de la plateforme.</li>
        </ul>
        <p className="text-sm text-gray-500 leading-relaxed">
          Aucune donnée n'est utilisée à des fins commerciales, de profilage individuel, de surveillance des performances
          individuelles ou de communication externe.
        </p>
      </div>

      {/* Section 3 — Durée de conservation */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2 text-base font-semibold text-gray-900">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <h2>3. Durée de conservation</h2>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Les fiches archivées et les données de profil associées sont conservées pendant <strong>24 mois</strong> à compter
          de la date d'archivage, puis supprimées automatiquement sauf obligation légale contraire.
        </div>
        <ul className="text-sm text-gray-700 space-y-1.5 pl-4 list-disc leading-relaxed">
          <li><strong>Fiches actives / publiées</strong> : conservées tant qu'elles sont pertinentes pour l'exploitation.</li>
          <li><strong>Fiches archivées</strong> : 24 mois après archivage.</li>
          <li><strong>Comptes utilisateurs désactivés</strong> : 24 mois après désactivation.</li>
          <li><strong>Journaux d'activité</strong> : 12 mois glissants.</li>
        </ul>
      </div>

      {/* Section 4 — Vos droits */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2 text-base font-semibold text-gray-900">
          <Eye className="h-4 w-4 text-primary-600" />
          <h2>4. Vos droits</h2>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">
          Conformément à la réglementation applicable, vous disposez des droits suivants sur vos données personnelles :
        </p>
        <div className="space-y-3">
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm">
            <p className="font-semibold text-gray-900 mb-1">Droit de rectification</p>
            <p className="text-gray-600 text-xs leading-relaxed">
              Si vos informations (nom, service, poste) sont incorrectes, vous pouvez les signaler directement
              via le bouton <strong>"Signaler une erreur"</strong> disponible dans votre profil, ou en contactant
              votre administrateur de plateforme.
            </p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm">
            <p className="font-semibold text-gray-900 mb-1">Droit à la suppression</p>
            <p className="text-gray-600 text-xs leading-relaxed">
              Toute demande de suppression de vos données doit être adressée à l'<strong>administrateur de la plateforme</strong>.
              La suppression effective dépend des obligations légales de conservation liées aux procédures industrielles documentées.
            </p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm">
            <p className="font-semibold text-gray-900 mb-1">Droit d'accès</p>
            <p className="text-gray-600 text-xs leading-relaxed">
              Vous pouvez à tout moment consulter l'ensemble des fiches et contributions associées à votre profil
              via la section <strong>"Mes propositions"</strong> et votre page de profil.
            </p>
          </div>
        </div>
      </div>

      {/* Section 5 — Conformité */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2 text-base font-semibold text-gray-900">
          <Shield className="h-4 w-4 text-green-600" />
          <h2>5. Conformité — Loi 09-08 &amp; CNDP (Maroc)</h2>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">
          KnowFact est développé en conformité avec la <strong>loi marocaine n° 09-08</strong> relative à la protection
          des personnes physiques à l'égard du traitement des données à caractère personnel, et supervisé par la
          <strong> Commission Nationale de contrôle de la protection des Données à caractère Personnel (CNDP)</strong>.
        </p>
        <ul className="text-sm text-gray-700 space-y-1.5 pl-4 list-disc leading-relaxed">
          <li>Le traitement est limité à sa finalité déclarée (capitalisation des connaissances industrielles).</li>
          <li>Aucune cession de données à des tiers n'est effectuée.</li>
          <li>Les mesures techniques de sécurité (authentification, chiffrement des communications) sont en place.</li>
          <li>Les données ne sont pas transférées en dehors du territoire sans garanties adéquates.</li>
        </ul>
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-xs text-green-900">
          Pour toute information sur la loi 09-08 : <a href="https://www.cndp.ma" target="_blank" rel="noopener noreferrer" className="underline font-medium">www.cndp.ma</a>
        </div>
      </div>

      {/* Section 6 — Contact */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2 text-base font-semibold text-gray-900">
          <Mail className="h-4 w-4 text-primary-600" />
          <h2>6. Contact administrateur</h2>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">
          Pour toute question relative à vos données personnelles, à l'exercice de vos droits ou à la présente politique
          de confidentialité, veuillez contacter l'administrateur de la plateforme KnowFact :
        </p>
        <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-700 space-y-1">
          <p><strong>Rôle :</strong> Administrateur KnowFact</p>
          <p className="text-xs text-gray-500">
            Accessible via la section <strong>Administration &gt; Gestion des utilisateurs</strong> (réservé aux administrateurs)
            ou en adressant votre demande à votre responsable hiérarchique direct.
          </p>
        </div>
        <div className="flex gap-2 pt-1">
          <Link to="/dashboard" className="btn-secondary text-sm">
            <ArrowLeft className="h-4 w-4" />
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    </div>
  )
}
