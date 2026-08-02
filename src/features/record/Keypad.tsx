import clsx from 'clsx';
import { Icon } from '../../ui/Icon';
import type { KeypadAction } from './useKeypadReducer';
import type { TxKind } from '../../db/types';
import styles from './RecordScreen.module.css';

/**
 * 数字键盘。记一笔和编辑账目共用同一个组件 —— 两处的输入体验必须完全一致，
 * 复制一份迟早会改歪其中一个。
 */
export function Keypad({
  dispatch,
  canSubmit,
  onSubmit,
  kind,
  submitLabel = '完成',
}: {
  dispatch: (action: KeypadAction) => void;
  canSubmit: boolean;
  onSubmit: () => void;
  kind: TxKind;
  submitLabel?: string;
}) {
  return (
    <div className={styles.keypad}>
      {['1', '2', '3'].map((d) => (
        <Key key={d} label={d} onPress={() => dispatch({ type: 'digit', value: d })} />
      ))}
      <button
        className={clsx(styles.key, styles.keyFn)}
        onClick={() => dispatch({ type: 'backspace' })}
        aria-label="退格"
      >
        <Icon name="backspace" size={28} />
      </button>

      {['4', '5', '6'].map((d) => (
        <Key key={d} label={d} onPress={() => dispatch({ type: 'digit', value: d })} />
      ))}
      {/* 收支切换移到顶部后，完成键得以跨三行，成为最容易按到的目标 */}
      <button
        className={clsx(styles.key, styles.keyDone, kind === 'income' && styles.keyDoneIncome)}
        disabled={!canSubmit}
        onClick={onSubmit}
      >
        {submitLabel}
      </button>

      {['7', '8', '9'].map((d) => (
        <Key key={d} label={d} onPress={() => dispatch({ type: 'digit', value: d })} />
      ))}

      <Key label="." onPress={() => dispatch({ type: 'dot' })} />
      <Key label="0" onPress={() => dispatch({ type: 'digit', value: '0' })} />
      <Key label="00" onPress={() => dispatch({ type: 'digit', value: '0' })} double />
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
        if (double) onPress(); // "00" 键按两次 0
      }}
    >
      {label}
    </button>
  );
}
