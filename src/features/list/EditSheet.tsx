import { useEffect, useReducer, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import clsx from 'clsx';
import { listCategoriesByFrequency } from '../../db/queries';
import { softDeleteTransaction, updateTransaction } from '../../db/mutations';
import { formatAmount, parseInputToCents } from '../../lib/money';
import { formatDayHeader, todayKey } from '../../lib/dates';
import { Icon, type IconName } from '../../ui/Icon';
import { KindSegmented } from '../../ui/Segmented';
import { DatePicker } from '../../ui/DatePicker';
import { Keypad } from '../record/Keypad';
import { keypadReducer, type KeypadState } from '../record/useKeypadReducer';
import type { TransactionRow } from '../../db/types';
import recordStyles from '../record/RecordScreen.module.css';
import styles from './EditSheet.module.css';

/** 编辑一笔账。复用记一笔的键盘和分类条，保证两处输入体验一致。 */
export function EditSheet({
  row,
  onClose,
  onDeleted,
}: {
  row: TransactionRow;
  onClose: () => void;
  onDeleted: (row: TransactionRow) => void;
}) {
  const [state, dispatch] = useReducer(keypadReducer, row, (r): KeypadState => ({
    input: formatAmount(r.amountCents),
    kind: r.kind,
    categoryId: r.categoryId,
    dateKey: r.dateKey,
    note: r.note,
  }));
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const noteRef = useRef<HTMLInputElement>(null);

  const categories = useLiveQuery(() => listCategoriesByFrequency(state.kind), [state.kind]);
  const cents = parseInputToCents(state.input);
  const canSubmit = cents > 0 && state.categoryId !== null;

  // 切换收支后原分类被清空，自动补选一个，避免保存键一直是禁用的
  useEffect(() => {
    if (state.categoryId === null && categories?.length) {
      dispatch({ type: 'setCategory', categoryId: categories[0].id });
    }
  }, [categories, state.categoryId]);

  const handleSave = async () => {
    if (!canSubmit || !state.categoryId) return;
    await updateTransaction(row.id, {
      kind: state.kind,
      amountCents: cents,
      categoryId: state.categoryId,
      dateKey: state.dateKey,
      note: state.note.trim(),
    });
    onClose();
  };

  const handleDelete = () => {
    void softDeleteTransaction(row.id);
    onDeleted(row);
    onClose();
  };

  const isToday = state.dateKey === todayKey();

  return createPortal(
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.sheet} role="dialog" aria-label="编辑账目">
        <div className={styles.header}>
          <button className={styles.headerBtn} onClick={onClose}>
            取消
          </button>
          <span className={styles.headerTitle}>编辑</span>
          <button className={clsx(styles.headerBtn, styles.deleteBtn)} onClick={handleDelete}>
            删除
          </button>
        </div>

        <div className={styles.body}>
          <div className={recordStyles.topBar}>
            <KindSegmented
              value={state.kind}
              onChange={(kind) => dispatch({ type: 'setKind', kind })}
            />
          </div>

          <div className={recordStyles.amountRow}>
            <span
              className={clsx(
                recordStyles.currency,
                state.kind === 'income' && recordStyles.amountIncome,
              )}
            >
              {state.kind === 'income' ? '+¥' : '¥'}
            </span>
            <span
              className={clsx(
                recordStyles.amount,
                cents === 0 && recordStyles.amountZero,
                state.kind === 'income' && recordStyles.amountIncome,
              )}
            >
              {state.input || '0'}
              <i className={recordStyles.caret} />
            </span>
          </div>

          <div className={recordStyles.categoryStrip}>
            {categories?.map((c) => (
              <button
                key={c.id}
                className={clsx(
                  recordStyles.chip,
                  state.categoryId === c.id && recordStyles.chipOn,
                )}
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
              {isToday ? '今天' : formatDayHeader(state.dateKey)}
            </button>
            <input
              ref={noteRef}
              className={recordStyles.noteInput}
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
            onSubmit={handleSave}
            kind={state.kind}
            submitLabel="保存"
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
