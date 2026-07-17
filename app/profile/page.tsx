"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Pencil, BadgeCheck, Crown, Lock, FileText, MapPin, Receipt, LifeBuoy, Star, ShieldAlert, Mail, Phone, Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { registerPushToken } from "@/lib/firebaseClient";
import Link from "next/link";
import Image from "next/image";

export default function ProfilePage() {
  const { user, loading, logout, refresh } = useAuth();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pushEnabling, setPushEnabling] = useState(false);
  const [pushMsg, setPushMsg] = useState("");
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editError, setEditError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [locationMsg, setLocationMsg] = useState("");
  const [editingAddress, setEditingAddress] = useState(false);
  const [addressDraft, setAddressDraft] = useState("");
  const [crossStreetsDraft, setCrossStreetsDraft] = useState("");
  const [postalCodeDraft, setPostalCodeDraft] = useState("");
  const [addressCoords, setAddressCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [savingAddress, setSavingAddress] = useState(false);

  if (!loading && !user) router.push("/login");

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  function startEditing() {
    setEditName(user?.name ?? "");
    setEditPhone(user?.phone ?? "");
    setEditError("");
    setEditing(true);
  }

  function handleUpdateLocation() {
    if (!navigator.geolocation) { setLocationMsg("Tu navegador no soporta geolocalización"); return; }
    setUpdatingLocation(true);
    setLocationMsg("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const res = await fetch("/api/profile", {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        });
        if (res.ok) { await refresh(); setLocationMsg("Ubicación actualizada ✓"); }
        else setLocationMsg("No se pudo actualizar");
        setUpdatingLocation(false);
      },
      () => { setLocationMsg("No pudimos acceder a tu ubicación"); setUpdatingLocation(false); },
      { timeout: 8000 }
    );
  }

  async function handleEnablePush() {
    setPushEnabling(true);
    setPushMsg("");
    const result = await registerPushToken();
    setPushMsg(result.ok ? "Notificaciones activadas ✓" : (result.error ?? "No se pudo activar"));
    setPushEnabling(false);
  }

  async function handleSaveAddress() {
    if (!addressCoords) return;
    setSavingAddress(true);
    const res = await fetch("/api/profile", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: addressDraft, crossStreets: crossStreetsDraft, postalCode: postalCodeDraft,
        latitude: addressCoords.latitude, longitude: addressCoords.longitude,
      }),
    });
    if (res.ok) { await refresh(); setEditingAddress(false); }
    setSavingAddress(false);
  }

  async function handleChangePassword() {
    setSavingPassword(true);
    setPasswordError("");
    const res = await fetch("/api/profile/password", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) { setPasswordError(data.error); setSavingPassword(false); return; }
    setCurrentPassword(""); setNewPassword(""); setPasswordSaved(true);
    setSavingPassword(false);
    setTimeout(() => { setPasswordSaved(false); setChangingPassword(false); }, 1500);
  }

  async function handleAvatarChange(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
    const uploadData = await uploadRes.json().catch(() => ({ error: "Error de conexión al subir la imagen" }));
    if (!uploadRes.ok) { alert(uploadData.error ?? "No se pudo subir la imagen"); return; }
    const res = await fetch("/api/profile", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ avatar: uploadData.url }),
    });
    if (res.ok) await refresh();
  }

  async function handleSaveName() {
    setSavingProfile(true);
    setEditError("");
    const res = await fetch("/api/profile", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editName, phone: editPhone }),
    });
    const data = await res.json();
    if (!res.ok) { setEditError(data.error); setSavingProfile(false); return; }
    await refresh();
    setEditing(false);
    setSavingProfile(false);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Cargando...</div>;
  if (!user) return null;

  const isAdmin = user.role === "ADMIN";

  return (
    <div className="max-w-sm mx-auto pb-6">
      <div className={`h-28 w-full ${isAdmin ? "bg-gradient-to-br from-slate-700 to-slate-900" : "bg-gradient-to-br from-rose-400 via-pink-400 to-amber-300"}`} />

      <div className="flex flex-col items-center text-center px-4 -mt-12 mb-6">
        <label className="relative cursor-pointer group mb-3">
          <Image src={user.avatar} alt={user.name} width={96} height={96} className="rounded-full object-cover border-4 border-white shadow-lg" />
          <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
            <Pencil size={18} className="text-white" />
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarChange(f); }} />
        </label>

        {editing ? (
          <div className="flex flex-col items-center gap-1.5 w-full">
            <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nombre de usuario"
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-48 text-center focus:outline-none focus:ring-2 focus:ring-rose-300" />
            <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Teléfono (opcional)"
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-48 text-center focus:outline-none focus:ring-2 focus:ring-rose-300" />
            {editError && <p className="text-xs text-rose-500">{editError}</p>}
            <div className="flex gap-2 mt-1">
              <button onClick={handleSaveName} disabled={savingProfile} className="text-xs bg-rose-500 text-white font-semibold px-3 py-1.5 rounded-full disabled:opacity-50">
                {savingProfile ? "..." : "Guardar"}
              </button>
              <button onClick={() => setEditing(false)} className="text-xs text-slate-400 px-3 py-1.5">Cancelar</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <h1 className="font-extrabold text-slate-800 text-xl">{user.name}</h1>
              {user.verified && <BadgeCheck size={17} className="text-blue-500" />}
              {user.isPremium && <Crown size={16} className="text-amber-500" />}
              {isAdmin && <ShieldAlert size={16} className="text-slate-500" />}
              {!isAdmin && (
                <button onClick={startEditing} className="text-slate-300 hover:text-rose-500">
                  <Pencil size={13} />
                </button>
              )}
            </div>
            {isAdmin && <p className="text-xs font-semibold text-slate-400 mt-0.5">Administrador</p>}
            {user.fullName && <p className="text-sm text-slate-500 mt-0.5">{user.fullName}</p>}
            {!isAdmin && user.ratingCount > 0 && (
              <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                <Star size={11} fill="currentColor" /> {user.ratingAvg.toFixed(1)} ({user.ratingCount} calificaciones)
              </p>
            )}
          </>
        )}
      </div>

      <div className="px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-4 flex flex-col gap-2.5">
        <div className="flex items-center gap-2.5 text-sm text-slate-600">
          <Mail size={15} className="text-slate-400 shrink-0" /> {user.email}
        </div>
        {user.phone && (
          <div className="flex items-center gap-2.5 text-sm text-slate-600">
            <Phone size={15} className="text-slate-400 shrink-0" /> {user.phone}
          </div>
        )}
        {!isAdmin && user.address && (
          <div className="flex items-start gap-2.5 text-sm text-slate-600">
            <MapPin size={15} className="text-slate-400 shrink-0 mt-0.5" />
            <div>
              <p>{user.address}</p>
              {(user.crossStreets || user.postalCode) && (
                <p className="text-xs text-slate-400">
                  {user.crossStreets && <>entre {user.crossStreets}</>}
                  {user.crossStreets && user.postalCode && " · "}
                  {user.postalCode && <>CP {user.postalCode}</>}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {isAdmin ? (
        <Link href="/admin" className="flex items-center justify-between bg-gradient-to-r from-slate-700 to-slate-900 text-white rounded-2xl px-4 py-3 mb-6 hover:opacity-90 transition">
          <div className="flex items-center gap-2"><ShieldAlert size={18} /><span className="font-semibold text-sm">Panel de administración</span></div>
          <span className="text-xs opacity-80">→</span>
        </Link>
      ) : (
        <Link href="/ropero" className="flex items-center justify-between bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl px-4 py-3 mb-6 hover:opacity-90 transition">
          <div className="flex items-center gap-2"><Crown size={18} /><span className="font-semibold text-sm">Ver mi Ropero</span></div>
          <span className="text-xs opacity-80">Créditos, monedero y prendas →</span>
        </Link>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <h3 className="font-bold text-slate-800 mb-3 text-sm">Configuración</h3>

        {!changingPassword ? (
          <button onClick={() => setChangingPassword(true)} className="flex items-center gap-2 text-sm text-slate-600 hover:text-rose-500 mb-3">
            <Lock size={15} /> Cambiar contraseña
          </button>
        ) : (
          <div className="bg-slate-50 rounded-2xl p-4 mb-3 flex flex-col gap-2">
            <input type="password" placeholder="Contraseña actual" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
            <input type="password" placeholder="Contraseña nueva (mín. 6 caracteres)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
            {passwordError && <p className="text-xs text-rose-500">{passwordError}</p>}
            {passwordSaved && <p className="text-xs text-emerald-600">Contraseña actualizada ✓</p>}
            <div className="flex gap-2">
              <button onClick={handleChangePassword} disabled={savingPassword || !currentPassword || newPassword.length < 6}
                className="text-xs bg-rose-500 text-white font-semibold px-3 py-1.5 rounded-full disabled:opacity-50">
                {savingPassword ? "..." : "Guardar"}
              </button>
              <button onClick={() => { setChangingPassword(false); setPasswordError(""); }} className="text-xs text-slate-400 px-3 py-1.5">Cancelar</button>
            </div>
          </div>
        )}

        {!isAdmin && (
          <>
            {!editingAddress ? (
              <button onClick={() => {
                setAddressDraft(user.address ?? ""); setCrossStreetsDraft(user.crossStreets ?? ""); setPostalCodeDraft(user.postalCode ?? "");
                setAddressCoords(null); setEditingAddress(true);
              }} className="flex items-center gap-2 text-sm text-slate-600 hover:text-rose-500 mb-3">
                <MapPin size={15} /> {user.address ? "Cambiar domicilio" : "Cargar domicilio"}
              </button>
            ) : (
              <div className="bg-slate-50 rounded-2xl p-4 mb-3 flex flex-col gap-2">
                <AddressAutocomplete value={addressDraft} onChange={(v) => { setAddressDraft(v); setAddressCoords(null); }}
                  onSelect={(s) => setAddressCoords({ latitude: s.latitude, longitude: s.longitude })} />
                {addressDraft.length >= 3 && !addressCoords && (
                  <p className="text-[11px] text-amber-600">Elegí una dirección de la lista para confirmarla.</p>
                )}
                <div className="flex gap-2">
                  <input value={crossStreetsDraft} onChange={(e) => setCrossStreetsDraft(e.target.value)} placeholder="Entre calles"
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
                  <input value={postalCodeDraft} onChange={(e) => setPostalCodeDraft(e.target.value)} placeholder="CP"
                    className="w-20 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSaveAddress} disabled={savingAddress || !addressCoords}
                    className="text-xs bg-rose-500 text-white font-semibold px-3 py-1.5 rounded-full disabled:opacity-50">
                    {savingAddress ? "..." : "Guardar"}
                  </button>
                  <button onClick={() => setEditingAddress(false)} className="text-xs text-slate-400 px-3 py-1.5">Cancelar</button>
                </div>
              </div>
            )}

            <button onClick={handleUpdateLocation} disabled={updatingLocation} className="flex items-center gap-2 text-sm text-slate-600 hover:text-rose-500 mb-3 disabled:opacity-50">
              <MapPin size={15} /> {updatingLocation ? "Detectando ubicación..." : "Usar mi ubicación actual (GPS)"}
            </button>
            {locationMsg && <p className="text-xs text-slate-400 mb-3 -mt-2">{locationMsg}</p>}

            <button onClick={handleEnablePush} disabled={pushEnabling} className="flex items-center gap-2 text-sm text-slate-600 hover:text-rose-500 mb-3 disabled:opacity-50">
              <Bell size={15} /> {pushEnabling ? "Activando..." : "Activar notificaciones push"}
            </button>
            {pushMsg && <p className="text-xs text-slate-400 mb-3 -mt-2">{pushMsg}</p>}

            <Link href="/history" className="flex items-center gap-2 text-sm text-slate-600 hover:text-rose-500 mb-3">
              <Receipt size={15} /> Historial de compras/ventas
            </Link>
          </>
        )}

        <Link href="/support" className="flex items-center gap-2 text-sm text-slate-600 hover:text-rose-500 mb-3">
          <LifeBuoy size={15} /> Ayuda / Soporte
        </Link>

        <Link href="/terms" className="flex items-center gap-2 text-sm text-slate-600 hover:text-rose-500 mb-3">
          <FileText size={15} /> Términos y condiciones
        </Link>

        <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-slate-400 hover:text-rose-500">
          <LogOut size={15} /> Cerrar sesión
        </button>
      </div>
      </div>
    </div>
  );
}
