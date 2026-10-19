import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../src/db/db';
import { seedIfEmpty } from '../src/db/seed';
import {
  addReceivable,
  getDueSummary,
  listReceivables,
  loadSettledDates,
  outstandingCents,
  settlePart,
  snoozeReminder,
  softDeleteReceivable,
  summarize,
  unsettlePart,
  updateReceivable,
  type NewReceivable,
} from '../src/db/receivables';
import { dateKeyOffset, todayKey } from '../src/lib/dates';

async function wipe() {
  await Promise.all([db.transactions.clear(), db.categories.clear(), db.receivables.clear()]);
}

beforeEach(async () => {
  await wipe();
  await seedIfEmpty();
});

function sample(over: Partial<NewReceivable> = {}): NewReceivable {
  return {
    title: 'XX 品牌 VI 设计',
    projectCents: 1_200_000,
    reimburseCents: 80_000,
    contactName: '张三',
    contactInfo: '13800138000',
    remindDateKey: dateKeyOffset(30),
    startDateKey: todayKey(),
    note: '',
    ...over,
  };
}

const settleToday = { categoryId: 'c_salary', dateKey: todayKey() };

describe('项目款与报销款各自独立结清', () => {
  it('项目款到账后生成一笔收入，但整条记录仍未结清', async () => {
    const id = await addReceivable(sample());

    await settlePart(id, 'project', { amountCents: 1_200_000, ...settleToday });

    const row = (await db.receivables.get(id))!;
    expect(row.projectTxId).not.toBeNull();
    expect(row.reimburseTxId).toBeNull();
    // 报销款还欠着，所以整条记录不能算结清
    expect(row.status).toBe('open');
    expect(outstandingCents(row)).toBe(80_000);

    const tx = (await db.transactions.get(row.projectTxId!))!;
    expect(tx.kind).toBe('income');
    expect(tx.amountCents).toBe(1_200_000);
    expect(tx.categoryId).toBe('c_salary');
    // 备注自动带上项目名，账单页点开才知道这笔收入是哪来的
    expect(tx.note).toContain('XX 品牌 VI 设计');
    expect(tx.note).toContain('项目款');
  });

  it('两部分都到账后整条记录才结清', async () => {
    const id = await addReceivable(sample());
    await settlePart(id, 'project', { amountCents: 1_200_000, ...settleToday });
    await settlePart(id, 'reimburse', { amountCents: 80_000, ...settleToday });

    const row = (await db.receivables.get(id))!;
    expect(row.status).toBe('settled');
    expect(outstandingCents(row)).toBe(0);
    expect(await db.transactions.count()).toBe(2);
  });

  it('没有报销款时，只结项目款就算结清', async () => {
    const id = await addReceivable(sample({ reimburseCents: 0 }));
    await settlePart(id, 'project', { amountCents: 1_200_000, ...settleToday });

    expect((await db.receivables.get(id))!.status).toBe('settled');
  });

  it('重复标记到账不会写出第二笔收入', async () => {
    const id = await addReceivable(sample());
    await settlePart(id, 'project', { amountCents: 1_200_000, ...settleToday });
    await settlePart(id, 'project', { amountCents: 1_200_000, ...settleToday });

    expect(await db.transactions.count()).toBe(1);
  });

  it('实收金额可以与应收不同 —— 客户少付是真实存在的', async () => {
    const id = await addReceivable(sample({ reimburseCents: 0 }));
    await settlePart(id, 'project', { amountCents: 1_000_000, ...settleToday });

    const row = (await db.receivables.get(id))!;
    const tx = (await db.transactions.get(row.projectTxId!))!;
    expect(tx.amountCents).toBe(1_000_000);
    // 记录仍然结清 —— 是否补差价由人决定，不该由 app 替他记着一笔幽灵欠款
    expect(row.status).toBe('settled');
  });

  it('到账日跨月时，收入落在到账那个月', async () => {
    const id = await addReceivable(sample({ reimburseCents: 0 }));
    await settlePart(id, 'project', {
      amountCents: 1_200_000,
      categoryId: 'c_salary',
      dateKey: '2026-07-15',
    });

    const row = (await db.receivables.get(id))!;
    const tx = (await db.transactions.get(row.projectTxId!))!;
    expect(tx.dateKey).toBe('2026-07-15');
    expect(tx.monthKey).toBe('2026-07');
  });
});

describe('撤销到账', () => {
  it('软删掉那笔收入，并把记录退回未结清', async () => {
    const id = await addReceivable(sample());
    await settlePart(id, 'project', { amountCents: 1_200_000, ...settleToday });
    await settlePart(id, 'reimburse', { amountCents: 80_000, ...settleToday });
    const txId = (await db.receivables.get(id))!.reimburseTxId!;

    await unsettlePart(id, 'reimburse');

    const row = (await db.receivables.get(id))!;
    expect(row.reimburseTxId).toBeNull();
    expect(row.status).toBe('open');
    expect(outstandingCents(row)).toBe(80_000);

    // 收入走软删而非硬删，与账单页的删除保持一致
    const tx = (await db.transactions.get(txId))!;
    expect(tx.deletedAt).not.toBeNull();
  });

  it('没到账的部分撤销是空操作', async () => {
    const id = await addReceivable(sample());
    await unsettlePart(id, 'project');
    expect((await db.receivables.get(id))!.status).toBe('open');
    expect(await db.transactions.count()).toBe(0);
  });
});

describe('编辑', () => {
  it('把报销款改成 0，已结项目款的记录随之变成结清', async () => {
    const id = await addReceivable(sample());
    await settlePart(id, 'project', { amountCents: 1_200_000, ...settleToday });
    expect((await db.receivables.get(id))!.status).toBe('open');

    await updateReceivable(id, { reimburseCents: 0 });

    expect((await db.receivables.get(id))!.status).toBe('settled');
  });

  it('两笔金额不能都是 0', async () => {
    await expect(addReceivable(sample({ projectCents: 0, reimburseCents: 0 }))).rejects.toThrow(
      /不能都是 0/,
    );

    const id = await addReceivable(sample());
    await expect(updateReceivable(id, { projectCents: 0, reimburseCents: 0 })).rejects.toThrow(
      /不能都是 0/,
    );
  });

  it('软删除的记录不再出现在列表里', async () => {
    const id = await addReceivable(sample());
    await softDeleteReceivable(id);

    expect(await listReceivables()).toHaveLength(0);
    // 数据还在，能恢复、也能安全地合并导入
    expect(await db.receivables.get(id)).toBeDefined();
  });
});

describe('该催了 —— 提醒的判定', () => {
  it('提醒日到了才算该催，明天到期的不算', async () => {
    await addReceivable(sample({ remindDateKey: todayKey(), projectCents: 100, reimburseCents: 0 }));
    await addReceivable(
      sample({ remindDateKey: dateKeyOffset(-3), projectCents: 200, reimburseCents: 0 }),
    );
    await addReceivable(
      sample({ remindDateKey: dateKeyOffset(1), projectCents: 999, reimburseCents: 0 }),
    );

    const due = await getDueSummary();
    expect(due.count).toBe(2);
    expect(due.cents).toBe(300);
  });

  it('已结清和已删除的都不再催', async () => {
    const settled = await addReceivable(
      sample({ remindDateKey: dateKeyOffset(-1), projectCents: 100, reimburseCents: 0 }),
    );
    await settlePart(settled, 'project', { amountCents: 100, ...settleToday });

    const deleted = await addReceivable(
      sample({ remindDateKey: dateKeyOffset(-1), projectCents: 200, reimburseCents: 0 }),
    );
    await softDeleteReceivable(deleted);

    expect(await getDueSummary()).toEqual({ count: 0, cents: 0 });
  });

  it('已到账的部分不计入该催的金额', async () => {
    const id = await addReceivable(sample({ remindDateKey: dateKeyOffset(-1) }));
    await settlePart(id, 'project', { amountCents: 1_200_000, ...settleToday });

    const due = await getDueSummary();
    expect(due.count).toBe(1);
    expect(due.cents).toBe(80_000);
  });

  it('催过之后可以把提醒日往后推', async () => {
    const id = await addReceivable(sample({ remindDateKey: dateKeyOffset(-5) }));
    expect((await getDueSummary()).count).toBe(1);

    await snoozeReminder(id, 7);

    expect((await db.receivables.get(id))!.remindDateKey).toBe(dateKeyOffset(7));
    expect((await getDueSummary()).count).toBe(0);
  });
});

describe('汇总与到账日', () => {
  it('待收总额按项目款/报销款分别累计，已到账的不再计入', async () => {
    const a = await addReceivable(sample());
    await addReceivable(sample({ projectCents: 500_000, reimburseCents: 0 }));
    await settlePart(a, 'reimburse', { amountCents: 80_000, ...settleToday });

    const summary = summarize(await listReceivables());
    expect(summary.openCount).toBe(2);
    expect(summary.projectOpenCents).toBe(1_200_000 + 500_000);
    expect(summary.reimburseOpenCents).toBe(0);
    expect(summary.openCents).toBe(1_700_000);
  });

  it('到账日现查那笔收入，不冗余存在待入账上', async () => {
    const id = await addReceivable(sample({ reimburseCents: 0 }));
    await settlePart(id, 'project', {
      amountCents: 1_200_000,
      categoryId: 'c_salary',
      dateKey: '2026-07-15',
    });

    const rows = await listReceivables();
    const dates = await loadSettledDates(rows);
    expect(dates.get(rows[0].projectTxId!)).toBe('2026-07-15');
  });
});
