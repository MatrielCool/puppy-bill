import clsx from 'clsx';
import type { TxKind } from '../db/types';
import styles from './Segmented.module.css';

export function KindSegmented({
  value,
  onChange,
}: {
  value: TxKind;
  onChange: (kind: TxKind) => void;
}) {
  const isIncome = value === 'income';
  return (
    <div className={styles.wrap} role="tablist">
      <span
        className={clsx(styles.thumb, isIncome && styles.thumbRight, isIncome && styles.thumbIncome)}
      />
      <button
        role="tab"
        aria-selected={!isIncome}
        className={clsx(styles.option, !isIncome && styles.optionOn)}
        onClick={() => onChange('expense')}
      >
        支出
      </button>
      <button
        role="tab"
        aria-selected={isIncome}
        className={clsx(styles.option, isIncome && styles.optionOnIncome)}
        onClick={() => onChange('income')}
      >
        收入
      </button>
    </div>
  );
}
