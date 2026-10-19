import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import {
  addReceivable,
  softDeleteReceivable,
  updateReceivable,
  type NewReceivable,
} from '../../db/receivables';
import { formatAmount, parseInputToCents } from '../../lib/money';
import { dateKeyOffset, formatDayHeader, todayKey } from '../../lib/dates';
import { Icon } from '../../ui/Icon';
import { DatePicker } from '../../ui/DatePicker';
import type { ReceivableRow } from '../../db/types';
import recordStyles from '../record/RecordScreen.module.css';
import sheetStyles from '../list/EditSheet.module.css';
import styles from './PendingScreen.module.css';

/** 默认 30 天后提醒 —— 验收到付款之间通常就是这个量级 */
const DEFAULT_REMIND_DAYS = 30;

/** 与键盘 reducer 的 MAX_INT_DIGITS 保持一致，防止误触输入天文数字撑破布局 */
const MAX_INT_DIGITS = 7;

/** 只留数字和一个小数点，小数最多两位。金额随后仍走 parseInputToCents 转成分 */
function sanitizeAmount(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, '');
  const [int = '', ...rest] = cleaned.split('.');
  const intPart = int.slice(0, MAX_INT_DIGITS).replace(/^0+(?=\d)/, '');
  if (!cleaned.includes('.')) return intPart;
  return `${intPart || '0'}.${rest.join('').slice(0, 2)}`;
}

interface FormState {
  title: string;
  projectInput: string;
  reimburseInput: string;
  contactName: string;
  contactInfo: string;
  remindDateKey: string;
  startDateKey: string;
  note: string;
}

function initForm(row?: ReceivableRow): FormState {
  if (!row) {
    return {
      title: '',
      projectInput: '',
      reimburseInput: '',
      contactName: '',
      contactInfo: '',
      remindDateKey: dateKeyOffset(DEFAULT_REMIND_DAYS),
      startDateKey: todayKey(),
      note: '',
    };
  }
  return {
    title: row.title,
    projectInput: row.projectCents ? formatAmount(row.projectCents) : '',
    reimburseInput: row.reimburseCents ? formatAmount(row.reimburseCents) : '',
    contactName: row.contactName,
    contactInfo: row.contactInfo,
    remindDateKey: row.remindDateKey,
    startDateKey: row.startDateKey,
    note: row.note,
  };
}

/**
 * 新增 / 编辑一条待入账。
 *
 * 金额这里用普通输入框而不是记一笔的大数字键盘：这个表单本来就要打中文
 * （项目名、联系人），系统键盘无论如何都会弹；而项目款和报销款需要同屏
 * 对照着填，再弹一个占半屏的自绘键盘反而把表单挡掉一半。
 * 字号必须 ≥16px，否则 iOS 聚焦时会放大整页。
 */
export function ReceivableSheet({
  row,
  onClose,
  onSaved,
  onDeleted,
}: {
  row?: ReceivableRow;
  onClose: () => void;
  onSaved: (isNew: boolean) => void;
  onDeleted: (row: ReceivableRow) => void;
}) {
  const [form, setForm] = useState<FormState>(() => initForm(row));
  const [picking, setPicking] = useState<'remind' | 'start' | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const projectCents = parseInputToCents(form.projectInput);
  const reimburseCents = parseInputToCents(form.reimburseInput);

  // 已到账的部分不许改金额 —— 它已经对应账单里一笔真实的收入，
  // 在这里改数字只会让两边悄悄对不上。要改就先在卡片上撤销到账。
  const projectLocked = row?.projectTxId != null;
  const reimburseLocked = row?.reimburseTxId != null;

  const canSave = form.title.trim() !== '' && projectCents + reimburseCents > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const payload: NewReceivable = {
      title: form.title.trim(),
      projectCents,
      reimburseCents,
      contactName: form.contactName.trim(),
      contactInfo: form.contactInfo.trim(),
      remindDateKey: form.remindDateKey,
      startDateKey: form.startDateKey,
      note: form.note.trim(),
    };
    try {
      if (row) await updateReceivable(row.id, payload);
      else await addReceivable(payload);
      onSaved(!row);
      onClose();
    } catch {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!row) return;
    void softDeleteReceivable(row.id);
    onDeleted(row);
    onClose();
  };

  return createPortal(
    <>
      <div className={sheetStyles.backdrop} onClick={onClose} />
      <div className={sheetStyles.sheet} role="dialog" aria-label={row ? '编辑待入账' : '新增待入账'}>
        <div className={sheetStyles.header}>
          <button className={sheetStyles.headerBtn} onClick={onClose}>
            取消
          </button>
          <span className={sheetStyles.headerTitle}>{row ? '编辑' : '新增待入账'}</span>
          <button
            className={clsx(sheetStyles.headerBtn, styles.saveBtn)}
            disabled={!canSave}
            onClick={handleSave}
          >
            保存
          </button>
        </div>

        <div className={sheetStyles.body}>
          <div className={styles.form}>
            <Field label="款项内容">
              <input
                className={styles.input}
                placeholder="比如：XX 品牌 VI 设计"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                enterKeyHint="next"
              />
            </Field>

            <Field label="项目款" hint={projectLocked ? '已到账，金额不可改' : undefined}>
              <AmountInput
                value={form.projectInput}
                onChange={(v) => set('projectInput', v)}
                readOnly={projectLocked}
              />
            </Field>

            <Field
              label="报销款"
              hint={reimburseLocked ? '已到账，金额不可改' : '差旅、采购等垫付款，没有就留空'}
            >
              <AmountInput
                value={form.reimburseInput}
                onChange={(v) => set('reimburseInput', v)}
                readOnly={reimburseLocked}
              />
            </Field>

            <Field label="联系人">
              <input
                className={styles.input}
                placeholder="该找谁催这笔款"
                value={form.contactName}
                onChange={(e) => set('contactName', e.target.value)}
              />
            </Field>

            <Field label="联系方式" hint="填手机号的话，列表里可以直接点着拨号">
              <input
                className={styles.input}
                placeholder="手机号 / 微信号 / 邮箱"
                value={form.contactInfo}
                onChange={(e) => set('contactInfo', e.target.value)}
              />
            </Field>

            <Field label="提醒我催款">
              <button
                className={clsx(recordStyles.datePill, styles.formPill)}
                onClick={() => setPicking('remind')}
              >
                <Icon name="calendar" size={19} />
                {formatDayHeader(form.remindDateKey)}
              </button>
            </Field>

            <Field label="款项产生日">
              <button
                className={clsx(recordStyles.datePill, styles.formPill)}
                onClick={() => setPicking('start')}
              >
                <Icon name="calendar" size={19} />
                {formatDayHeader(form.startDateKey)}
              </button>
            </Field>

            <Field label="备注">
              <input
                className={styles.input}
                placeholder="可不填"
                value={form.note}
                onChange={(e) => set('note', e.target.value)}
                enterKeyHint="done"
              />
            </Field>

            {row && (
              <button className={styles.deleteRow} onClick={handleDelete}>
                删除这条待入账
              </button>
            )}
          </div>
        </div>
      </div>

      {picking && (
        <DatePicker
          value={picking === 'remind' ? form.remindDateKey : form.startDateKey}
          // 提醒日是未来的日子，是整个 app 里唯一允许选未来的地方
          allowFuture={picking === 'remind'}
          onPick={(dateKey) =>
            set(picking === 'remind' ? 'remindDateKey' : 'startDateKey', dateKey)
          }
          onClose={() => setPicking(null)}
        />
      )}
    </>,
    document.body,
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      {children}
      {hint && <span className={styles.fieldHint}>{hint}</span>}
    </label>
  );
}

function AmountInput({
  value,
  onChange,
  readOnly,
}: {
  value: string;
  onChange: (value: string) => void;
  readOnly: boolean;
}) {
  return (
    <div className={clsx(styles.amountField, readOnly && styles.amountFieldLocked)}>
      <span className={styles.amountPrefix}>¥</span>
      <input
        className={clsx(styles.input, styles.amountInput)}
        // type 用 text 而非 number：number 在 iOS 上仍会带上下箭头，
        // 且非法输入时 value 会变成空串，拿不到用户实际敲了什么
        type="text"
        inputMode="decimal"
        placeholder="0.00"
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange(sanitizeAmount(e.target.value))}
      />
    </div>
  );
}
