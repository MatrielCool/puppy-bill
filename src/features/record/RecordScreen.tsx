import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import clsx from 'clsx';
import { getSummary, listCategoriesByFrequency } from '../../db/queries';
import { addTransaction, softDeleteTransaction, restoreTransaction } from '../../db/mutations';
import { getDueSummary } from '../../db/receivables';
import { formatCNY, formatCNYGrouped, parseInputToCents } from '../../lib/money';
import { formatDayHeader, todayKey } from '../../lib/dates';
import { navigate } from '../../lib/router';
import { getSetting, setSetting, SETTING_PENDING_MUTED_ON } from '../../lib/settings';
import { Icon, type IconName } from '../../ui/Icon';
import { KindSegmented } from '../../ui/Segmented';
import { DatePicker } from '../../ui/DatePicker';
import type { ToastData } from '../../ui/Toast';
import { useKeypad } from './useKeypadReducer';
import { Keypad } from './Keypad';
import { SuccessBurst } from './SuccessBurst';
import styles from './RecordScreen.module.css';
import { PageHeading } from '../../ui/PageHeading';

const DRAFT_KEY = 'puppy-bill:draft';

export function RecordScreen({ onToast }: { onToast: (toast: ToastData) => void }) {
  const [state, dispatch] = useKeypad();
  const [burstKey, setBurstKey] = useState(0);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const noteRef = useRef<HTMLInputElement>(null);

  const categories = useLiveQuery(() => listCategoriesByFrequency(state.kind), [state.kind]);
  const summary = useLiveQuery(() => getSummary(), []);

  // 催款提醒只能长在这里：iOS 的 PWA 弹不了定时通知，而这一页是每天必开的。
  const due = useLiveQuery(getDueSummary, [], { count: 0, cents: 0 });
  const mutedOn = useLiveQuery(() => getSetting(SETTING_PENDING_MUTED_ON, ''), [], '');
  const showDueBanner = due.count > 0 && mutedOn !== todayKey();

  const cents = parseInputToCents(state.input);
  const canSubmit = cents > 0 && state.categoryId !== null;

  // 草稿持久化：iOS 会在后台回收 PWA 的内存，半截金额不该因此丢失
  useEffect(() => {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw);
      if (draft?.dateKey === todayKey() && typeof draft.input === 'string') {
        dispatch({ type: 'hydrate', state: draft });
      }
    } catch {
      localStorage.removeItem(DRAFT_KEY);
    }
  }, [dispatch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (state.input) localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
      else localStorage.removeItem(DRAFT_KEY);
    }, 200);
    return () => clearTimeout(timer);
  }, [state]);

  // 分类列表加载后自动选中最常用的那个，省掉一次点击
  useEffect(() => {
    if (state.categoryId === null && categories?.length) {
      dispatch({ type: 'setCategory', categoryId: categories[0].id });
    }
  }, [categories, state.categoryId, dispatch]);

  const handleSubmit = async () => {
    if (!canSubmit || !state.categoryId) return;

    const category = categories?.find((c) => c.id === state.categoryId);
    const id = await addTransaction({
      kind: state.kind,
      amountCents: cents,
      categoryId: state.categoryId,
      dateKey: state.dateKey,
      note: state.note.trim(),
    });

    // 先重置再播动画 —— 键盘立刻可用，能接着记下一笔
    dispatch({ type: 'reset' });
    localStorage.removeItem(DRAFT_KEY);
    noteRef.current?.blur();
    setBurstKey((k) => k + 1);

    onToast({
      id: Date.now(),
      text: `已记 ${category?.name ?? ''} ${formatCNY(cents)}`,
      actionLabel: '撤销',
      onAction: () => {
        void softDeleteTransaction(id);
        onToast({
          id: Date.now(),
          text: '已撤销',
          actionLabel: '恢复',
          onAction: () => void restoreTransaction(id),
        });
      },
    });
  };

  const isToday = state.dateKey === todayKey();

  return (
    <div className={styles.screen}>
      {burstKey > 0 && <SuccessBurst key={burstKey} />}

      <div className={styles.heading}><PageHeading title="记下这一笔" eyebrow="A LITTLE EVERY DAY" /></div>

      <div className={styles.topBar}>
        <KindSegmented value={state.kind} onChange={(kind) => dispatch({ type: 'setKind', kind })} />
      </div>

      <div className={styles.summary}>
        <span>今日</span>
        <span className={styles.summaryToday}>{formatCNY(summary?.todayCents ?? 0)}</span>
        <span className={styles.summaryDot}>·</span>
        <span>本月 {formatCNYGrouped(summary?.monthExpenseCents ?? 0)}</span>
      </div>

      {showDueBanner && (
        <div className={styles.dueBanner}>
          <button className={styles.dueBannerMain} onClick={() => navigate('/pending')}>
            <Icon name="pending" size={18} />
            有 {due.count} 笔款该催了 · 共 {formatCNYGrouped(due.cents)}
          </button>
          <button
            className={styles.dueBannerClose}
            aria-label="今天不再提醒"
            onClick={() => void setSetting(SETTING_PENDING_MUTED_ON, todayKey())}
          >
            <Icon name="close" size={15} />
          </button>
        </div>
      )}

      <div className={styles.amountRow}>
        <span className={clsx(styles.currency, state.kind === 'income' && styles.amountIncome)}>
          {state.kind === 'income' ? '+¥' : '¥'}
        </span>
        <span
          className={clsx(
            styles.amount,
            cents === 0 && styles.amountZero,
            state.kind === 'income' && styles.amountIncome,
          )}
        >
          {state.input || '0'}
          <i className={styles.caret} />
        </span>
      </div>

      <div className={styles.categoryStrip}>
        {categories?.map((c) => (
          <button
            key={c.id}
            className={clsx(styles.chip, state.categoryId === c.id && styles.chipOn)}
            onClick={() => dispatch({ type: 'setCategory', categoryId: c.id })}
            aria-pressed={state.categoryId === c.id}
          >
            <Icon name={c.icon as IconName} size={32} className={styles.chipIcon} />
            <span className={styles.chipName}>{c.name}</span>
          </button>
        ))}
      </div>

      <div className={styles.metaRow}>
        <button
          className={clsx(styles.datePill, !isToday && styles.pillOn)}
          onClick={() => setDatePickerOpen(true)}
        >
          <Icon name="calendar" size={19} />
          {isToday ? '今天' : formatDayHeader(state.dateKey)}
        </button>
        <input
          ref={noteRef}
          className={styles.noteInput}
          placeholder="备注（可不填）"
          aria-label="备注"
          value={state.note}
          onChange={(e) => dispatch({ type: 'setNote', note: e.target.value })}
          enterKeyHint="done"
          onKeyDown={(e) => e.key === 'Enter' && noteRef.current?.blur()}
        />
      </div>

      <Keypad
        dispatch={dispatch}
        canSubmit={canSubmit}
        onSubmit={handleSubmit}
        kind={state.kind}
      />

      {datePickerOpen && (
        <DatePicker
          value={state.dateKey}
          onPick={(dateKey) => dispatch({ type: 'setDate', dateKey })}
          onClose={() => setDatePickerOpen(false)}
        />
      )}
    </div>
  );
}
