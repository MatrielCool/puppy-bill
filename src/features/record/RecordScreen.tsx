import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import clsx from 'clsx';
import { getSummary, listCategoriesByFrequency } from '../../db/queries';
import { addTransaction, softDeleteTransaction, restoreTransaction } from '../../db/mutations';
import { formatCNY, formatCNYGrouped, parseInputToCents } from '../../lib/money';
import { dateKeyOffset, formatDayHeader, todayKey } from '../../lib/dates';
import type { ToastData } from '../../ui/Toast';
import { useKeypad } from './useKeypadReducer';
import { SuccessBurst } from './SuccessBurst';
import styles from './RecordScreen.module.css';

const DRAFT_KEY = 'puppy-bill:draft';

export function RecordScreen({ onToast }: { onToast: (toast: ToastData) => void }) {
  const [state, dispatch] = useKeypad();
  const [burstKey, setBurstKey] = useState(0);
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
      // 隔天的草稿没有意义，丢弃
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
      text: `已记 ${category?.emoji ?? ''}${category?.name ?? ''} ${formatCNY(cents)}`,
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

  const dateLabel =
    state.dateKey === todayKey()
      ? '今天'
      : state.dateKey === dateKeyOffset(-1)
        ? '昨天'
        : formatDayHeader(state.dateKey);

  return (
    <div className={styles.screen}>
      {burstKey > 0 && <SuccessBurst key={burstKey} />}

      <div className={styles.summary}>
        <span>今日</span>
        <span className={styles.summaryToday}>{formatCNY(summary?.todayCents ?? 0)}</span>
        <span className={styles.summaryDot}>·</span>
        <span>本月 {formatCNYGrouped(summary?.monthExpenseCents ?? 0)}</span>
      </div>

      <div className={styles.amountRow}>
        <span className={styles.currency}>{state.kind === 'income' ? '+¥' : '¥'}</span>
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
            <span className={styles.chipEmoji}>{c.emoji}</span>
            <span className={styles.chipName}>{c.name}</span>
          </button>
        ))}
      </div>

      <div className={styles.metaRow}>
        <button
          className={clsx(styles.pill, state.dateKey !== todayKey() && styles.pillOn)}
          onClick={() =>
            dispatch({
              type: 'setDate',
              dateKey: state.dateKey === todayKey() ? dateKeyOffset(-1) : todayKey(),
            })
          }
        >
          {dateLabel}
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

      <div className={styles.keypad}>
        {['1', '2', '3'].map((d) => (
          <Key key={d} label={d} onPress={() => dispatch({ type: 'digit', value: d })} />
        ))}
        <button
          className={clsx(styles.key, styles.keyFn)}
          onClick={() => dispatch({ type: 'backspace' })}
          aria-label="退格"
        >
          ⌫
        </button>

        {['4', '5', '6'].map((d) => (
          <Key key={d} label={d} onPress={() => dispatch({ type: 'digit', value: d })} />
        ))}
        <button
          className={clsx(
            styles.key,
            styles.kindKey,
            state.kind === 'income' ? styles.kindIncome : styles.kindExpense,
          )}
          onClick={() =>
            dispatch({ type: 'setKind', kind: state.kind === 'expense' ? 'income' : 'expense' })
          }
        >
          {state.kind === 'expense' ? '支出' : '收入'}
        </button>

        {['7', '8', '9'].map((d) => (
          <Key key={d} label={d} onPress={() => dispatch({ type: 'digit', value: d })} />
        ))}
        <button
          className={clsx(styles.key, styles.keyDone)}
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          完成
        </button>

        <Key label="." onPress={() => dispatch({ type: 'dot' })} />
        <Key label="0" onPress={() => dispatch({ type: 'digit', value: '0' })} />
        <Key label="00" onPress={() => dispatch({ type: 'digit', value: '0' })} double />
      </div>
    </div>
  );
}

function Key({
  label,
  onPress,
  double = false,
}: {
  label: string;
  onPress: () => void;
  double?: boolean;
}) {
  return (
    <button
      className={styles.key}
      onClick={() => {
        onPress();
        // "00" 键按两次 0
        if (double) onPress();
      }}
    >
      {label}
    </button>
  );
}
