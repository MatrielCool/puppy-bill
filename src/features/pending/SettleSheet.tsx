import { useReducer, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import clsx from 'clsx';
import { listCategoriesByFrequency } from '../../db/queries';
import { PART_LABEL, partCents, settlePart } from '../../db/receivables';
import { formatAmount, formatCNYGrouped, parseInputToCents } from '../../lib/money';
import { formatDayHeader, todayKey } from '../../lib/dates';
import { Icon, type IconName } from '../../ui/Icon';
import { DatePicker } from '../../ui/DatePicker';
import { Keypad } from '../record/Keypad';
import { keypadReducer, type KeypadState } from '../record/useKeypadReducer';
import type { ReceivablePart, ReceivableRow } from '../../db/types';
import recordStyles from '../record/RecordScreen.module.css';
import sheetStyles from '../list/EditSheet.module.css';
import styles from './PendingScreen.module.css';

/** 项目款到账默认记成「工资」，需要时在分类条上改 */
const DEFAULT_INCOME_CATEGORY = 'c_salary';

/**
 * 标记某一部分到账 —— 这个功能的关键连接点。
 *
 * 钱到账后不该再去「记一笔」手工录一遍，所以这里直接把它写成当月的一笔收入。
 * 界面几乎就是记一笔页：同一个键盘、同一条分类横滑、同一个日期药丸，
 * 差别只是收支方向锁死在「收入」，且金额预填成应收额。
 */
export function SettleSheet({
  row,
  part,
  onClose,
  onSettled,
}: {
  row: ReceivableRow;
  part: ReceivablePart;
  onClose: () => void;
  onSettled: (amountCents: number, dateKey: string) => void;
}) {
  const expectedCents = partCents(row, part);

  const [state, dispatch] = useReducer(
    keypadReducer,
    null,
    (): KeypadState => ({
      input: formatAmount(expectedCents),
      kind: 'income',
      categoryId: DEFAULT_INCOME_CATEGORY,
      dateKey: todayKey(),
      note: `「${row.title}」${PART_LABEL[part]}`,
    }),
  );
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const noteRef = useRef<HTMLInputElement>(null);

  const categories = useLiveQuery(() => listCategoriesByFrequency('income'), []);
  const cents = parseInputToCents(state.input);
  const canSubmit = cents > 0 && state.categoryId !== null && !saving;

  const handleSubmit = async () => {
    if (!canSubmit || !state.categoryId) return;
    // 双击「记入收入」会写两笔收入，所以先上锁再落库
    setSaving(true);
    try {
      await settlePart(row.id, part, {
        amountCents: cents,
        categoryId: state.categoryId,
        dateKey: state.dateKey,
        note: state.note.trim() || undefined,
      });
      onSettled(cents, state.dateKey);
      onClose();
    } catch {
      setSaving(false);
    }
  };

  const isToday = state.dateKey === todayKey();

  return createPortal(
    <>
      <div className={sheetStyles.backdrop} onClick={onClose} />
      <div className={sheetStyles.sheet} role="dialog" aria-label={`${PART_LABEL[part]}到账`}>
        <div className={sheetStyles.header}>
          <button className={sheetStyles.headerBtn} onClick={onClose}>
            取消
          </button>
          <span className={sheetStyles.headerTitle}>
            {row.title} · {PART_LABEL[part]}
          </span>
          {/* 右侧留空占位，保证标题真正居中 */}
          <span className={sheetStyles.headerBtn} />
        </div>

        <div className={sheetStyles.body}>
          <div className={recordStyles.amountRow}>
            <span className={clsx(recordStyles.currency, recordStyles.amountIncome)}>+¥</span>
            <span
              className={clsx(
                recordStyles.amount,
                recordStyles.amountIncome,
                cents === 0 && recordStyles.amountZero,
              )}
            >
              {state.input || '0'}
              <i className={recordStyles.caret} />
            </span>
          </div>

          {/* 客户少付/多付是真实存在的，所以金额可改 —— 但要把差额说清楚 */}
          <div className={styles.settleHint}>
            {cents === expectedCents
              ? `应收 ${formatCNYGrouped(expectedCents)}`
              : `应收 ${formatCNYGrouped(expectedCents)}，实收差 ${formatCNYGrouped(cents - expectedCents)}`}
          </div>

          <div className={recordStyles.categoryStrip}>
            {categories?.map((c) => (
              <button
                key={c.id}
                className={clsx(recordStyles.chip, state.categoryId === c.id && recordStyles.chipOn)}
                onClick={() => dispatch({ type: 'setCategory', categoryId: c.id })}
              >
                <Icon name={c.icon as IconName} size={32} className={recordStyles.chipIcon} />
                <span className={recordStyles.chipName}>{c.name}</span>
              </button>
            ))}
          </div>

          <div className={recordStyles.metaRow}>
            <button
              className={clsx(recordStyles.datePill, !isToday && recordStyles.pillOn)}
              onClick={() => setDatePickerOpen(true)}
            >
              <Icon name="calendar" size={19} />
              {isToday ? '今天到账' : formatDayHeader(state.dateKey)}
            </button>
            <input
              ref={noteRef}
              className={recordStyles.noteInput}
              placeholder="备注"
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
            kind="income"
            submitLabel="记入收入"
          />
        </div>
      </div>

      {datePickerOpen && (
        <DatePicker
          value={state.dateKey}
          onPick={(dateKey) => dispatch({ type: 'setDate', dateKey })}
          onClose={() => setDatePickerOpen(false)}
        />
      )}
    </>,
    document.body,
  );
}
