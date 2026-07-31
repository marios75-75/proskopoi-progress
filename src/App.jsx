import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "./supabaseClient";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  Check, X, Clock, Circle, ChevronRight, ChevronDown, Plus, Trash2,
  Users, Settings, ClipboardList, Award, ArrowLeftRight, History,
  Shield, UserCog, Sprout, LogOut, Bell, Paperclip, FileDown, Edit3, Save
} from "lucide-react";

const STAGES = ["Αρχάριος Πρόσκοπος", "Χάλκινο Τριφύλλι", "Αργυρό Τριφύλλι", "Χρυσό Τριφύλλι"];
const STAGE_KEYS = ["arxarios", "xalkino", "argyro", "xryso"];
const today = () => new Date().toISOString().slice(0, 10);

function buildExportRows(scoutName, requirements, progressList, userMap) {
  return requirements
    .slice()
    .sort((a, b) => (a.aa || 0) - (b.aa || 0))
    .map((r) => {
      const p = progressList.find((pr) => pr.requirement_id === r.id);
      return {
        "ΑΑ": r.aa || "", "Στάδιο": STAGES[STAGE_KEYS.indexOf(r.stage)], "Κατηγορία": r.category,
        "Τίτλος": r.title, "Επίπεδο": r.level || "",
        "Κατάσταση": p?.status || "Δεν ξεκίνησε",
        "Ημ. Ολοκλήρωσης": p?.completed_date || "", "Ημ. Έγκρισης": p?.approved_date || "",
        "Εγκρίθηκε από": p?.approved_by ? (userMap?.[p.approved_by]?.full_name || "") : "",
        "Σχόλιο": p?.comment || "",
      };
    });
}
function exportToExcel(filename, sheetName, rows) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}
let greekFontLoaded = false;
async function ensureGreekFont(doc) {
  if (!greekFontLoaded) {
    const res = await fetch("/fonts/DejaVuSans.ttf");
    const buf = await res.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const base64 = btoa(binary);
    doc.addFileToVFS("DejaVuSans.ttf", base64);
    doc.addFont("DejaVuSans.ttf", "DejaVu", "normal");
    greekFontLoaded = true;
  }
  doc.setFont("DejaVu");
}
async function exportToPDF(filename, title, rows) {
  const doc = new jsPDF();
  await ensureGreekFont(doc);
  doc.setFontSize(14);
  doc.text(title, 14, 16);
  autoTable(doc, {
    startY: 22,
    head: [Object.keys(rows[0] || {})],
    body: rows.map((r) => Object.values(r)),
    styles: { fontSize: 7, font: "DejaVu" },
    headStyles: { fillColor: [27, 67, 50], font: "DejaVu" },
  });
  doc.save(filename);
}

function statusColor(status, cfg) {
  switch (status) {
    case "Εγκρίθηκε": return { bg: "#E8F0E6", fg: cfg.primary_color, border: cfg.primary_color };
    case "Απορρίφθηκε": return { bg: "#F5E7E5", fg: "#8B3A3A", border: "#8B3A3A" };
    case "Αναμένει έγκριση": return { bg: "#FBF1DD", fg: cfg.gold_color, border: cfg.gold_color };
    case "Σε εξέλιξη": return { bg: "#EAF0EF", fg: cfg.moss_color, border: cfg.moss_color };
    default: return { bg: "#EFEDE7", fg: "#8A8577", border: "#C9C4B6" };
  }
}
function StatusIcon({ status, size = 14 }) {
  if (status === "Εγκρίθηκε") return <Check size={size} />;
  if (status === "Απορρίφθηκε") return <X size={size} />;
  if (status === "Αναμένει έγκριση") return <Clock size={size} />;
  if (status === "Σε εξέλιξη") return <Circle size={size} />;
  return <Circle size={size} strokeDasharray="2 2" />;
}
function Trefoil({ fillPct = 0, size = 34, color = "#1B4332" }) {
  const clipId = useMemo(() => "clip-" + Math.random().toString(36).slice(2), []);
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <defs><clipPath id={clipId}><rect x="0" y={48 - (48 * fillPct) / 100} width="48" height={(48 * fillPct) / 100} /></clipPath></defs>
      <path d="M24 6c-4 0-7 3-7 7 0 2 1 4 2.5 5.3C16 19.5 13 22.5 13 26.5c0 4 3 7 7 7 1.6 0 3-.5 4-1.4v3.4c0 3.6-1.5 6-4.5 7.5h9c-3-1.5-4.5-3.9-4.5-7.5v-3.4c1 .9 2.4 1.4 4 1.4 4 0 7-3 7-7 0-4-3-7-6.5-8.2C29 17 30 15 30 13c0-4-3-7-7-7z" fill="#E4E0D3" />
      <path d="M24 6c-4 0-7 3-7 7 0 2 1 4 2.5 5.3C16 19.5 13 22.5 13 26.5c0 4 3 7 7 7 1.6 0 3-.5 4-1.4v3.4c0 3.6-1.5 6-4.5 7.5h9c-3-1.5-4.5-3.9-4.5-7.5v-3.4c1 .9 2.4 1.4 4 1.4 4 0 7-3 7-7 0-4-3-7-6.5-8.2C29 17 30 15 30 13c0-4-3-7-7-7z" fill={color} clipPath={`url(#${clipId})`} />
    </svg>
  );
}
function Pill({ children, tone }) {
  return <span style={{ background: tone.bg, color: tone.fg, border: `1px solid ${tone.border}33`, borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>{children}</span>;
}
function LevelBadge({ level, cfg }) {
  if (!level) return null;
  return (
    <span title="Επίπεδο δυσκολίας" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 20, height: 20, padding: "0 5px", borderRadius: 6, background: cfg.primary_color + "14", color: cfg.primary_color, fontSize: 11, fontWeight: 700 }}>
      Ε{level}
    </span>
  );
}
function Card({ children, style }) {
  return <div style={{ background: "#fff", border: "1px solid #E4E0D3", borderRadius: 14, padding: 18, ...style }}>{children}</div>;
}
function Button({ children, onClick, variant = "primary", cfg, small, disabled, icon: Icon }) {
  const base = { border: "none", borderRadius: 10, cursor: disabled ? "not-allowed" : "pointer", fontWeight: 600, fontSize: small ? 13 : 14, padding: small ? "6px 12px" : "9px 16px", display: "inline-flex", alignItems: "center", gap: 6, opacity: disabled ? 0.5 : 1 };
  const styles = {
    primary: { background: cfg.primary_color, color: "#fff" },
    ghost: { background: "transparent", color: cfg.primary_color, border: `1px solid ${cfg.primary_color}55` },
    danger: { background: "#8B3A3A", color: "#fff" },
    subtle: { background: "#F0EEE6", color: "#4A4636" },
  };
  return <button disabled={disabled} onClick={onClick} style={{ ...base, ...styles[variant] }}>{Icon && <Icon size={small ? 13 : 15} />}{children}</button>;
}
const selStyle = { padding: "8px 10px", borderRadius: 8, border: "1px solid #E4E0D3", fontSize: 13 };

function NotificationBell({ notifications, onOpen }) {
  const [open, setOpen] = useState(false);
  const unread = notifications.filter((n) => !n.read).length;
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => { setOpen(!open); if (!open) onOpen(); }} style={{ background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.3)", borderRadius: 8, padding: "6px 8px", cursor: "pointer", color: "#fff", position: "relative", display: "flex" }}>
        <Bell size={16} />
        {unread > 0 && <span style={{ position: "absolute", top: -4, right: -4, background: "#C0392B", color: "#fff", borderRadius: 999, fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>{unread}</span>}
      </button>
      {open && (
        <div style={{ position: "absolute", top: "115%", right: 0, width: 280, maxHeight: 320, overflowY: "auto", background: "#fff", border: "1px solid #E4E0D3", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,.12)", zIndex: 20 }}>
          {notifications.length === 0 && <div style={{ padding: 14, fontSize: 13, color: "#8A8577" }}>Καμία ειδοποίηση.</div>}
          {notifications.map((n) => (
            <div key={n.id} style={{ padding: "10px 12px", borderBottom: "1px solid #F0EEE6", fontSize: 12.5, color: "#2B2A22" }}>
              <div>{n.message}</div>
              <div style={{ fontSize: 10.5, color: "#8A8577", marginTop: 3 }}>{new Date(n.created_at).toLocaleString("el-GR")}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


/* ==================== AUTH GATE ==================== */
function Login({ cfg }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError("Λάθος email ή κωδικός.");
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: cfg.cream || "#F6F2E8", fontFamily: "Inter, sans-serif" }}>
      <form onSubmit={submit} style={{ background: "#fff", padding: 28, borderRadius: 16, width: 320, border: "1px solid #E4E0D3" }}>
        <div style={{ fontSize: 30, textAlign: "center" }}>{cfg.logo_emoji || "🌿"}</div>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 19, textAlign: "center", margin: "8px 0 18px" }}>{cfg.org_name || "Σύστημα Προσκόπων"}</h1>
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...selStyle, width: "100%", marginBottom: 8 }} />
        <input placeholder="Κωδικός" type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ ...selStyle, width: "100%", marginBottom: 12 }} />
        {error && <div style={{ color: "#8B3A3A", fontSize: 12.5, marginBottom: 10 }}>{error}</div>}
        <button disabled={loading} style={{ width: "100%", background: cfg.primary_color || "#1B4332", color: "#fff", border: "none", borderRadius: 10, padding: "10px", fontWeight: 700, cursor: "pointer" }}>
          {loading ? "Σύνδεση…" : "Σύνδεση"}
        </button>
      </form>
    </div>
  );
}

/* ==================== ROOT APP ==================== */
export default function App() {
  const [session, setSession] = useState(null);
  const [cfg, setCfg] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    (async () => {
      const { data: c } = await supabase.from("app_config").select("*").eq("id", 1).single();
      setCfg(c || {});
      if (session?.user) {
        const { data: p } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
        setProfile(p || null);
      }
      setLoading(false);
    })();
  }, [session]);

  if (loading || !cfg) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><Sprout /></div>;
  if (!session) return <Login cfg={cfg} />;
  if (!profile) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10, fontFamily: "Inter, sans-serif" }}>
      <div>Ο λογαριασμός σου δεν έχει συνδεθεί με προφίλ. Ζήτησε από τον διαχειριστή να σε προσθέσει.</div>
      <Button cfg={cfg} onClick={() => supabase.auth.signOut()}>Αποσύνδεση</Button>
    </div>
  );

  return <MainApp cfg={cfg} setCfg={setCfg} me={profile} />;
}

/* ==================== MAIN APP (μετά τη σύνδεση) ==================== */
function MainApp({ cfg, setCfg, me }) {
  const [tab, setTab] = useState(tabsFor(me.role)[0].key);
  const [requirements, setRequirements] = useState([]);
  const [progress, setProgress] = useState([]);
  const [users, setUsers] = useState([]);
  const [activity, setActivity] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const loadAll = useCallback(async () => {
    const { data: reqs } = await supabase.from("requirements").select("*").order("stage");
    setRequirements(reqs || []);

    if (me.role === "scout") {
      const { data: prog } = await supabase.from("progress").select("*").eq("scout_id", me.id);
      setProgress(prog || []);
    } else if (me.role === "leader") {
      const { data: scouts } = await supabase.from("profiles").select("*").eq("leader_id", me.id).eq("role", "scout");
      setUsers(scouts || []);
      const ids = (scouts || []).map((s) => s.id);
      if (ids.length) {
        const { data: prog } = await supabase.from("progress").select("*").in("scout_id", ids);
        setProgress(prog || []);
      } else setProgress([]);
    } else if (me.role === "admin") {
      const { data: allUsers } = await supabase.from("profiles").select("*");
      setUsers(allUsers || []);
      const { data: prog } = await supabase.from("progress").select("*");
      setProgress(prog || []);
      const { data: log } = await supabase.from("activity_log").select("*").order("ts", { ascending: false }).limit(100);
      setActivity(log || []);
    }
  }, [me]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const loadNotifications = useCallback(async () => {
    const { data } = await supabase.from("notifications").select("*").eq("user_id", me.id).order("created_at", { ascending: false }).limit(50);
    setNotifications(data || []);
  }, [me.id]);
  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  // Ζωντανή ενημέρωση ειδοποιήσεων (χωρίς refresh) μέσω Supabase Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`notifications-${me.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${me.id}` },
        (payload) => setNotifications((prev) => [payload.new, ...prev])
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [me.id]);

  const notify = async (userId, message) => {
    if (!userId) return;
    await supabase.from("notifications").insert({ user_id: userId, message });
  };
  const markNotificationsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
    await loadNotifications();
  };

  const logAction = async (action) => {
    await supabase.from("activity_log").insert({ actor_id: me.id, actor_name: me.full_name, action });
  };

  const getProgressFor = (scoutId, reqId) => progress.find((p) => p.scout_id === scoutId && p.requirement_id === reqId);

  const upsertProgress = async (scoutId, reqId, patch, note) => {
    const existing = getProgressFor(scoutId, reqId);
    const row = { scout_id: scoutId, requirement_id: reqId, ...patch, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from("progress").upsert(row, { onConflict: "scout_id,requirement_id" }).select().single();
    if (!error && data) {
      await supabase.from("progress_history").insert({ progress_id: data.id, actor_id: me.id, note });
      await loadAll();
    }
  };

  const scoutStart = (reqId) => { upsertProgress(me.id, reqId, { status: "Σε εξέλιξη", started_date: today() }, "Ξεκίνησε από τον πρόσκοπο"); logAction("Ξεκίνησε απαίτηση"); };

  const scoutSubmit = async (reqId, file) => {
    let proof_url = null, proof_name = null;
    if (file) {
      const path = `${me.id}/${reqId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("proof-files").upload(path, file);
      if (upErr) { alert("Σφάλμα ανεβάσματος αρχείου: " + upErr.message); return; }
      proof_url = path; proof_name = file.name;
    }
    await upsertProgress(me.id, reqId, { status: "Αναμένει έγκριση", completed_date: today(), ...(proof_url ? { proof_url, proof_name } : {}) }, "Υποβλήθηκε για έγκριση");
    logAction("Υπέβαλε αίτημα έγκρισης");
    if (me.leader_id) notify(me.leader_id, `${me.full_name} υπέβαλε νέο αίτημα έγκρισης.`);
  };

  const reviewerDecide = (scoutId, reqId, approve, comment) => {
    upsertProgress(scoutId, reqId, {
      status: approve ? "Εγκρίθηκε" : "Απορρίφθηκε",
      approved_date: approve ? today() : null,
      approved_by: me.id, comment: comment || "",
    }, approve ? "Εγκρίθηκε" : "Απορρίφθηκε");
    logAction(`${approve ? "Ενέκρινε" : "Απέρριψε"} αίτημα`);
    notify(scoutId, `Το αίτημά σου ${approve ? "εγκρίθηκε ✅" : "απορρίφθηκε ❌"}${comment ? ` — "${comment}"` : ""}`);
  };
  const managerAddDirect = (scoutId, reqId, comment) => {
    upsertProgress(scoutId, reqId, { status: "Εγκρίθηκε", completed_date: today(), approved_date: today(), approved_by: me.id, comment: comment || "Χειροκίνητη καταχώρηση" }, "Καταχωρήθηκε χειροκίνητα");
    logAction("Καταχώρησε χειροκίνητα ολοκληρωμένη απαίτηση");
    notify(scoutId, "Καταχωρήθηκε ολοκληρωμένη απαίτηση από τον βαθμοφόρο/διαχειριστή σου.");
  };

  const getProofUrl = async (path) => {
    const { data, error } = await supabase.storage.from("proof-files").createSignedUrl(path, 3600);
    if (error) { alert("Δεν ήταν δυνατή η ανάκτηση του αρχείου."); return null; }
    return data.signedUrl;
  };


  const linkExistingUser = async (uid, name, role, leaderId) => {
    await supabase.from("profiles").insert({ id: uid, full_name: name, role, leader_id: role === "scout" ? leaderId : null });
    await logAction(`Πρόσθεσε προφίλ: ${name} (${role})`);
    await loadAll();
  };
  const leaderAddScout = async (uid, name) => {
    const { error } = await supabase.from("profiles").insert({ id: uid, full_name: name, role: "scout", leader_id: me.id });
    if (error) { alert("Σφάλμα: " + error.message); return; }
    await logAction(`Πρόσθεσε πρόσκοπο στην ομάδα: ${name}`);
    await loadAll();
  };
  const toggleActive = async (id, active) => { await supabase.from("profiles").update({ active: !active }).eq("id", id); await loadAll(); };
  const removeUser = async (id) => { await supabase.from("profiles").delete().eq("id", id); await logAction("Διέγραψε χρήστη"); await loadAll(); };
  const transferAdmin = async (toId) => {
    await supabase.from("profiles").update({ role: "admin" }).eq("id", toId);
    await supabase.from("profiles").update({ role: "leader" }).eq("id", me.id);
    await logAction("Μετέφερε τον ρόλο κύριου διαχειριστή");
    await loadAll();
    window.location.reload();
  };
  const addRequirement = async (stage, category, title) => { await supabase.from("requirements").insert({ stage, category, title }); await logAction(`Πρόσθεσε απαίτηση: ${title}`); await loadAll(); };
  const editRequirement = async (id, patch) => { await supabase.from("requirements").update(patch).eq("id", id); await logAction(`Επεξεργάστηκε απαίτηση`); await loadAll(); };
  const deleteRequirement = async (id) => { await supabase.from("requirements").delete().eq("id", id); await loadAll(); };
  const saveConfig = async (patch) => { await supabase.from("app_config").update(patch).eq("id", 1); setCfg({ ...cfg, ...patch }); };

  const scoutsOf = (leaderId) => users.filter((u) => u.role === "scout" && u.leader_id === leaderId && u.active);
  const allScouts = users.filter((u) => u.role === "scout");

  return (
    <div style={{ minHeight: "100vh", background: cfg.cream || "#F6F2E8", fontFamily: "'Inter', system-ui, sans-serif", color: "#2B2A22" }}>
      <style>{`* { box-sizing: border-box; } h1,h2,h3 { font-family: 'Fraunces', Georgia, serif; margin: 0; } @media (max-width: 640px) { .hide-sm { display: none !important; } }`}</style>

      <div style={{ background: cfg.primary_color, color: "#fff", padding: "14px 18px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 26 }}>{cfg.logo_emoji}</div>
            <div><h1 style={{ fontSize: 19, lineHeight: 1.1 }}>{cfg.org_name}</h1><div style={{ fontSize: 12, opacity: 0.8 }}>{cfg.tagline}</div></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <NotificationBell notifications={notifications} onOpen={markNotificationsRead} />
            <span style={{ fontSize: 13 }} className="hide-sm">{me.full_name}</span>
            <button onClick={() => supabase.auth.signOut()} style={{ background: "rgba(255,255,255,.15)", color: "#fff", border: "1px solid rgba(255,255,255,.3)", borderRadius: 8, padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
              <LogOut size={14} /> Έξοδος
            </button>
          </div>
        </div>
      </div>

      <div style={{ background: "#fff", borderBottom: "1px solid #E4E0D3", position: "sticky", top: 0, zIndex: 5 }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", gap: 4, padding: "0 12px", overflowX: "auto" }}>
          {tabsFor(me.role).map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ border: "none", background: "transparent", padding: "12px 14px", cursor: "pointer", fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", color: tab === t.key ? cfg.primary_color : "#8A8577", borderBottom: tab === t.key ? `2.5px solid ${cfg.primary_color}` : "2.5px solid transparent", display: "flex", alignItems: "center", gap: 6 }}>
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "20px 14px 60px" }}>
        {tab === "progress" && me.role === "scout" && (
          <ScoutView cfg={cfg} user={me} requirements={requirements} getProgressFor={getProgressFor} onStart={scoutStart} onSubmit={scoutSubmit} getProofUrl={getProofUrl} />
        )}
        {tab === "team" && me.role === "leader" && (
          <LeaderTeamView cfg={cfg} scouts={scoutsOf(me.id)} requirements={requirements} getProgressFor={getProgressFor} onAddScout={leaderAddScout} />
        )}
        {tab === "requests" && (me.role === "leader" || me.role === "admin") && (
          <RequestsView cfg={cfg} users={users} requirements={requirements} progress={progress}
            scopeScouts={me.role === "admin" ? allScouts : scoutsOf(me.id)} onDecide={reviewerDecide} onManualAdd={managerAddDirect} getProofUrl={getProofUrl} />
        )}
        {tab === "overview" && me.role === "admin" && <AdminOverview cfg={cfg} users={users} requirements={requirements} progress={progress} />}
        {tab === "scoutview" && me.role === "admin" && <AdminScoutDetail cfg={cfg} scouts={allScouts} requirements={requirements} progress={progress} users={users} getProgressFor={getProgressFor} getProofUrl={getProofUrl} />}
        {tab === "users" && me.role === "admin" && <AdminUsers cfg={cfg} users={users} me={me} onAdd={linkExistingUser} onToggle={toggleActive} onRemove={removeUser} onTransfer={transferAdmin} />}
        {tab === "catalog" && me.role === "admin" && <AdminCatalog cfg={cfg} requirements={requirements} onAdd={addRequirement} onEdit={editRequirement} onDelete={deleteRequirement} />}
        {tab === "appearance" && me.role === "admin" && <AdminAppearance cfg={cfg} onSave={saveConfig} />}
        {tab === "log" && me.role === "admin" && <AdminLog activity={activity} />}
      </div>
    </div>
  );
}

function tabsFor(role) {
  if (role === "scout") return [{ key: "progress", label: "Η πρόοδός μου", icon: Award }];
  if (role === "leader") return [{ key: "team", label: "Η ομάδα μου", icon: Users }, { key: "requests", label: "Αιτήματα", icon: ClipboardList }];
  return [
    { key: "overview", label: "Σύνοψη", icon: Shield },
    { key: "scoutview", label: "Προφίλ Προσκόπου", icon: Award },
    { key: "requests", label: "Αιτήματα", icon: ClipboardList },
    { key: "users", label: "Χρήστες", icon: UserCog },
    { key: "catalog", label: "Απαιτήσεις", icon: Trash2 },
    { key: "appearance", label: "Εμφάνιση", icon: Settings },
    { key: "log", label: "Ιστορικό", icon: History },
  ];
}

/* ---------------- ΠΡΟΣΚΟΠΟΣ ---------------- */
function ScoutView({ cfg, user, requirements, getProgressFor, onStart, onSubmit, getProofUrl }) {
  const [openStage, setOpenStage] = useState(STAGE_KEYS[0]);
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 10, marginBottom: 18 }}>
        {STAGE_KEYS.map((sk, i) => {
          const reqs = requirements.filter((r) => r.stage === sk);
          const done = reqs.filter((r) => getProgressFor(user.id, r.id)?.status === "Εγκρίθηκε").length;
          const pct = reqs.length ? Math.round((done / reqs.length) * 100) : 0;
          const stageColor = [cfg.moss_color, cfg.bronze_color, cfg.silver_color, cfg.gold_color][i];
          return (
            <Card key={sk} style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", border: openStage === sk ? `1.5px solid ${cfg.primary_color}` : "1px solid #E4E0D3" }}>
              <div onClick={() => setOpenStage(sk)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
                <Trefoil fillPct={pct} color={stageColor} />
                <div><div style={{ fontWeight: 700, fontSize: 13.5 }}>{STAGES[i]}</div><div style={{ fontSize: 12, color: "#8A8577" }}>{done}/{reqs.length} · {pct}%</div></div>
              </div>
            </Card>
          );
        })}
      </div>
      {STAGE_KEYS.filter((sk) => sk === openStage).map((sk) => {
        const idx = STAGE_KEYS.indexOf(sk);
        const reqs = requirements.filter((r) => r.stage === sk);
        const byCategory = {};
        reqs.forEach((r) => { (byCategory[r.category] ||= []).push(r); });
        return (
          <div key={sk}>
            <h2 style={{ fontSize: 18, margin: "6px 0 12px" }}>{STAGES[idx]}</h2>
            {Object.entries(byCategory).map(([cat, list]) => (
              <div key={cat} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#8A8577", textTransform: "uppercase", marginBottom: 8 }}>{cat}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {list.map((r) => (
                    <ScoutRequirementCard key={r.id} cfg={cfg} r={r} p={getProgressFor(user.id, r.id)} onStart={onStart} onSubmit={onSubmit} getProofUrl={getProofUrl} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function ScoutRequirementCard({ cfg, r, p, onStart, onSubmit, getProofUrl }) {
  const [attaching, setAttaching] = useState(false);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const status = p?.status || "Δεν ξεκίνησε";
  const tone = statusColor(status, cfg);

  const confirmSubmit = async () => {
    setBusy(true);
    await onSubmit(r.id, file);
    setBusy(false); setAttaching(false); setFile(null);
  };
  const viewProof = async () => {
    const url = await getProofUrl(p.proof_url);
    if (url) window.open(url, "_blank");
  };

  return (
    <Card style={{ padding: "12px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 7 }}>
            <LevelBadge level={r.level} cfg={cfg} /> {r.title}
          </div>
          {p?.comment && status === "Απορρίφθηκε" && <div style={{ fontSize: 12, color: "#8B3A3A", marginTop: 3 }}>Σχόλιο: {p.comment}</div>}
          {p?.proof_url && (
            <button onClick={viewProof} style={{ marginTop: 4, background: "none", border: "none", padding: 0, color: cfg.moss_color, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              <Paperclip size={12} /> {p.proof_name || "Αποδεικτικό αρχείο"}
            </button>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Pill tone={tone}><StatusIcon status={status} />{status}</Pill>
          {status === "Δεν ξεκίνησε" && <Button cfg={cfg} small onClick={() => onStart(r.id)}>Έναρξη</Button>}
          {status === "Σε εξέλιξη" && !attaching && <Button cfg={cfg} small onClick={() => setAttaching(true)}>Υποβολή</Button>}
          {status === "Απορρίφθηκε" && <Button cfg={cfg} small variant="subtle" onClick={() => onStart(r.id)}>Ξαναδοκίμασε</Button>}
        </div>
      </div>
      {attaching && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #EDEAE0", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 12, color: "#8A8577" }}>Μπορείς προαιρετικά να επισυνάψεις φωτογραφία ή αρχείο (Word, PowerPoint, PDF) ως αποδεικτικό.</div>
          <input type="file" accept="image/*,.pdf,.doc,.docx,.ppt,.pptx" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ fontSize: 12.5 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <Button cfg={cfg} small disabled={busy} onClick={confirmSubmit}>{busy ? "Υποβολή…" : "Επιβεβαίωση υποβολής"}</Button>
            <Button cfg={cfg} small variant="subtle" onClick={() => { setAttaching(false); setFile(null); }}>Άκυρο</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ---------------- ΒΑΘΜΟΦΟΡΟΣ: ΟΜΑΔΑ ---------------- */
function LeaderTeamView({ cfg, scouts, requirements, getProgressFor, onAddScout }) {
  const [uidInput, setUidInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 style={{ fontSize: 18 }}>Η ομάδα μου ({scouts.length})</h2>

      <Card style={{ background: "#FBF9F3" }}>
        <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13.5 }}>Προσθήκη προσκόπου στην ομάδα μου</div>
        <div style={{ fontSize: 12, color: "#8A8577", marginBottom: 10 }}>
          Ζήτησε από τον διαχειριστή να δημιουργήσει τον λογαριασμό (email + κωδικός) στο Supabase και να σου δώσει το User UID. Μετά τον συνδέεις εδώ, αυτόματα στη δική σου ομάδα.
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input placeholder="User UID" value={uidInput} onChange={(e) => setUidInput(e.target.value)} style={{ ...selStyle, minWidth: 220 }} />
          <input placeholder="Ονοματεπώνυμο" value={nameInput} onChange={(e) => setNameInput(e.target.value)} style={{ ...selStyle, flex: 1, minWidth: 140 }} />
        </div>
        <div style={{ marginTop: 10 }}>
          <Button cfg={cfg} small icon={Plus} onClick={() => { if (uidInput.trim() && nameInput.trim()) { onAddScout(uidInput.trim(), nameInput.trim()); setUidInput(""); setNameInput(""); } }}>Προσθήκη</Button>
        </div>
      </Card>

      {scouts.length === 0 && <Card><div style={{ color: "#8A8577" }}>Δεν έχεις ακόμη προσκόπους στην ομάδα σου.</div></Card>}
      {scouts.map((s) => (
        <Card key={s.id}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>{s.full_name}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 8 }}>
            {STAGE_KEYS.map((sk, i) => {
              const reqs = requirements.filter((r) => r.stage === sk);
              const done = reqs.filter((r) => getProgressFor(s.id, r.id)?.status === "Εγκρίθηκε").length;
              const pct = reqs.length ? Math.round((done / reqs.length) * 100) : 0;
              const stageColor = [cfg.moss_color, cfg.bronze_color, cfg.silver_color, cfg.gold_color][i];
              return <div key={sk} style={{ display: "flex", alignItems: "center", gap: 8 }}><Trefoil fillPct={pct} size={26} color={stageColor} /><div style={{ fontSize: 12 }}><div style={{ fontWeight: 600 }}>{STAGES[i]}</div><div style={{ color: "#8A8577" }}>{pct}%</div></div></div>;
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ---------------- ΑΙΤΗΜΑΤΑ ---------------- */
function RequestsView({ cfg, users, requirements, progress, scopeScouts, onDecide, onManualAdd, getProofUrl }) {
  const [commentDraft, setCommentDraft] = useState({});
  const [manualPicker, setManualPicker] = useState(null);
  const scoutIds = new Set(scopeScouts.map((s) => s.id));
  const pending = progress.filter((p) => p.status === "Αναμένει έγκριση" && scoutIds.has(p.scout_id));
  const history = progress.filter((p) => (p.status === "Εγκρίθηκε" || p.status === "Απορρίφθηκε") && scoutIds.has(p.scout_id)).sort((a, b) => (b.approved_date || "").localeCompare(a.approved_date || ""));
  const reqMap = Object.fromEntries(requirements.map((r) => [r.id, r]));
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
  const viewProof = async (path) => { const url = await getProofUrl(path); if (url) window.open(url, "_blank"); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ fontSize: 18 }}>Αιτήματα σε αναμονή ({pending.length})</h2>
        <Button cfg={cfg} variant="subtle" small icon={Plus} onClick={() => setManualPicker({})}>Χειροκίνητη καταχώρηση</Button>
      </div>
      {manualPicker && (
        <Card style={{ marginBottom: 14, background: "#FBF9F3" }}>
          <ManualAddForm cfg={cfg} scouts={scopeScouts} requirements={requirements} onCancel={() => setManualPicker(null)}
            onSubmit={(scoutId, reqId, comment) => { onManualAdd(scoutId, reqId, comment); setManualPicker(null); }} />
        </Card>
      )}
      {pending.length === 0 && <Card><div style={{ color: "#8A8577" }}>Κανένα εκκρεμές αίτημα.</div></Card>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {pending.map((p) => {
          const req = reqMap[p.requirement_id]; const scout = userMap[p.scout_id];
          return (
            <Card key={p.id}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{req?.title}</div>
              <div style={{ fontSize: 12, color: "#8A8577" }}>{scout?.full_name} · {STAGES[STAGE_KEYS.indexOf(req?.stage)]} · υποβλήθηκε {p.completed_date}</div>
              {p.proof_url && (
                <button onClick={() => viewProof(p.proof_url)} style={{ marginTop: 6, background: "none", border: "none", padding: 0, color: cfg.moss_color, fontSize: 12.5, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                  <Paperclip size={13} /> {p.proof_name || "Προβολή αποδεικτικού"}
                </button>
              )}
              <input placeholder="Σχόλιο (προαιρετικό)…" value={commentDraft[p.id] || ""} onChange={(e) => setCommentDraft({ ...commentDraft, [p.id]: e.target.value })} style={{ width: "100%", marginTop: 10, ...selStyle }} />
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <Button cfg={cfg} small icon={Check} onClick={() => onDecide(p.scout_id, p.requirement_id, true, commentDraft[p.id])}>Έγκριση</Button>
                <Button cfg={cfg} small variant="danger" icon={X} onClick={() => onDecide(p.scout_id, p.requirement_id, false, commentDraft[p.id])}>Απόρριψη</Button>
              </div>
            </Card>
          );
        })}
      </div>
      <h3 style={{ fontSize: 15, margin: "22px 0 10px" }}>Ιστορικό αποφάσεων</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {history.slice(0, 15).map((p) => {
          const req = reqMap[p.requirement_id]; const scout = userMap[p.scout_id]; const tone = statusColor(p.status, cfg);
          return <Card key={p.id} style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}><div style={{ fontSize: 13 }}><b>{scout?.full_name}</b> — {req?.title}</div><Pill tone={tone}><StatusIcon status={p.status} />{p.status}</Pill></Card>;
        })}
      </div>
    </div>
  );
}
function ManualAddForm({ cfg, scouts, requirements, onSubmit, onCancel }) {
  const [scoutId, setScoutId] = useState(scouts[0]?.id || "");
  const [reqId, setReqId] = useState(requirements[0]?.id || "");
  const [comment, setComment] = useState("");
  return (
    <div>
      <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 13.5 }}>Καταχώρηση ολοκληρωμένης απαίτησης</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <select value={scoutId} onChange={(e) => setScoutId(e.target.value)} style={selStyle}>{scouts.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select>
        <select value={reqId} onChange={(e) => setReqId(e.target.value)} style={{ ...selStyle, flex: 1, minWidth: 180 }}>{requirements.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}</select>
      </div>
      <input placeholder="Σχόλιο (προαιρετικό)" value={comment} onChange={(e) => setComment(e.target.value)} style={{ width: "100%", marginTop: 8, ...selStyle }} />
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <Button cfg={cfg} small onClick={() => scoutId && reqId && onSubmit(scoutId, reqId, comment)}>Καταχώρηση</Button>
        <Button cfg={cfg} small variant="subtle" onClick={onCancel}>Άκυρο</Button>
      </div>
    </div>
  );
}

/* ---------------- ADMIN ---------------- */
function AdminOverview({ cfg, users, requirements, progress }) {
  const scouts = users.filter((u) => u.role === "scout");
  const leaders = users.filter((u) => u.role === "leader");
  const pending = progress.filter((p) => p.status === "Αναμένει έγκριση").length;
  const approved = progress.filter((p) => p.status === "Εγκρίθηκε").length;
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  const allRows = () => scouts.flatMap((s) =>
    buildExportRows(s.full_name, requirements, progress.filter((p) => p.scout_id === s.id), userMap)
      .map((row) => ({ "Πρόσκοπος": s.full_name, ...row }))
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ fontSize: 18 }}>Σύνοψη</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <Button cfg={cfg} small variant="subtle" icon={FileDown} onClick={() => exportToExcel("proodos-olon.xlsx", "Πρόοδος", allRows())}>Excel</Button>
          <Button cfg={cfg} small variant="subtle" icon={FileDown} onClick={() => exportToPDF("proodos-olon.pdf", "Πρόοδος όλων των προσκόπων", allRows())}>PDF</Button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 10 }}>
        {[["Πρόσκοποι", scouts.length], ["Βαθμοφόροι", leaders.length], ["Απαιτήσεις", requirements.length], ["Εκκρεμή", pending], ["Εγκεκριμένα", approved]].map(([label, val]) => (
          <Card key={label} style={{ textAlign: "center" }}><div style={{ fontFamily: "'Fraunces', serif", fontSize: 26, color: cfg.primary_color, fontWeight: 700 }}>{val}</div><div style={{ fontSize: 12, color: "#8A8577" }}>{label}</div></Card>
        ))}
      </div>
    </div>
  );
}
function AdminScoutDetail({ cfg, scouts, requirements, progress, users, getProgressFor, getProofUrl }) {
  const [scoutId, setScoutId] = useState(scouts[0]?.id || "");
  const [openStage, setOpenStage] = useState(STAGE_KEYS[0]);
  const scout = scouts.find((s) => s.id === scoutId);
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  if (scouts.length === 0) return <div><h2 style={{ fontSize: 18, marginBottom: 12 }}>Προφίλ Προσκόπου</h2><Card><div style={{ color: "#8A8577" }}>Δεν υπάρχουν ακόμη πρόσκοποι.</div></Card></div>;

  return (
    <div>
      <h2 style={{ fontSize: 18, marginBottom: 12 }}>Προφίλ Προσκόπου</h2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        <select value={scoutId} onChange={(e) => setScoutId(e.target.value)} style={{ ...selStyle, minWidth: 220 }}>
          {scouts.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
        </select>
        {scout && (
          <>
            <Button cfg={cfg} small variant="subtle" icon={FileDown} onClick={() => exportToExcel(`${scout.full_name}.xlsx`, "Πρόοδος", buildExportRows(scout.full_name, requirements, progress.filter((p) => p.scout_id === scout.id), userMap))}>Excel</Button>
            <Button cfg={cfg} small variant="subtle" icon={FileDown} onClick={() => exportToPDF(`${scout.full_name}.pdf`, `Πρόοδος — ${scout.full_name}`, buildExportRows(scout.full_name, requirements, progress.filter((p) => p.scout_id === scout.id), userMap))}>PDF</Button>
          </>
        )}
      </div>

      {scout && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 10, marginBottom: 18 }}>
            {STAGE_KEYS.map((sk, i) => {
              const reqs = requirements.filter((r) => r.stage === sk);
              const done = reqs.filter((r) => getProgressFor(scout.id, r.id)?.status === "Εγκρίθηκε").length;
              const pct = reqs.length ? Math.round((done / reqs.length) * 100) : 0;
              const stageColor = [cfg.moss_color, cfg.bronze_color, cfg.silver_color, cfg.gold_color][i];
              return (
                <Card key={sk} style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", border: openStage === sk ? `1.5px solid ${cfg.primary_color}` : "1px solid #E4E0D3" }}>
                  <div onClick={() => setOpenStage(sk)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
                    <Trefoil fillPct={pct} color={stageColor} />
                    <div><div style={{ fontWeight: 700, fontSize: 13.5 }}>{STAGES[i]}</div><div style={{ fontSize: 12, color: "#8A8577" }}>{done}/{reqs.length} · {pct}%</div></div>
                  </div>
                </Card>
              );
            })}
          </div>

          {STAGE_KEYS.filter((sk) => sk === openStage).map((sk) => {
            const idx = STAGE_KEYS.indexOf(sk);
            const reqs = requirements.filter((r) => r.stage === sk).sort((a, b) => (a.aa || 0) - (b.aa || 0));
            const byCategory = {};
            reqs.forEach((r) => { (byCategory[r.category] ||= []).push(r); });
            return (
              <div key={sk}>
                <h3 style={{ fontSize: 16, margin: "6px 0 12px" }}>{STAGES[idx]}</h3>
                {Object.entries(byCategory).map(([cat, list]) => (
                  <div key={cat} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#8A8577", textTransform: "uppercase", marginBottom: 6 }}>{cat}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {list.map((r) => {
                        const p = getProgressFor(scout.id, r.id);
                        const status = p?.status || "Δεν ξεκίνησε";
                        const tone = statusColor(status, cfg);
                        return (
                          <Card key={r.id} style={{ padding: "10px 14px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                              <div style={{ fontSize: 13.5, display: "flex", alignItems: "center", gap: 7 }}>
                                <LevelBadge level={r.level} cfg={cfg} /> {r.title}
                                {p?.comment && <span style={{ color: "#8A8577", marginLeft: 4 }}>· "{p.comment}"</span>}
                                {p?.proof_url && (
                                  <button onClick={async () => { const url = await getProofUrl(p.proof_url); if (url) window.open(url, "_blank"); }} style={{ background: "none", border: "none", padding: 0, color: cfg.moss_color, cursor: "pointer", display: "flex", alignItems: "center" }}>
                                    <Paperclip size={13} />
                                  </button>
                                )}
                              </div>
                              <Pill tone={tone}><StatusIcon status={status} />{status}</Pill>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

function AdminUsers({ cfg, users, me, onAdd, onToggle, onRemove, onTransfer }) {
  const [uidInput, setUidInput] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("scout");
  const leaders = users.filter((u) => u.role === "leader");
  const [leaderId, setLeaderId] = useState("");
  const [transferTo, setTransferTo] = useState("");

  return (
    <div>
      <h2 style={{ fontSize: 18, marginBottom: 12 }}>Διαχείριση χρηστών</h2>
      <Card style={{ marginBottom: 16, background: "#FBF9F3" }}>
        <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13.5 }}>Σύνδεση νέου προφίλ</div>
        <div style={{ fontSize: 12, color: "#8A8577", marginBottom: 10 }}>
          Πρώτα δημιούργησε τον λογαριασμό στο Supabase (Authentication → Users → Add user), αντίγραψε το User UID, και σύνδεσέ το εδώ με όνομα/ρόλο.
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input placeholder="User UID" value={uidInput} onChange={(e) => setUidInput(e.target.value)} style={{ ...selStyle, minWidth: 220 }} />
          <input placeholder="Ονοματεπώνυμο" value={name} onChange={(e) => setName(e.target.value)} style={{ ...selStyle, flex: 1, minWidth: 140 }} />
          <select value={role} onChange={(e) => setRole(e.target.value)} style={selStyle}>
            <option value="scout">Πρόσκοπος</option><option value="leader">Βαθμοφόρος</option><option value="admin">Διαχειριστής</option>
          </select>
          {role === "scout" && <select value={leaderId} onChange={(e) => setLeaderId(e.target.value)} style={selStyle}><option value="">Επίλεξε βαθμοφόρο…</option>{leaders.map((l) => <option key={l.id} value={l.id}>{l.full_name}</option>)}</select>}
        </div>
        <div style={{ marginTop: 10 }}>
          <Button cfg={cfg} small icon={Plus} onClick={() => { if (uidInput.trim() && name.trim()) { onAdd(uidInput.trim(), name.trim(), role, leaderId || null); setUidInput(""); setName(""); } }}>Σύνδεση προφίλ</Button>
        </div>
      </Card>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {users.map((u) => (
          <Card key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, padding: "10px 14px", opacity: u.active ? 1 : 0.5 }}>
            <div><div style={{ fontWeight: 600, fontSize: 13.5 }}>{u.full_name} {u.id === me.id && <span style={{ color: cfg.primary_color }}>(εσύ)</span>}</div><div style={{ fontSize: 12, color: "#8A8577" }}>{u.role === "scout" ? "Πρόσκοπος" : u.role === "leader" ? "Βαθμοφόρος" : "Διαχειριστής"}{!u.active && " · ανενεργός"}</div></div>
            <div style={{ display: "flex", gap: 6 }}>
              <Button cfg={cfg} small variant="subtle" onClick={() => onToggle(u.id, u.active)}>{u.active ? "Απενεργοποίηση" : "Ενεργοποίηση"}</Button>
              {u.id !== me.id && <Button cfg={cfg} small variant="danger" icon={Trash2} onClick={() => onRemove(u.id)}>Διαγραφή</Button>}
            </div>
          </Card>
        ))}
      </div>
      <Card style={{ marginTop: 18, borderColor: cfg.gold_color }}>
        <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13.5, display: "flex", alignItems: "center", gap: 6 }}><ArrowLeftRight size={15} color={cfg.gold_color} /> Μεταφορά ρόλου κύριου διαχειριστή</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select value={transferTo} onChange={(e) => setTransferTo(e.target.value)} style={selStyle}><option value="">Επίλεξε χρήστη…</option>{users.filter((u) => u.id !== me.id && u.active).map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}</select>
          <Button cfg={cfg} small variant="danger" disabled={!transferTo} onClick={() => transferTo && onTransfer(transferTo)}>Μεταφορά</Button>
        </div>
      </Card>
    </div>
  );
}
function AdminCatalog({ cfg, requirements, onAdd, onEdit, onDelete }) {
  const [stage, setStage] = useState(STAGE_KEYS[0]);
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [openStage, setOpenStage] = useState(STAGE_KEYS[0]);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});

  const startEdit = (r) => { setEditingId(r.id); setEditDraft({ title: r.title, category: r.category, level: r.level || "" }); };
  const saveEdit = (id) => { onEdit(id, editDraft); setEditingId(null); };

  return (
    <div>
      <h2 style={{ fontSize: 18, marginBottom: 12 }}>Κατάλογος απαιτήσεων</h2>
      <Card style={{ marginBottom: 16, background: "#FBF9F3" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select value={stage} onChange={(e) => setStage(e.target.value)} style={selStyle}>{STAGE_KEYS.map((sk, i) => <option key={sk} value={sk}>{STAGES[i]}</option>)}</select>
          <input placeholder="Κατηγορία" value={category} onChange={(e) => setCategory(e.target.value)} style={selStyle} />
          <input placeholder="Τίτλος απαίτησης" value={title} onChange={(e) => setTitle(e.target.value)} style={{ ...selStyle, flex: 1, minWidth: 180 }} />
        </div>
        <div style={{ marginTop: 10 }}><Button cfg={cfg} small icon={Plus} onClick={() => { if (title.trim() && category.trim()) { onAdd(stage, category.trim(), title.trim()); setTitle(""); } }}>Προσθήκη</Button></div>
      </Card>
      {STAGE_KEYS.map((sk, i) => (
        <div key={sk} style={{ marginBottom: 8 }}>
          <button onClick={() => setOpenStage(openStage === sk ? null : sk)} style={{ width: "100%", textAlign: "left", background: "#fff", border: "1px solid #E4E0D3", borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
            {STAGES[i]} <span style={{ display: "flex", gap: 4, fontWeight: 400, fontSize: 12, color: "#8A8577" }}>{requirements.filter((r) => r.stage === sk).length} απαιτήσεις {openStage === sk ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
          </button>
          {openStage === sk && <div style={{ padding: "8px 4px", display: "flex", flexDirection: "column", gap: 6 }}>{requirements.filter((r) => r.stage === sk).sort((a,b) => (a.aa||0)-(b.aa||0)).map((r) => (
            editingId === r.id ? (
              <div key={r.id} style={{ padding: "10px", background: "#FBF9F3", border: `1px solid ${cfg.primary_color}55`, borderRadius: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                <input value={editDraft.title} onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })} style={selStyle} placeholder="Τίτλος" />
                <div style={{ display: "flex", gap: 6 }}>
                  <input value={editDraft.category} onChange={(e) => setEditDraft({ ...editDraft, category: e.target.value })} style={{ ...selStyle, flex: 1 }} placeholder="Κατηγορία" />
                  <input value={editDraft.level} onChange={(e) => setEditDraft({ ...editDraft, level: e.target.value })} style={{ ...selStyle, width: 70 }} placeholder="Επίπεδο" />
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <Button cfg={cfg} small icon={Save} onClick={() => saveEdit(r.id)}>Αποθήκευση</Button>
                  <Button cfg={cfg} small variant="subtle" onClick={() => setEditingId(null)}>Άκυρο</Button>
                </div>
              </div>
            ) : (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "8px 10px", background: "#fff", border: "1px solid #EDEAE0", borderRadius: 8 }}>
                <div style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 7 }}>
                  <LevelBadge level={r.level} cfg={cfg} />
                  {r.aa && <span style={{ color: "#8A8577", fontSize: 11 }}>#{r.aa}</span>}
                  {r.title} <span style={{ color: "#8A8577" }}>· {r.category}</span>
                </div>
                <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
                  <button onClick={() => startEdit(r)} style={{ background: "none", border: "none", cursor: "pointer", color: cfg.primary_color }}><Edit3 size={14} /></button>
                  <button onClick={() => onDelete(r.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#8B3A3A" }}><Trash2 size={14} /></button>
                </div>
              </div>
            )
          ))}</div>}
        </div>
      ))}
    </div>
  );
}
function AdminAppearance({ cfg, onSave }) {
  const [local, setLocal] = useState(cfg);
  return (
    <div>
      <h2 style={{ fontSize: 18, marginBottom: 12 }}>Προσαρμογή εμφάνισης</h2>
      <Card style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 420 }}>
        <label style={{ fontSize: 12.5, fontWeight: 600 }}>Όνομα συστήματος<input value={local.org_name} onChange={(e) => setLocal({ ...local, org_name: e.target.value })} style={{ ...selStyle, width: "100%", marginTop: 4 }} /></label>
        <label style={{ fontSize: 12.5, fontWeight: 600 }}>Υπότιτλος<input value={local.tagline} onChange={(e) => setLocal({ ...local, tagline: e.target.value })} style={{ ...selStyle, width: "100%", marginTop: 4 }} /></label>
        <label style={{ fontSize: 12.5, fontWeight: 600 }}>Λογότυπο (emoji)<input value={local.logo_emoji} onChange={(e) => setLocal({ ...local, logo_emoji: e.target.value })} style={{ ...selStyle, width: 80, marginTop: 4 }} /></label>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[["primary_color", "Κύριο"], ["moss_color", "Χάλκινο"], ["bronze_color", "Χάλκινο 2"], ["silver_color", "Ασημί"], ["gold_color", "Χρυσό"]].map(([k, label]) => (
            <label key={k} style={{ fontSize: 12, fontWeight: 600 }}>{label}<input type="color" value={local[k]} onChange={(e) => setLocal({ ...local, [k]: e.target.value })} style={{ display: "block", marginTop: 4, width: 44, height: 30, border: "1px solid #E4E0D3", borderRadius: 6, cursor: "pointer" }} /></label>
          ))}
        </div>
        <div><Button cfg={cfg} onClick={() => onSave(local)}>Αποθήκευση</Button></div>
      </Card>
    </div>
  );
}
function AdminLog({ activity }) {
  return (
    <div>
      <h2 style={{ fontSize: 18, marginBottom: 12 }}>Ιστορικό ενεργειών</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {activity.length === 0 && <Card><div style={{ color: "#8A8577" }}>Καμία καταγεγραμμένη ενέργεια ακόμη.</div></Card>}
        {activity.map((a) => <Card key={a.id} style={{ padding: "9px 14px", fontSize: 12.5, display: "flex", justifyContent: "space-between" }}><span><b>{a.actor_name}</b> — {a.action}</span><span style={{ color: "#8A8577" }}>{new Date(a.ts).toLocaleString("el-GR")}</span></Card>)}
      </div>
    </div>
  );
}
