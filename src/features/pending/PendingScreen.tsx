import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import clsx from 'clsx';
import {
  PART_LABEL,
  listReceivables,
  loadSettledDates,
  outstandingCents,
  partCents,
  partTxId,
  restoreReceivable,
  snoozeReminder,
  summarize,
  unsettlePart,
} from '../../db/receivables';
import { formatCNYGrouped } from '../../lib/money';
import { daysBetween, formatShortDate, todayKey } from '../../lib/dates';
import { Icon } from '../../ui/Icon';
import { ReceivableSheet } from './ReceivableSheet';
import { SettleSheet } from './SettleSheet';
import type { ReceivablePart, ReceivableRow } from '../../db/types';
import type { ToastData } from '../../ui/Toast';
import styles from './PendingScreen.module.css';
import { PageHeading } from '../../ui/PageHeading';
import { PuppyScene } from '../../ui/PuppyScene';

/** 手机号才给拨号；微信号、邮箱走复制 */
const PHONE_RE = /^1\d{10}$/;

/** 催过一轮之后往后推几天 */
const SNOOZE_DAYS = 7;

const ALL_PARTS: readonly ReceivablePart[] = ['project', 'reimburse'];

/**
 * 待入账 —— 已经谈定、但钱还没到的应收款。
 *
 * 其余四个页面处理的都是已经发生的钱；这一页承载的是「这笔钱还没到，
 * 但我知道它欠着，而且该找谁催」。
 */
export function PendingScreen({ onToast }: { onToast: (toast: ToastData) => void }) {
  const [editing, setEditing] = useState<ReceivableRow | 'new' | null>(null);
  const [settling, setSettling] = useState<{ row: ReceivableRow; part: ReceivablePart } | null>(
    null,
  );
  const [showSettled, setShowSettled] = useState(false);

  // 一个 useLiveQuery 同时取记录和它们关联的收入日期 —— 拆成两个查询会让
  // 同一份数据被读两遍，而且两者的刷新时机可能错开、界面闪一下旧值
  const data = useLiveQuery(async () => {
    const rows = await listReceivables();
    return { rows, settledDates: await loadSettledDates(rows) };
  }, []);

  if (!data) return null;
  const { rows, settledDates } = data;

  const summary = summarize(rows);
  const today = todayKey();
  const due = rows.filter((r) => r.status === 'open' && r.remindDateKey <= today);
  const upcoming = rows.filter((r) => r.status === 'open' && r.remindDateKey > today);
  const settled = rows
    .filter((r) => r.status === 'settled')
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const toast = (text: string, action?: { label: string; run: () => void }) =>
    onToast({ id: Date.now(), text, actionLabel: action?.label, onAction: action?.run });

  const handleSnooze = async (row: ReceivableRow) => {
    await snoozeReminder(row.id, SNOOZE_DAYS);
    toast(`已改到 ${SNOOZE_DAYS} 天后提醒`);
  };

  const handleUnsettle = async (row: ReceivableRow, part: ReceivablePart) => {
    const ok = window.confirm(
      `撤销「${PART_LABEL[part]}」到账？账单里对应的那笔收入会一并删除。`,
    );
    if (!ok) return;
    await unsettlePart(row.id, part);
    toast(`已撤销${PART_LABEL[part]}到账`);
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast('已复制联系方式');
    } catch {
      toast('复制失败，长按可以选中');
    }
  };

  const cardProps = {
    settledDates,
    onEdit: setEditing,
    onSettle: (row: ReceivableRow, part: ReceivablePart) => setSettling({ row, part }),
    onUnsettle: handleUnsettle,
    onSnooze: handleSnooze,
    onCopy: handleCopy,
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <PageHeading title="等一笔到账" eyebrow="GOOD THINGS ON THE WAY">
        <button className={styles.addBtn} onClick={() => setEditing('new')}>
          <Icon name="record" size={20} />
          新增
        </button>
        </PageHeading>
      </div>

      {rows.length > 0 && (
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>待收总额</span>
          <span className={styles.summaryValue}>{formatCNYGrouped(summary.openCents)}</span>
          <span className={styles.summaryBreak}>
            项目款 {formatCNYGrouped(summary.projectOpenCents)} · 报销款{' '}
            {formatCNYGrouped(summary.reimburseOpenCents)}
          </span>
        </div>
      )}

      {rows.length === 0 && (
        <div className={styles.empty}>
          <PuppyScene className={styles.emptyPuppy} />
          <p className={styles.emptyText}>
            还没有待收的款项。
            <br />
            接了新项目、等着客户打款时，在这里记一笔，到时候小狗提醒你去催。
          </p>
        </div>
      )}

      {due.length > 0 && (
        <>
          <p className={clsx(styles.sectionTitle, styles.sectionDue)}>该催了 · {due.length}</p>
          {due.map((row) => (
            <ReceivableCard key={row.id} row={row} isDue {...cardProps} />
          ))}
        </>
      )}

      {upcoming.length > 0 && (
        <>
          <p className={styles.sectionTitle}>进行中 · {upcoming.length}</p>
          {upcoming.map((row) => (
            <ReceivableCard key={row.id} row={row} {...cardProps} />
          ))}
        </>
      )}

      {settled.length > 0 && (
        <>
          <button
            className={clsx(styles.sectionTitle, styles.sectionToggle)}
            onClick={() => setShowSettled((v) => !v)}
          >
            已结清 · {settled.length}
            <Icon name={showSettled ? 'chevronLeft' : 'chevronRight'} size={16} />
          </button>
          {showSettled &&
            settled.map((row) => <ReceivableCard key={row.id} row={row} {...cardProps} />)}
        </>
      )}

      {editing && (
        <ReceivableSheet
          row={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={(isNew) => toast(isNew ? '已添加待入账' : '已保存')}
          onDeleted={(row) =>
            toast('已删除', { label: '恢复', run: () => void restoreReceivable(row.id) })
          }
        />
      )}

      {settling && (
        <SettleSheet
          row={settling.row}
          part={settling.part}
          onClose={() => setSettling(null)}
          onSettled={(cents) =>
            toast(`已记入收入 +${formatCNYGrouped(cents)}`, {
              label: '撤销',
              run: () => void unsettlePart(settling.row.id, settling.part),
            })
          }
        />
      )}
    </div>
  );
}

function ReceivableCard({
  row,
  isDue = false,
  settledDates,
  onEdit,
  onSettle,
  onUnsettle,
  onSnooze,
  onCopy,
}: {
  row: ReceivableRow;
  isDue?: boolean;
  settledDates: Map<string, string>;
  onEdit: (row: ReceivableRow) => void;
  onSettle: (row: ReceivableRow, part: ReceivablePart) => void;
  onUnsettle: (row: ReceivableRow, part: ReceivablePart) => void;
  onSnooze: (row: ReceivableRow) => void;
  onCopy: (text: string) => void;
}) {
  const today = todayKey();
  const outstanding = outstandingCents(row);
  const waited = daysBetween(row.startDateKey, today);
  // 正数 = 已经过了提醒日
  const overdue = daysBetween(row.remindDateKey, today);
  const isPhone = PHONE_RE.test(row.contactInfo);

  const remindText =
    row.status === 'settled'
      ? '已全部到账'
      : overdue > 0
        ? `${formatShortDate(row.remindDateKey)}该催 · 已过 ${overdue} 天`
        : overdue === 0
          ? '今天该催了'
          : `${formatShortDate(row.remindDateKey)}提醒 · 还有 ${-overdue} 天`;

  return (
    <div className={clsx(styles.card, isDue && styles.cardDue)}>
      {/* 只有卡片上半部分是按钮 —— 整张卡做成 button 就没法在里面再放
          「标记到账」「拨号」这些按钮了（button 不能嵌套 button） */}
      <button className={styles.cardHead} onClick={() => onEdit(row)}>
        <span className={styles.cardTitle}>{row.title}</span>
        <span className={clsx(styles.cardAmount, row.status === 'settled' && styles.cardAmountDone)}>
          {row.status === 'settled' ? '已结清' : formatCNYGrouped(outstanding)}
        </span>
      </button>

      <div className={styles.cardMeta}>
        <span className={clsx(overdue >= 0 && row.status === 'open' && styles.metaDue)}>
          {remindText}
        </span>
        <span className={styles.metaDot}>·</span>
        <span>已等 {waited} 天</span>
      </div>

      {(row.contactName || row.contactInfo) && (
        <div className={styles.contactRow}>
          <span className={styles.contactName}>{row.contactName || '未填联系人'}</span>
          {row.contactInfo &&
            (isPhone ? (
              <a className={styles.contactAction} href={`tel:${row.contactInfo}`}>
                {row.contactInfo}
              </a>
            ) : (
              <button className={styles.contactAction} onClick={() => onCopy(row.contactInfo)}>
                {row.contactInfo}
              </button>
            ))}
        </div>
      )}

      <div className={styles.parts}>
        {ALL_PARTS.filter((part) => partCents(row, part) > 0).map((part) => {
          const txId = partTxId(row, part);
          const settledOn = txId ? settledDates.get(txId) : undefined;
          return (
            <div key={part} className={styles.partRow}>
              <span className={styles.partLabel}>{PART_LABEL[part]}</span>
              <span className={styles.partAmount}>{formatCNYGrouped(partCents(row, part))}</span>
              {txId ? (
                <button className={styles.partDone} onClick={() => onUnsettle(row, part)}>
                  <Icon name="check" size={14} /> 已到账{settledOn ? ` ${formatShortDate(settledOn)}` : ''}
                </button>
              ) : (
                <button className={styles.partAction} onClick={() => onSettle(row, part)}>
                  标记到账
                </button>
              )}
            </div>
          );
        })}
      </div>

      {row.note && <p className={styles.cardNote}>{row.note}</p>}

      {isDue && (
        <button className={styles.snooze} onClick={() => onSnooze(row)}>
          催过了 · {SNOOZE_DAYS} 天后再提醒
        </button>
      )}
    </div>
  );
}
