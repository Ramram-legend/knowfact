/**
 * pages/DepartmentAdmin.tsx
 * Administration des départements et postes de travail.
 * Accessible uniquement aux administrateurs.
 */
import { useState, useEffect, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import {
  PlusCircle, Pencil, Trash2, ChevronDown, ChevronRight,
  Users, Briefcase, CheckCircle, XCircle, Building2, RefreshCw,
} from 'lucide-react'
import { departmentsApi } from '../api/departments'
import { authApi } from '../api/auth'
import { useAuth } from '../contexts/AuthContext'
import { useDepartments } from '../contexts/DepartmentContext'
import type { DepartmentDetail, Workstation, User } from '../types'

interface Toast { message: string; type: 'success' | 'error' }

function ToastBar({ message, type }: Toast) {
  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
      type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
    }`}>
      {type === 'success' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
      {message}
    </div>
  )
}

// ─── Formulaire Département ───────────────────────────────────────────────────

interface DeptFormState {
  name: string
  code: string
  description: string
  color: string
  icon: string
  manager_id: string
  display_order: string
}

const ICON_OPTIONS = [
  { value: 'Factory', label: '🏭 Usine' },
  { value: 'Wrench', label: '🔧 Maintenance' },
  { value: 'ShieldCheck', label: '✅ Qualité' },
  { value: 'Package', label: '📦 Logistique' },
  { value: 'AlertTriangle', label: '⚠️ HSE' },
  { value: 'Building2', label: '🏢 Général' },
]

const DEFAULT_DEPT_FORM: DeptFormState = {
  name: '', code: '', description: '', color: '#0d9488',
  icon: 'Factory', manager_id: '', display_order: '0',
}

// ─── Formulaire Poste ─────────────────────────────────────────────────────────

interface WsFormState {
  name: string
  code: string
  description: string
  display_order: string
}

const DEFAULT_WS_FORM: WsFormState = { name: '', code: '', description: '', display_order: '0' }

// ─── Composant principal ─────────────────────────────────────────────────────

export default function DepartmentAdmin() {
  const { user } = useAuth()
  const { reload: reloadContext } = useDepartments()

  const [departments, setDepartments] = useState<DepartmentDetail[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<Toast | null>(null)
  const [expandedDept, setExpandedDept] = useState<number | null>(null)

  // Modals
  const [showDeptForm, setShowDeptForm] = useState(false)
  const [editingDept, setEditingDept] = useState<DepartmentDetail | null>(null)
  const [deptForm, setDeptForm] = useState<DeptFormState>(DEFAULT_DEPT_FORM)

  const [showWsForm, setShowWsForm] = useState<number | null>(null) // dept_id
  const [editingWs, setEditingWs] = useState<Workstation | null>(null)
  const [wsForm, setWsForm] = useState<WsFormState>(DEFAULT_WS_FORM)

  const [showMemberForm, setShowMemberForm] = useState<number | null>(null) // dept_id
  const [memberUserId, setMemberUserId] = useState('')
  const [memberWsId, setMemberWsId] = useState('')
  const [memberIsPrimary, setMemberIsPrimary] = useState(false)

  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [depts, userList] = await Promise.all([
        departmentsApi.list().then((list) =>
          Promise.all(list.map((d) => departmentsApi.get(d.id)))
        ),
        authApi.listUsers(),
      ])
      setDepartments(depts)
      setUsers(userList)
    } catch {
      showToast('Erreur lors du chargement.', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ─── Département CRUD ───────────────────────────────────────────────────────

  const openCreateDept = () => {
    setEditingDept(null)
    setDeptForm(DEFAULT_DEPT_FORM)
    setShowDeptForm(true)
  }

  const openEditDept = (d: DepartmentDetail) => {
    setEditingDept(d)
    setDeptForm({
      name: d.name, code: d.code, description: d.description ?? '',
      color: d.color, icon: d.icon,
      manager_id: d.manager_id ? String(d.manager_id) : '',
      display_order: String(d.display_order),
    })
    setShowDeptForm(true)
  }

  const saveDept = async () => {
    if (!deptForm.name.trim() || !deptForm.code.trim()) {
      showToast('Nom et code sont obligatoires.', 'error'); return
    }
    const payload = {
      name: deptForm.name.trim(),
      code: deptForm.code.trim().toUpperCase(),
      description: deptForm.description || undefined,
      color: deptForm.color,
      icon: deptForm.icon,
      manager_id: deptForm.manager_id ? Number(deptForm.manager_id) : null,
      display_order: Number(deptForm.display_order) || 0,
    }
    try {
      if (editingDept) {
        await departmentsApi.update(editingDept.id, payload)
        showToast('Département mis à jour.', 'success')
      } else {
        await departmentsApi.create(payload)
        showToast('Département créé.', 'success')
      }
      setShowDeptForm(false)
      await load()
      await reloadContext()
    } catch (err: any) {
      showToast(err?.response?.data?.detail ?? 'Erreur lors de la sauvegarde.', 'error')
    }
  }

  const deactivateDept = async (d: DepartmentDetail) => {
    if (!confirm(`Désactiver le département "${d.name}" ?`)) return
    try {
      await departmentsApi.remove(d.id)
      showToast('Département désactivé.', 'success')
      await load(); await reloadContext()
    } catch {
      showToast('Erreur lors de la désactivation.', 'error')
    }
  }

  // ─── Poste CRUD ─────────────────────────────────────────────────────────────

  const openCreateWs = (deptId: number) => {
    setEditingWs(null)
    setWsForm(DEFAULT_WS_FORM)
    setShowWsForm(deptId)
  }

  const openEditWs = (deptId: number, ws: Workstation) => {
    setEditingWs(ws)
    setWsForm({
      name: ws.name, code: ws.code ?? '',
      description: ws.description ?? '',
      display_order: String(ws.display_order),
    })
    setShowWsForm(deptId)
  }

  const saveWs = async (deptId: number) => {
    if (!wsForm.name.trim()) { showToast('Le nom du poste est obligatoire.', 'error'); return }
    const payload = {
      name: wsForm.name.trim(),
      code: wsForm.code || undefined,
      description: wsForm.description || undefined,
      display_order: Number(wsForm.display_order) || 0,
    }
    try {
      if (editingWs) {
        await departmentsApi.updateWorkstation(deptId, editingWs.id, payload)
        showToast('Poste mis à jour.', 'success')
      } else {
        await departmentsApi.createWorkstation(deptId, payload)
        showToast('Poste créé.', 'success')
      }
      setShowWsForm(null)
      await load()
    } catch (err: any) {
      showToast(err?.response?.data?.detail ?? 'Erreur.', 'error')
    }
  }

  const deactivateWs = async (deptId: number, ws: Workstation) => {
    if (!confirm(`Désactiver le poste "${ws.name}" ?`)) return
    try {
      await departmentsApi.removeWorkstation(deptId, ws.id)
      showToast('Poste désactivé.', 'success')
      await load()
    } catch {
      showToast('Erreur.', 'error')
    }
  }

  // ─── Membres ────────────────────────────────────────────────────────────────

  const addMember = async (deptId: number, deptWorkstations: Workstation[]) => {
    if (!memberUserId) { showToast('Sélectionnez un utilisateur.', 'error'); return }
    try {
      await departmentsApi.assignMember(deptId, {
        user_id: Number(memberUserId),
        workstation_id: memberWsId ? Number(memberWsId) : null,
        is_primary: memberIsPrimary,
      })
      showToast('Membre affecté.', 'success')
      setShowMemberForm(null); setMemberUserId(''); setMemberWsId(''); setMemberIsPrimary(false)
      await load()
    } catch (err: any) {
      showToast(err?.response?.data?.detail ?? 'Erreur.', 'error')
    }
  }

  const removeMember = async (deptId: number, userId: number, name: string) => {
    if (!confirm(`Retirer ${name} du département ?`)) return
    try {
      await departmentsApi.removeMember(deptId, userId)
      showToast('Membre retiré.', 'success')
      await load()
    } catch {
      showToast('Erreur.', 'error')
    }
  }

  // ─── Rendu ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {toast && <ToastBar {...toast} />}

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary-600" />
            Gestion des départements
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Créez et organisez les départements, postes de travail et affectations.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { load(); reloadContext() }} className="btn-secondary">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button onClick={openCreateDept} className="btn-primary">
            <PlusCircle className="h-4 w-4" />
            Nouveau département
          </button>
        </div>
      </div>

      {/* Formulaire département */}
      {showDeptForm && (
        <div className="card border-2 border-primary-200 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">
            {editingDept ? 'Modifier le département' : 'Créer un département'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Nom *</label>
              <input className="input-field" value={deptForm.name}
                onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                placeholder="ex: Production" />
            </div>
            <div>
              <label className="label">Code *</label>
              <input className="input-field uppercase" value={deptForm.code}
                onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
                placeholder="ex: PROD" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <textarea className="input-field resize-none" rows={2} value={deptForm.description}
                onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                placeholder="Description optionnelle..." />
            </div>
            <div>
              <label className="label">Couleur</label>
              <div className="flex items-center gap-2">
                <input type="color" value={deptForm.color}
                  onChange={(e) => setDeptForm({ ...deptForm, color: e.target.value })}
                  className="h-9 w-16 cursor-pointer rounded border border-gray-200 p-0.5" />
                <input className="input-field flex-1 font-mono" value={deptForm.color}
                  onChange={(e) => setDeptForm({ ...deptForm, color: e.target.value })}
                  placeholder="#0d9488" />
              </div>
            </div>
            <div>
              <label className="label">Icône</label>
              <select className="input-field" value={deptForm.icon}
                onChange={(e) => setDeptForm({ ...deptForm, icon: e.target.value })}>
                {ICON_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Responsable</label>
              <select className="input-field" value={deptForm.manager_id}
                onChange={(e) => setDeptForm({ ...deptForm, manager_id: e.target.value })}>
                <option value="">— Aucun —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Ordre d'affichage</label>
              <input type="number" className="input-field" value={deptForm.display_order}
                onChange={(e) => setDeptForm({ ...deptForm, display_order: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button className="btn-secondary" onClick={() => setShowDeptForm(false)}>Annuler</button>
            <button className="btn-primary" onClick={saveDept}>
              {editingDept ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </div>
      )}

      {/* Liste des départements */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        </div>
      ) : departments.length === 0 ? (
        <div className="card text-center py-16">
          <Building2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 text-sm">Aucun département créé.</p>
          <button onClick={openCreateDept} className="btn-primary mt-4 mx-auto">
            <PlusCircle className="h-4 w-4" />
            Créer le premier département
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {departments
            .sort((a, b) => a.display_order - b.display_order)
            .map((dept) => (
              <div key={dept.id} className="card">
                {/* En-tête département */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setExpandedDept(expandedDept === dept.id ? null : dept.id)}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: dept.color + '20', color: dept.color }}
                    >
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{dept.name}</span>
                        <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">
                          {dept.code}
                        </span>
                        {!dept.is_active && (
                          <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Inactif</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {dept.members.length} membre(s) · {dept.workstations.filter(w => w.is_active).length} poste(s) · {dept.fiche_count} fiche(s)
                      </p>
                    </div>
                    {expandedDept === dept.id
                      ? <ChevronDown className="h-4 w-4 text-gray-400 ml-auto" />
                      : <ChevronRight className="h-4 w-4 text-gray-400 ml-auto" />}
                  </button>
                  <div className="flex items-center gap-1 ml-4">
                    <button onClick={() => openEditDept(dept)}
                      className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Modifier">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => deactivateDept(dept)}
                      className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Désactiver">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Contenu déplié */}
                {expandedDept === dept.id && (
                  <div className="mt-4 space-y-4 pt-4 border-t border-gray-100">
                    {/* Postes */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                          <Briefcase className="h-3.5 w-3.5" /> Postes de travail
                        </h3>
                        <button onClick={() => openCreateWs(dept.id)} className="btn-secondary text-xs px-2 py-1">
                          <PlusCircle className="h-3 w-3" /> Ajouter
                        </button>
                      </div>
                      {showWsForm === dept.id && (
                        <div className="bg-gray-50 rounded-lg p-3 mb-2 space-y-2 border border-gray-200">
                          <div className="grid grid-cols-2 gap-2">
                            <input className="input-field text-sm" placeholder="Nom du poste *"
                              value={wsForm.name} onChange={(e) => setWsForm({ ...wsForm, name: e.target.value })} />
                            <input className="input-field text-sm" placeholder="Code (optionnel)"
                              value={wsForm.code} onChange={(e) => setWsForm({ ...wsForm, code: e.target.value })} />
                          </div>
                          <input className="input-field text-sm" placeholder="Description (optionnel)"
                            value={wsForm.description} onChange={(e) => setWsForm({ ...wsForm, description: e.target.value })} />
                          <div className="flex gap-2 justify-end">
                            <button className="btn-secondary text-xs px-2 py-1" onClick={() => { setShowWsForm(null); setEditingWs(null) }}>Annuler</button>
                            <button className="btn-primary text-xs px-2 py-1" onClick={() => saveWs(dept.id)}>
                              {editingWs ? 'Mettre à jour' : 'Créer'}
                            </button>
                          </div>
                        </div>
                      )}
                      {dept.workstations.length === 0 ? (
                        <p className="text-xs text-gray-400 italic px-1">Aucun poste.</p>
                      ) : (
                        <ul className="space-y-1">
                          {dept.workstations.map((ws) => (
                            <li key={ws.id} className="flex items-center justify-between gap-2 rounded px-2 py-1.5 hover:bg-gray-50">
                              <div className="flex items-center gap-2 min-w-0">
                                <Briefcase className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                <span className="text-sm text-gray-700 truncate">{ws.name}</span>
                                {ws.code && <span className="font-mono text-xs text-gray-400">{ws.code}</span>}
                                {!ws.is_active && <span className="text-xs text-red-500">inactif</span>}
                              </div>
                              <div className="flex gap-1">
                                <button onClick={() => openEditWs(dept.id, ws)}
                                  className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50">
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button onClick={() => deactivateWs(dept.id, ws)}
                                  className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Membres */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" /> Membres
                        </h3>
                        <button onClick={() => { setShowMemberForm(dept.id); setMemberUserId(''); setMemberWsId(''); setMemberIsPrimary(false) }}
                          className="btn-secondary text-xs px-2 py-1">
                          <PlusCircle className="h-3 w-3" /> Affecter
                        </button>
                      </div>
                      {showMemberForm === dept.id && (
                        <div className="bg-gray-50 rounded-lg p-3 mb-2 space-y-2 border border-gray-200">
                          <select className="input-field text-sm" value={memberUserId}
                            onChange={(e) => setMemberUserId(e.target.value)}>
                            <option value="">— Sélectionner un utilisateur —</option>
                            {users.map((u) => (
                              <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                            ))}
                          </select>
                          <select className="input-field text-sm" value={memberWsId}
                            onChange={(e) => setMemberWsId(e.target.value)}>
                            <option value="">— Poste (optionnel) —</option>
                            {dept.workstations.filter(w => w.is_active).map((ws) => (
                              <option key={ws.id} value={ws.id}>{ws.name}</option>
                            ))}
                          </select>
                          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                            <input type="checkbox" checked={memberIsPrimary}
                              onChange={(e) => setMemberIsPrimary(e.target.checked)}
                              className="rounded border-gray-300" />
                            Département principal de cet utilisateur
                          </label>
                          <div className="flex gap-2 justify-end">
                            <button className="btn-secondary text-xs px-2 py-1" onClick={() => setShowMemberForm(null)}>Annuler</button>
                            <button className="btn-primary text-xs px-2 py-1"
                              onClick={() => addMember(dept.id, dept.workstations)}>
                              Affecter
                            </button>
                          </div>
                        </div>
                      )}
                      {dept.members.length === 0 ? (
                        <p className="text-xs text-gray-400 italic px-1">Aucun membre affecté.</p>
                      ) : (
                        <ul className="space-y-1">
                          {dept.members.map((m) => (
                            <li key={m.user_id} className="flex items-center justify-between gap-2 rounded px-2 py-1.5 hover:bg-gray-50">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-bold">
                                  {m.full_name.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm text-gray-700 truncate">{m.full_name}</span>
                                <span className="text-xs text-gray-400">{m.role}</span>
                                {m.is_primary && <span className="text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded">Principal</span>}
                              </div>
                              <button onClick={() => removeMember(dept.id, m.user_id, m.full_name)}
                                className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
