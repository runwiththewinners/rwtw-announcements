"use client";
import { useState, useEffect } from "react";

interface Announcement {
  id: string;
  type: string;
  title: string;
  body: string;
  ctaText: string;
  ctaUrl: string;
  pinned: boolean;
  createdAt: string;
}

interface Props {
  authenticated: boolean;
  isAdmin: boolean;
}

const TYPE_CONFIG: Record<string, { label: string; icon: string; className: string }> = {
  launch: { label: "New Launch", icon: "🚀", className: "type-launch" },
  promo: { label: "Promo", icon: "🔥", className: "type-promo" },
  milestone: { label: "Milestone", icon: "🏆", className: "type-milestone" },
  update: { label: "Update", icon: "⚡", className: "type-update" },
  schedule: { label: "Schedule", icon: "📅", className: "type-schedule" },
};

export default function AnnouncementsClient({ authenticated, isAdmin }: Props) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Admin state
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminSecret, setAdminSecret] = useState("");
  const [adminType, setAdminType] = useState("update");
  const [adminTitle, setAdminTitle] = useState("");
  const [adminBody, setAdminBody] = useState("");
  const [adminCtaText, setAdminCtaText] = useState("");
  const [adminCtaUrl, setAdminCtaUrl] = useState("");
  const [adminPinned, setAdminPinned] = useState(false);
  const [adminStatus, setAdminStatus] = useState<string | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);

  // Fetch announcements
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [annRes, memRes] = await Promise.all([
          fetch("/api/announcements"),
          fetch("/api/members"),
        ]);
        const annData = await annRes.json();
        const memData = await memRes.json();
        setAnnouncements(annData.announcements || []);
        if (memData.count !== null) setMemberCount(memData.count);
      } catch {}
      setLoading(false);
    };
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const handlePost = async () => {
    if (!adminSecret || !adminTitle || !adminBody) {
      setAdminStatus("Missing required fields");
      return;
    }
    setAdminLoading(true);
    setAdminStatus(null);
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": adminSecret },
        body: JSON.stringify({
          type: adminType,
          title: adminTitle,
          body: adminBody,
          ctaText: adminCtaText,
          ctaUrl: adminCtaUrl,
          pinned: adminPinned,
        }),
      });
      if (res.ok) {
        setAdminStatus("Announcement posted!");
        setAdminTitle("");
        setAdminBody("");
        setAdminCtaText("");
        setAdminCtaUrl("");
        setAdminPinned(false);
        // Refresh
        const annRes = await fetch("/api/announcements");
        const annData = await annRes.json();
        setAnnouncements(annData.announcements || []);
      } else {
        const data = await res.json();
        setAdminStatus("Error: " + data.error);
      }
    } catch {
      setAdminStatus("Post failed");
    }
    setAdminLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!adminSecret) { setAdminStatus("Enter admin secret"); return; }
    try {
      const res = await fetch("/api/announcements", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "x-admin-secret": adminSecret },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      }
    } catch {}
  };

  const handleTogglePin = async (id: string, currentPinned: boolean) => {
    if (!adminSecret) { setAdminStatus("Enter admin secret"); return; }
    try {
      const res = await fetch("/api/announcements", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-secret": adminSecret },
        body: JSON.stringify({ id, pinned: !currentPinned }),
      });
      if (res.ok) {
        setAnnouncements((prev) =>
          prev.map((a) => (a.id === id ? { ...a, pinned: !currentPinned } : a))
        );
      }
    } catch {}
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatRelative = (dateStr: string) => {
    const now = new Date().getTime();
    const then = new Date(dateStr).getTime();
    const diff = now - then;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return formatDate(dateStr);
  };

  const pinned = announcements.filter((a) => a.pinned);
  const regular = announcements.filter((a) => !a.pinned);

  return (
    <>
      <style>{styles}</style>
      <div className="ann-wrap">
        <div className="ann-content">

          <header className="ann-hero">
            <div className="ann-badge">📢 Community</div>
            <h1 className="ann-title"><span className="gold">Announcements</span></h1>
            <p className="ann-sub">Updates, launches, promos, and milestones from the RWTW team.</p>
          </header>

          {/* Member count milestone - auto updating */}
          {memberCount !== null && memberCount > 0 && (
            <div className="milestone-card">
              <div className="milestone-icon">👥</div>
              <div className="milestone-info">
                <div className="milestone-count">{memberCount.toLocaleString()}</div>
                <div className="milestone-label">Active Members & Growing</div>
              </div>
            </div>
          )}

          {/* Pinned announcements */}
          {pinned.map((a) => (
            <div key={a.id} className="pinned-banner">
              <div className="pinned-label">
                <span className="pinned-pin">📌</span> Pinned
              </div>
              <div className="pinned-body">
                <div className="announce-type-badge">
                  <span className={`announce-type ${TYPE_CONFIG[a.type]?.className || "type-update"}`}>
                    {TYPE_CONFIG[a.type]?.icon} {TYPE_CONFIG[a.type]?.label || a.type}
                  </span>
                  <span className="announce-date">{formatRelative(a.createdAt)}</span>
                </div>
                <div className="pinned-title">{a.title}</div>
                <div className="pinned-text">{a.body}</div>
                {a.ctaText && a.ctaUrl && (
                  <a href={a.ctaUrl} target="_blank" rel="noopener noreferrer" className="pinned-cta">{a.ctaText}</a>
                )}
                {isAdmin && showAdmin && (
                  <div className="admin-card-actions">
                    <button className="aca-btn" onClick={() => handleTogglePin(a.id, a.pinned)}>Unpin</button>
                    <button className="aca-btn aca-delete" onClick={() => handleDelete(a.id)}>Delete</button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading */}
          {loading && (
            <div className="loading-state">
              <div className="loading-spinner" />
              <p>Loading announcements...</p>
            </div>
          )}

          {/* Regular announcements */}
          {regular.map((a) => (
            <div key={a.id} className="announce-card">
              <div className="announce-top">
                <span className={`announce-type ${TYPE_CONFIG[a.type]?.className || "type-update"}`}>
                  {TYPE_CONFIG[a.type]?.icon} {TYPE_CONFIG[a.type]?.label || a.type}
                </span>
                <span className="announce-date">{formatRelative(a.createdAt)}</span>
              </div>
              <div className="announce-body">
                <div className="announce-card-title">{a.title}</div>
                <div className="announce-text">{a.body}</div>
              </div>
              {a.ctaText && a.ctaUrl && (
                <div className="announce-footer">
                  <a href={a.ctaUrl} target="_blank" rel="noopener noreferrer" className="announce-btn btn-primary">{a.ctaText}</a>
                </div>
              )}
              {isAdmin && showAdmin && (
                <div className="admin-card-actions-bottom">
                  <button className="aca-btn" onClick={() => handleTogglePin(a.id, a.pinned)}>
                    {a.pinned ? "Unpin" : "Pin"}
                  </button>
                  <button className="aca-btn aca-delete" onClick={() => handleDelete(a.id)}>Delete</button>
                </div>
              )}
            </div>
          ))}

          {/* Empty state */}
          {!loading && announcements.length === 0 && (
            <div className="empty-state">
              <span className="empty-icon">📢</span>
              <h3>No Announcements Yet</h3>
              <p>Check back soon for updates from the RWTW team.</p>
            </div>
          )}

          {/* Admin Panel */}
          {isAdmin && (
            <div className="admin-panel">
              <button className="admin-toggle" onClick={() => setShowAdmin(!showAdmin)}>
                {showAdmin ? "▲ Hide Admin" : "⚙ Admin Controls"}
              </button>

              {showAdmin && (
                <div className="admin-body">
                  <div className="admin-field">
                    <label>Admin Secret</label>
                    <input type="password" value={adminSecret} onChange={(e) => setAdminSecret(e.target.value)} placeholder="Enter secret" />
                  </div>

                  <div className="admin-field">
                    <label>Announcement Type</label>
                    <div className="type-selector">
                      {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                        <button
                          key={key}
                          className={`type-option ${adminType === key ? "active" : ""}`}
                          onClick={() => setAdminType(key)}
                        >
                          {cfg.icon} {cfg.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="admin-field">
                    <label>Title</label>
                    <input type="text" value={adminTitle} onChange={(e) => setAdminTitle(e.target.value)} placeholder="Announcement title" />
                  </div>

                  <div className="admin-field">
                    <label>Body</label>
                    <textarea
                      className="admin-textarea"
                      value={adminBody}
                      onChange={(e) => setAdminBody(e.target.value)}
                      placeholder="Write your announcement..."
                      rows={5}
                    />
                  </div>

                  <div className="admin-field">
                    <label>CTA Button Text (optional)</label>
                    <input type="text" value={adminCtaText} onChange={(e) => setAdminCtaText(e.target.value)} placeholder="e.g. Check It Out" />
                  </div>

                  <div className="admin-field">
                    <label>CTA Button URL (optional)</label>
                    <input type="text" value={adminCtaUrl} onChange={(e) => setAdminCtaUrl(e.target.value)} placeholder="https://whop.com/rwtw/" />
                  </div>

                  <div className="admin-field">
                    <label className="pin-label">
                      <input type="checkbox" checked={adminPinned} onChange={(e) => setAdminPinned(e.target.checked)} />
                      Pin this announcement
                    </label>
                  </div>

                  <button className="admin-post-btn" onClick={handlePost} disabled={adminLoading}>
                    {adminLoading ? "Posting..." : "Post Announcement"}
                  </button>

                  {adminStatus && (
                    <p className={`admin-status${adminStatus.startsWith("Error") || adminStatus.includes("failed") ? " err" : ""}`}>
                      {adminStatus}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  );
}

const styles = `
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}

:root{
  --gold:#d4a843;--gold-hi:#f0c95c;--gold-lo:#a07c2e;
  --fire:#e8522a;
  --blue:#4ea8f6;--green:#4ade80;--red:#ef4444;--purple:#a855f7;
  --txt:#f5f1eb;--txt2:rgba(245,241,235,.55);--txt3:rgba(245,241,235,.3);
  --border:rgba(255,255,255,.08);--glass:rgba(255,255,255,.03);--card-bg:rgba(255,255,255,.04);
  --page-bg:#111113;
}
@media(prefers-color-scheme:light){
  :root{
    --txt:#1a1a1a;--txt2:rgba(26,26,26,.6);--txt3:rgba(26,26,26,.35);
    --border:rgba(0,0,0,.1);--glass:rgba(0,0,0,.03);--card-bg:rgba(0,0,0,.03);
    --page-bg:#f5f5f5;
  }
}
body{background:var(--page-bg);font-family:'DM Sans',system-ui,-apple-system,sans-serif;color:var(--txt);-webkit-font-smoothing:antialiased}
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&family=Oswald:wght@400;500;600;700&display=swap');

.ann-wrap{min-height:100vh;overflow-x:hidden}
.ann-content{max-width:500px;margin:0 auto;padding:0 20px 100px}

/* Hero */
.ann-hero{text-align:center;padding:44px 0 24px}
.ann-badge{display:inline-flex;align-items:center;gap:8px;padding:7px 18px;border-radius:100px;border:1px solid rgba(212,168,67,.2);background:rgba(212,168,67,.06);font-size:10.5px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--gold);margin-bottom:24px;animation:fadeUp .6s ease both}
.ann-title{font-family:'Bebas Neue','Oswald',sans-serif;font-size:clamp(2.8rem,10vw,4.5rem);line-height:.88;letter-spacing:-1px;animation:fadeUp .6s ease .1s both}
.gold{background:linear-gradient(135deg,var(--gold-hi),var(--gold),var(--gold-lo));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.ann-sub{font-size:14px;font-weight:300;color:var(--txt2);margin-top:14px;line-height:1.6;animation:fadeUp .6s ease .2s both}

/* Milestone */
.milestone-card{
  display:flex;align-items:center;gap:16px;
  padding:18px 20px;border-radius:14px;
  border:1px solid rgba(74,222,128,.15);background:rgba(74,222,128,.04);
  margin-bottom:20px;animation:fadeUp .6s ease .25s both;
}
.milestone-icon{font-size:28px}
.milestone-count{font-family:'Oswald',sans-serif;font-size:32px;font-weight:700;color:var(--green);line-height:1}
.milestone-label{font-size:12px;color:var(--txt2);margin-top:2px;font-weight:500}

/* Pinned */
.pinned-banner{
  border-radius:14px;overflow:hidden;margin-bottom:16px;
  border:1px solid rgba(232,82,42,.2);
  background:linear-gradient(135deg,rgba(232,82,42,.06),rgba(212,168,67,.03));
  animation:fadeUp .6s ease .3s both;
}
.pinned-label{display:flex;align-items:center;gap:6px;padding:10px 16px;border-bottom:1px solid rgba(232,82,42,.1);font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--fire)}
.pinned-pin{font-size:12px}
.pinned-body{padding:16px}
.announce-type-badge{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.pinned-title{font-family:'Oswald',sans-serif;font-size:18px;font-weight:600;letter-spacing:.5px;color:var(--txt);margin-bottom:8px;line-height:1.3}
.pinned-text{font-size:13px;color:var(--txt2);line-height:1.7;margin-bottom:14px;white-space:pre-wrap}
.pinned-cta{
  display:inline-flex;padding:10px 24px;border-radius:10px;border:none;
  background:linear-gradient(135deg,var(--fire),#c23a1a);
  color:#fff;font-family:'Oswald',sans-serif;font-weight:600;
  font-size:12px;letter-spacing:1.5px;text-transform:uppercase;
  cursor:pointer;text-decoration:none;transition:transform .2s;
}
.pinned-cta:hover{transform:scale(1.03)}

/* Announcement cards */
.announce-card{
  border-radius:14px;border:1px solid var(--border);
  background:var(--card-bg);overflow:hidden;
  margin-bottom:14px;animation:fadeUp .5s ease both;
}
.announce-top{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--border)}
.announce-type{font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:4px 10px;border-radius:6px;display:inline-flex;align-items:center;gap:5px}
.type-launch{background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.15);color:var(--green)}
.type-promo{background:rgba(232,82,42,.08);border:1px solid rgba(232,82,42,.15);color:var(--fire)}
.type-milestone{background:rgba(212,168,67,.08);border:1px solid rgba(212,168,67,.15);color:var(--gold)}
.type-update{background:rgba(78,168,246,.08);border:1px solid rgba(78,168,246,.15);color:var(--blue)}
.type-schedule{background:rgba(168,85,247,.08);border:1px solid rgba(168,85,247,.15);color:var(--purple)}
.announce-date{font-size:11px;color:var(--txt3)}

.announce-body{padding:16px}
.announce-card-title{font-family:'Oswald',sans-serif;font-size:17px;font-weight:600;color:var(--txt);margin-bottom:8px;line-height:1.3}
.announce-text{font-size:13px;color:var(--txt2);line-height:1.7;white-space:pre-wrap}

.announce-footer{padding:12px 16px;border-top:1px solid var(--border)}
.announce-btn{
  padding:8px 20px;border-radius:8px;border:none;
  font-family:'Oswald',sans-serif;font-weight:600;
  font-size:11px;letter-spacing:1.5px;text-transform:uppercase;
  cursor:pointer;text-decoration:none;transition:all .2s;display:inline-flex;
}
.btn-primary{background:linear-gradient(135deg,var(--fire),#c23a1a);color:#fff}
.btn-primary:hover{transform:scale(1.03)}

/* Admin card actions */
.admin-card-actions,.admin-card-actions-bottom{display:flex;gap:8px;margin-top:12px}
.admin-card-actions-bottom{padding:10px 16px;border-top:1px solid var(--border)}
.aca-btn{padding:6px 14px;border-radius:6px;border:1px solid var(--border);background:var(--glass);color:var(--txt2);font-size:11px;font-weight:600;cursor:pointer;transition:all .2s;font-family:'DM Sans',sans-serif}
.aca-btn:hover{border-color:var(--gold);color:var(--gold)}
.aca-delete{border-color:rgba(239,68,68,.2);color:var(--red)}
.aca-delete:hover{background:rgba(239,68,68,.08)}

/* Empty state */
.empty-state{text-align:center;padding:48px 24px}
.empty-icon{font-size:40px;display:block;margin-bottom:16px}
.empty-state h3{font-family:'Oswald',sans-serif;font-size:20px;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px}
.empty-state p{font-size:13px;color:var(--txt2);line-height:1.6}

/* Loading */
.loading-state{text-align:center;padding:40px;color:var(--txt3);font-size:13px}
.loading-spinner{width:24px;height:24px;border:2px solid var(--border);border-top-color:var(--gold);border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 12px}
@keyframes spin{to{transform:rotate(360deg)}}

/* Admin Panel */
.admin-panel{margin-top:32px;border-top:1px solid var(--border);padding-top:20px}
.admin-toggle{
  width:100%;padding:14px;border-radius:12px;border:1px solid var(--border);
  background:var(--card-bg);color:var(--txt2);font-family:'Oswald',sans-serif;
  font-weight:600;font-size:13px;letter-spacing:2px;text-transform:uppercase;
  cursor:pointer;transition:all .2s;
}
.admin-toggle:hover{border-color:var(--gold);color:var(--gold)}
.admin-body{margin-top:14px;padding:20px;border-radius:14px;border:1px solid var(--border);background:var(--card-bg)}
.admin-field{margin-bottom:14px}
.admin-field label{display:block;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--txt2);margin-bottom:5px}
.admin-field input[type="text"],.admin-field input[type="password"]{
  width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);
  background:var(--glass);color:var(--txt);font-family:inherit;font-size:13px;
}
.admin-field input:focus,.admin-textarea:focus{outline:none;border-color:var(--gold)}
.admin-textarea{
  width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);
  background:var(--glass);color:var(--txt);font-family:inherit;font-size:13px;
  resize:vertical;line-height:1.6;
}

/* Type selector */
.type-selector{display:flex;flex-wrap:wrap;gap:6px}
.type-option{
  padding:8px 14px;border-radius:8px;border:1px solid var(--border);
  background:var(--glass);color:var(--txt3);font-size:12px;font-weight:600;
  cursor:pointer;transition:all .2s;font-family:'DM Sans',sans-serif;
}
.type-option:hover{border-color:var(--gold);color:var(--gold)}
.type-option.active{border-color:var(--gold);background:rgba(212,168,67,.1);color:var(--gold)}

.pin-label{display:flex;align-items:center;gap:8px;cursor:pointer}
.pin-label input[type="checkbox"]{width:16px;height:16px;accent-color:var(--gold)}

.admin-post-btn{
  width:100%;padding:14px;border-radius:10px;border:none;
  background:linear-gradient(135deg,var(--fire),#c23a1a);color:#fff;
  font-family:'Oswald',sans-serif;font-weight:600;font-size:14px;
  letter-spacing:2px;text-transform:uppercase;cursor:pointer;transition:transform .2s;
}
.admin-post-btn:hover{transform:scale(1.02)}
.admin-post-btn:disabled{opacity:.5;cursor:not-allowed;transform:none}

.admin-status{margin-top:10px;font-size:12px;text-align:center;color:#4ade80}
.admin-status.err{color:#ef4444}

@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.75)}}

@media(max-width:600px){
  .ann-hero{padding:36px 0 20px}
  .ann-title{font-size:clamp(2.4rem,10vw,3.5rem)}
  .milestone-count{font-size:26px}
  .type-selector{gap:4px}
  .type-option{padding:6px 10px;font-size:11px}
}
`;
