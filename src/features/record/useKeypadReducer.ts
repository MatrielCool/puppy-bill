import { useReducer } from 'react';
import type { TxKind } from '../../db/types';
import { todayKey } from '../../lib/dates';

export interface KeypadState {
  /** 原始输入串，如 "28"、"28."、"28.5"。不存数字，避免 "28." 这种中间态丢失 */
  input: string;
  kind: TxKind;
  categoryId: string | null;
  dateKey: string;
  note: string;
}

export type KeypadAction =
  | { type: 'digit'; value: string }
  | { type: 'dot' }
  | { type: 'backspace' }
  | { type: 'setKind'; kind: TxKind }
  | { type: 'setCategory'; categoryId: string }
  | { type: 'setDate'; dateKey: string }
  | { type: 'setNote'; note: string }
  | { type: 'reset' }
  | { type: 'hydrate'; state: KeypadState };

export function initialKeypadState(): KeypadState {
  return { input: '', kind: 'expense', categoryId: null, dateKey: todayKey(), note: '' };
}

/** 整数位上限，防止误触输入天文数字撑破布局 */
const MAX_INT_DIGITS = 7;

export function keypadReducer(state: KeypadState, action: KeypadAction): KeypadState {
  switch (action.type) {
    case 'digit': {
      const [intPart = '', fracPart] = state.input.split('.');
      const hasDot = state.input.includes('.');

      if (hasDot) {
        // 小数位最多两位
        if ((fracPart ?? '').length >= 2) return state;
        return { ...state, input: state.input + action.value };
      }
      if (intPart.length >= MAX_INT_DIGITS) return state;
      // 避免出现 "007" 这种前导零
      if (intPart === '0') return { ...state, input: action.value };
      return { ...state, input: state.input + action.value };
    }

    case 'dot': {
      if (state.input.includes('.')) return state;
      // 直接点小数点时补个 0，显示成 "0."
      return { ...state, input: (state.input || '0') + '.' };
    }

    case 'backspace':
      return { ...state, input: state.input.slice(0, -1) };

    case 'setKind':
      // 收支切换后原分类多半不适用了，清掉让用户重选
      return { ...state, kind: action.kind, categoryId: null };

    case 'setCategory':
      return { ...state, categoryId: action.categoryId };

    case 'setDate':
      return { ...state, dateKey: action.dateKey };

    case 'setNote':
      return { ...state, note: action.note };

    case 'reset':
      // 保留收支方向、分类和日期 —— 连着记好几笔时通常是同一类
      return { ...initialKeypadState(), kind: state.kind, categoryId: state.categoryId, dateKey: state.dateKey };

    case 'hydrate':
      return action.state;

    default:
      return state;
  }
}

export function useKeypad() {
  return useReducer(keypadReducer, undefined, initialKeypadState);
}
