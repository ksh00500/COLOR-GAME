import { useEffect, useMemo, useState } from "react";
import {
  ApiError,
  adjustAdminUserChips,
  adminLogin,
  adminLogout,
  deleteAdminCoupon,
  fetchAdminAudit,
  fetchAdminCatalog,
  fetchAdminCoupons,
  fetchAdminMe,
  fetchAdminUsers,
  grantAdminUserCosmetic,
  hasAdminToken,
  saveAdminCoupon,
  setAdminUserSuspension,
  type AdminAuditEntry,
  type CouponRecord,
  type CouponReward,
  type CosmeticRarity,
  type ManagedUser,
} from "../api";

type AdminTab = "coupons" | "users" | "audit";
type CatalogOption = { id: string; nameKo: string; rarity: CosmeticRarity };
type CouponDraft = Omit<CouponRecord, "id" | "redemptionCount" | "createdAt" | "updatedAt">;

const emptyDraft = (): CouponDraft => ({
  code: "",
  name: "",
  description: "",
  rewards: [{ type: "color_chips", amount: 100 }],
  startsAt: null,
  expiresAt: null,
  maxRedemptions: null,
  active: true,
});

const dateTimeLocal = (value: string | null) =>
  value ? new Date(value).toISOString().slice(0, 16) : "";

const rewardLabel = (reward: CouponReward, catalog: CatalogOption[]) => {
  if (reward.type === "color_chips") return `컬러 칩 ${reward.amount}개`;
  if (reward.type === "palette_box_ticket") return `팔레트 상자 ${reward.amount}개`;
  if (reward.type === "fragments") return `${reward.rarity} 파편 ${reward.amount}개`;
  if (reward.type === "entitlement") return "영구 프리미엄";
  if (reward.type === "cosmetic") {
    return `스킨: ${catalog.find((item) => item.id === reward.cosmeticId)?.nameKo ?? reward.cosmeticId}`;
  }
  return `커스텀 랜덤: ${reward.cosmeticIds.length}종 중 ${reward.pickCount}개`;
};

function RewardEditor({
  reward,
  catalog,
  onChange,
  onRemove,
}: {
  reward: CouponReward;
  catalog: CatalogOption[];
  onChange: (next: CouponReward) => void;
  onRemove: () => void;
}) {
  const switchType = (type: CouponReward["type"]) => {
    if (type === "color_chips") onChange({ type, amount: 100 });
    else if (type === "palette_box_ticket") onChange({ type, amount: 1 });
    else if (type === "fragments") onChange({ type, rarity: "common", amount: 1 });
    else if (type === "cosmetic") onChange({ type, cosmeticId: catalog[0]?.id ?? "" });
    else if (type === "random_cosmetic") onChange({ type, cosmeticIds: [], pickCount: 1 });
    else onChange({ type, entitlement: "premium" });
  };

  return (
    <div className="admin-reward-row">
      <select value={reward.type} onChange={(event) => switchType(event.target.value as CouponReward["type"])}>
        <option value="color_chips">컬러 칩</option>
        <option value="palette_box_ticket">팔레트 상자</option>
        <option value="fragments">등급별 파편</option>
        <option value="cosmetic">지정 스킨</option>
        <option value="random_cosmetic">커스텀 랜덤 스킨</option>
        <option value="entitlement">영구 프리미엄</option>
      </select>
      {(reward.type === "color_chips" || reward.type === "palette_box_ticket") && (
        <input
          type="number"
          min={1}
          value={reward.amount}
          onChange={(event) => onChange({ ...reward, amount: Number(event.target.value) })}
          aria-label="지급 수량"
        />
      )}
      {reward.type === "fragments" && (
        <>
          <select
            value={reward.rarity}
            onChange={(event) => onChange({ ...reward, rarity: event.target.value as CosmeticRarity })}
          >
            <option value="common">일반</option>
            <option value="rare">희귀</option>
            <option value="epic">영웅</option>
            <option value="legendary">전설</option>
          </select>
          <input
            type="number"
            min={1}
            value={reward.amount}
            onChange={(event) => onChange({ ...reward, amount: Number(event.target.value) })}
          />
        </>
      )}
      {reward.type === "cosmetic" && (
        <select value={reward.cosmeticId} onChange={(event) => onChange({ ...reward, cosmeticId: event.target.value })}>
          <option value="">스킨 선택</option>
          {catalog.map((item) => (
            <option key={item.id} value={item.id}>[{item.rarity}] {item.nameKo}</option>
          ))}
        </select>
      )}
      {reward.type === "random_cosmetic" && (
        <div className="admin-random-cosmetic">
          <label>
            <span>지급 개수</span>
            <input
              type="number"
              min={1}
              max={Math.max(1, reward.cosmeticIds.length)}
              value={reward.pickCount}
              onChange={(event) => onChange({ ...reward, pickCount: Number(event.target.value) })}
            />
          </label>
          <div className="admin-candidate-list">
            {catalog.map((item) => (
              <label key={item.id}>
                <input
                  type="checkbox"
                  checked={reward.cosmeticIds.includes(item.id)}
                  onChange={(event) => {
                    const ids = event.target.checked
                      ? [...reward.cosmeticIds, item.id]
                      : reward.cosmeticIds.filter((id) => id !== item.id);
                    onChange({ ...reward, cosmeticIds: ids, pickCount: Math.min(reward.pickCount, Math.max(1, ids.length)) });
                  }}
                />
                <span>[{item.rarity}] {item.nameKo}</span>
              </label>
            ))}
          </div>
          <small>선택한 후보 중 서버가 무작위로 지급합니다. 이미 보유한 스킨은 같은 등급 파편 1개로 전환됩니다.</small>
        </div>
      )}
      <button className="admin-danger-text" type="button" onClick={onRemove}>보상 삭제</button>
    </div>
  );
}

export function AdminPage() {
  const [admin, setAdmin] = useState<{ email: string; displayName: string } | null>(null);
  const [login, setLogin] = useState({ email: "", password: "" });
  const [tab, setTab] = useState<AdminTab>("coupons");
  const [coupons, setCoupons] = useState<CouponRecord[]>([]);
  const [catalog, setCatalog] = useState<CatalogOption[]>([]);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [audit, setAudit] = useState<AdminAuditEntry[]>([]);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CouponDraft>(emptyDraft);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [chipDelta, setChipDelta] = useState(0);
  const [actionReason, setActionReason] = useState("");
  const [grantCosmeticId, setGrantCosmeticId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [selectedUserId, users],
  );

  const loadAll = async () => {
    const [couponData, catalogData, userData, auditData] = await Promise.all([
      fetchAdminCoupons(),
      fetchAdminCatalog(),
      fetchAdminUsers(),
      fetchAdminAudit(),
    ]);
    setCoupons(couponData);
    setCatalog(catalogData);
    setUsers(userData);
    setAudit(auditData);
    if (!grantCosmeticId && catalogData[0]) setGrantCosmeticId(catalogData[0].id);
  };

  useEffect(() => {
    if (!hasAdminToken()) return;
    void fetchAdminMe()
      .then((value) => {
        setAdmin(value);
        return loadAll();
      })
      .catch(() => setAdmin(null));
  }, []);

  const submitLogin = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const next = await adminLogin(login.email, login.password);
      setAdmin(next);
      setLogin({ email: "", password: "" });
      await loadAll();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.code : "관리자 로그인에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const editCoupon = (coupon: CouponRecord) => {
    setEditingId(coupon.id);
    setDraft({
      code: coupon.code,
      name: coupon.name,
      description: coupon.description,
      rewards: coupon.rewards,
      startsAt: coupon.startsAt,
      expiresAt: coupon.expiresAt,
      maxRedemptions: coupon.maxRedemptions,
      active: coupon.active,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitCoupon = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await saveAdminCoupon(draft, editingId ?? undefined);
      setDraft(emptyDraft());
      setEditingId(null);
      setCoupons(await fetchAdminCoupons());
      setAudit(await fetchAdminAudit());
      setMessage("쿠폰을 저장했습니다.");
    } catch (error) {
      setMessage(error instanceof ApiError ? error.code : "쿠폰을 저장하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const refreshUsers = async () => {
    const next = await fetchAdminUsers(query);
    setUsers(next);
    if (selectedUserId && !next.some((user) => user.id === selectedUserId)) setSelectedUserId(null);
  };

  if (admin === null) {
    return (
      <main className="admin-shell admin-login-shell">
        <div className="admin-mobile-notice">관리자 페이지는 데스크톱에서 이용해 주세요.</div>
        <section className="admin-login-card">
          <p className="eyebrow">TANGO CONTROL</p>
          <h1>관리자 로그인</h1>
          <p>일반 Tango 계정과 분리된 관리자 계정만 사용할 수 있습니다.</p>
          <form onSubmit={(event) => { event.preventDefault(); void submitLogin(); }}>
            <label>이메일<input type="email" value={login.email} onChange={(event) => setLogin({ ...login, email: event.target.value })} /></label>
            <label>비밀번호<input type="password" value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} /></label>
            <button type="submit" disabled={busy}>로그인</button>
          </form>
          {message && <p className="admin-message">{message}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <div className="admin-mobile-notice">관리자 페이지는 데스크톱에서 이용해 주세요.</div>
      <header className="admin-header">
        <div><p className="eyebrow">TANGO CONTROL</p><h1>운영 관리</h1></div>
        <span>{admin.email}</span>
        <button type="button" onClick={() => { adminLogout(); setAdmin(null); }}>로그아웃</button>
      </header>
      <nav className="admin-tabs">
        {(["coupons", "users", "audit"] as const).map((item) => (
          <button className={tab === item ? "active" : ""} key={item} onClick={() => setTab(item)}>
            {item === "coupons" ? "쿠폰" : item === "users" ? "유저" : "감사 로그"}
          </button>
        ))}
      </nav>

      {message && <p className="admin-message">{message}</p>}

      {tab === "coupons" && (
        <div className="admin-two-column">
          <section className="admin-panel">
            <h2>{editingId ? "쿠폰 수정" : "새 쿠폰"}</h2>
            <div className="admin-form-grid">
              <label>쿠폰 코드<input value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value.toUpperCase() })} /></label>
              <label>표시 이름<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
              <label className="wide">설명<textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
              <label>시작 시각<input type="datetime-local" value={dateTimeLocal(draft.startsAt)} onChange={(event) => setDraft({ ...draft, startsAt: event.target.value ? new Date(event.target.value).toISOString() : null })} /></label>
              <label>만료 시각<input type="datetime-local" value={dateTimeLocal(draft.expiresAt)} onChange={(event) => setDraft({ ...draft, expiresAt: event.target.value ? new Date(event.target.value).toISOString() : null })} /></label>
              <label>전체 수령 한도<input type="number" min={1} placeholder="무제한" value={draft.maxRedemptions ?? ""} onChange={(event) => setDraft({ ...draft, maxRedemptions: event.target.value ? Number(event.target.value) : null })} /></label>
              <label className="admin-check"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} />활성화</label>
            </div>
            <div className="admin-rewards">
              <div className="admin-section-title"><h3>보상 구성</h3><button type="button" onClick={() => setDraft({ ...draft, rewards: [...draft.rewards, { type: "color_chips", amount: 100 }] })}>보상 추가</button></div>
              {draft.rewards.map((reward, index) => (
                <RewardEditor
                  key={`${index}-${reward.type}`}
                  reward={reward}
                  catalog={catalog}
                  onChange={(next) => setDraft({ ...draft, rewards: draft.rewards.map((item, itemIndex) => itemIndex === index ? next : item) })}
                  onRemove={() => setDraft({ ...draft, rewards: draft.rewards.filter((_, itemIndex) => itemIndex !== index) })}
                />
              ))}
            </div>
            <div className="admin-actions">
              {editingId && <button type="button" onClick={() => { setEditingId(null); setDraft(emptyDraft()); }}>취소</button>}
              <button className="primary-action" type="button" disabled={busy || !draft.code || !draft.name || draft.rewards.length === 0} onClick={() => void submitCoupon()}>저장</button>
            </div>
          </section>
          <section className="admin-panel">
            <h2>쿠폰 목록</h2>
            <div className="admin-coupon-list">
              {coupons.map((coupon) => (
                <article key={coupon.id}>
                  <div><strong>{coupon.code}</strong><span className={coupon.active ? "status-on" : "status-off"}>{coupon.active ? "활성" : "중지"}</span></div>
                  <h3>{coupon.name}</h3>
                  <p>{coupon.rewards.map((reward) => rewardLabel(reward, catalog)).join(" · ")}</p>
                  <small>수령 {coupon.redemptionCount}{coupon.maxRedemptions ? ` / ${coupon.maxRedemptions}` : ""}명</small>
                  <div className="admin-actions">
                    <button type="button" onClick={() => editCoupon(coupon)}>수정</button>
                    <button className="admin-danger-text" type="button" onClick={() => {
                      if (!window.confirm(`${coupon.code} 쿠폰을 삭제할까요?`)) return;
                      void deleteAdminCoupon(coupon.id).then(async () => {
                        setCoupons(await fetchAdminCoupons());
                        setAudit(await fetchAdminAudit());
                      });
                    }}>삭제</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

      {tab === "users" && (
        <div className="admin-two-column admin-users-layout">
          <section className="admin-panel">
            <form className="admin-search" onSubmit={(event) => { event.preventDefault(); void refreshUsers(); }}>
              <input placeholder="이메일 또는 닉네임" value={query} onChange={(event) => setQuery(event.target.value)} />
              <button type="submit">검색</button>
            </form>
            <div className="admin-user-list">
              {users.map((user) => (
                <button className={user.id === selectedUserId ? "active" : ""} key={user.id} onClick={() => setSelectedUserId(user.id)}>
                  <span><strong>{user.displayName}</strong><small>{user.email}</small></span>
                  <b>{user.colorChips} ◆</b>
                </button>
              ))}
            </div>
          </section>
          <section className="admin-panel">
            {selectedUser === null ? <p>관리할 유저를 선택하세요.</p> : (
              <>
                <div className="admin-user-summary">
                  <div><h2>{selectedUser.displayName}</h2><p>{selectedUser.email}</p></div>
                  <span className={selectedUser.suspendedAt ? "status-off" : "status-on"}>{selectedUser.suspendedAt ? "정지" : "정상"}</span>
                </div>
                <dl className="admin-user-stats">
                  <div><dt>레이팅</dt><dd>{selectedUser.rating}</dd></div>
                  <div><dt>전적</dt><dd>{selectedUser.rankedWins}승 {selectedUser.rankedLosses}패 {selectedUser.rankedDraws}무</dd></div>
                  <div><dt>컬러 칩</dt><dd>{selectedUser.colorChips}</dd></div>
                  <div><dt>상자 이용권</dt><dd>{selectedUser.boxTickets}</dd></div>
                  <div><dt>보유 스킨</dt><dd>{selectedUser.cosmeticCount}</dd></div>
                </dl>
                <label>작업 사유<input value={actionReason} onChange={(event) => setActionReason(event.target.value)} placeholder="감사 로그에 기록됩니다" /></label>
                <div className="admin-user-action">
                  <input type="number" value={chipDelta} onChange={(event) => setChipDelta(Number(event.target.value))} />
                  <button type="button" disabled={!actionReason || chipDelta === 0} onClick={() => void adjustAdminUserChips(selectedUser.id, chipDelta, actionReason).then((user) => {
                    setUsers(users.map((item) => item.id === user.id ? user : item));
                    setChipDelta(0);
                    setMessage("칩 잔액을 변경했습니다.");
                  })}>칩 증감</button>
                </div>
                <div className="admin-user-action">
                  <select value={grantCosmeticId} onChange={(event) => setGrantCosmeticId(event.target.value)}>
                    {catalog.map((item) => <option key={item.id} value={item.id}>[{item.rarity}] {item.nameKo}</option>)}
                  </select>
                  <button type="button" disabled={!actionReason || !grantCosmeticId} onClick={() => void grantAdminUserCosmetic(selectedUser.id, grantCosmeticId, actionReason).then((granted) => {
                    setMessage(granted ? "스킨을 지급했습니다." : "이미 보유한 스킨입니다.");
                    void refreshUsers();
                  })}>스킨 지급</button>
                </div>
                <button className={selectedUser.suspendedAt ? "primary-action" : "danger-action"} type="button" disabled={!actionReason} onClick={() => void setAdminUserSuspension(selectedUser.id, !selectedUser.suspendedAt, actionReason).then(async () => {
                  await refreshUsers();
                  setAudit(await fetchAdminAudit());
                })}>{selectedUser.suspendedAt ? "정지 해제" : "계정 정지"}</button>
              </>
            )}
          </section>
        </div>
      )}

      {tab === "audit" && (
        <section className="admin-panel">
          <h2>관리자 작업 기록</h2>
          <div className="admin-audit-list">
            {audit.map((entry) => (
              <article key={entry.id}>
                <time>{new Date(entry.createdAt).toLocaleString("ko-KR")}</time>
                <strong>{entry.action}</strong>
                <span>{entry.adminEmail ?? "삭제된 관리자"} → {entry.targetType}:{entry.targetId ?? "-"}</span>
                <code>{JSON.stringify(entry.details)}</code>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
