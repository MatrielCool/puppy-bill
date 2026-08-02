import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import clsx from 'clsx';
import { getSummary, listCategoriesByFrequency } from '../../db/queries';
import { addTransaction, softDeleteTransaction, restoreTransaction } from '../../db/mutations';
import { formatCNY, formatCNYGrouped, parseInputToCents } from '../../lib/money';
import { formatDayHeader, todayKey } from '../../lib/dates';
import { Icon, type IconName } from '../../ui/Icon';
import { KindSegmented } from '../../ui/Segmented';
import { DatePicker } from '../../ui/DatePicker';
import type { ToastData } from '../../ui/Toast';
import { useKeypad } from './useKeypadReducer';
import { Keypad } from './Keypad';
import { SuccessBurst } from './SuccessBurst';
import styles from './RecordScreen.module.css';

const DRAFT_KEY = 'puppy-bill:draft';

export function RecordScreen({ onToast }: { onToast: (toast: ToastData) => void }) {
  const [state, dispatch] = useKeypad();
  const [burstKey, setBurstKey] = useState(0);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const noteRef = useRef<HTMLInputElement>(null);

  const categories = useLiveQuery(() => listCategoriesByFrequency(state.kind), [state.kind]);
  const summary = useLiveQuery(() => getSummary(), []);

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

      <div className={styles.topBar}>
        <KindSegmented value={state.kind} onChange={(kind) => dispatch({ type: 'setKind', kind })} />
      </div>

      <div className={styles.summary}>
        <span>今日</span>
        <span className={styles.summaryToday}>{formatCNY(summary?.todayCents ?? 0)}</span>
        <span className={styles.summaryDot}>·</span>
        <span>本月 {formatCNYGrouped(summary?.monthExpenseCents ?? 0)}</span>
      </div>

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
