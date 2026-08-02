import { useReducer, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { clearBudget, RECURRING, setBudget } from '../../db/budgets';
import { formatAmount, parseInputToCents } from '../../lib/money';
import { Keypad } from '../record/Keypad';
import { keypadReducer, type KeypadState } from '../record/useKeypadReducer';
import recordStyles from '../record/RecordScreen.module.css';
import sheetStyles from '../list/EditSheet.module.css';
import styles from './BudgetSheet.module.css';

/** 设置预算。复用记一笔的键盘。 */
export function BudgetSheet({
  monthKey,
  categoryId,
  categoryName,
  currentCents,
  onClose,
}: {
  monthKey: string;
  categoryId: string | null;
  categoryName: string;
  currentCents: number | null;
  onClose: () => void;
}) {
  const [state, dispatch] = useReducer(
    keypadReducer,
    currentCents,
    (cents): KeypadState => ({
      input: cents === null || cents === 0 ? '' : formatAmount(cents),
      kind: 'expense',
      categoryId: null,
      dateKey: '',
      note: '',
    }),
  );
  const [recurring, setRecurring] = useState(true);

  const cents = parseInputToCents(state.input);

  const handleSave = async () => {
    if (cents <= 0) return;
    await setBudget(recurring ? RECURRING : monthKey, categoryId, cents);
    // 设了"每月沿用"就清掉本月的一次性覆盖，否则它会盖住新的默认值
    if (recurring) await clearBudget(monthKey, categoryId);
    onClose();
  };

  const handleClear = async () => {
    await Promise.all([clearBudget(monthKey, categoryId), clearBudget(RECURRING, categoryId)]);
    onClose();
  };

  return createPortal(
    <>
      <div className={sheetStyles.backdrop} onClick={onClose} />
      <div className={sheetStyles.sheet} role="dialog" aria-label="设置预算">
        <div className={sheetStyles.header}>
          <button className={sheetStyles.headerBtn} onClick={onClose}>
            取消
          </button>
          <span className={sheetStyles.headerTitle}>{categoryName}预算</span>
          <button
            className={clsx(sheetStyles.headerBtn, currentCents === null && styles.hidden)}
            onClick={handleClear}
          >
            取消预算
          </button>
        </div>

        <div className={sheetStyles.body}>
          <div className={recordStyles.amountRow}>
            <span className={recordStyles.currency}>¥</span>
            <span className={clsx(recordStyles.amount, cents === 0 && recordStyles.amountZero)}>
              {state.input || '0'}
              <i className={recordStyles.caret} />
            </span>
          </div>

          <div className={styles.optionRow}>
            <button
              className={clsx(styles.option, recurring && styles.optionOn)}
              onClick={() => setRecurring(true)}
            >
              每月沿用
            </button>
            <button
              className={clsx(styles.option, !recurring && styles.optionOn)}
              onClick={() => setRecurring(false)}
            >
              只用于本月
            </button>
          </div>
          <p className={styles.hint}>
            {recurring
              ? '之后每个月都用这个预算，不用重复设置。'
              : '只对当前月份生效，其他月份不受影响。'}
          </p>

          <Keypad
            dispatch={dispatch}
            canSubmit={cents > 0}
            onSubmit={handleSave}
            kind="expense"
            submitLabel="保存"
          />
        </div>
      </div>
    </>,
    document.body,
  );
}
