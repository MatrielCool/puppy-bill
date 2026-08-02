import { db } from './db';
import type { CategoryRow } from './types';

/**
 * 内置分类。id 用稳定的语义字符串而非随机 UUID —— 这样导出文件在不同设备
 * 之间合并导入时，内置分类能自然对上，不会变成重复项。
 */
const BUILTIN: Omit<CategoryRow, 'sortOrder'>[] = [
  { id: 'c_food', name: '餐饮', icon: 'food', kind: 'expense', isBuiltin: 1, isArchived: 0 },
  { id: 'c_transit', name: '交通', icon: 'transit', kind: 'expense', isBuiltin: 1, isArchived: 0 },
  { id: 'c_shopping', name: '购物', icon: 'shopping', kind: 'expense', isBuiltin: 1, isArchived: 0 },
  { id: 'c_home', name: '居家', icon: 'home', kind: 'expense', isBuiltin: 1, isArchived: 0 },
  { id: 'c_fun', name: '娱乐', icon: 'fun', kind: 'expense', isBuiltin: 1, isArchived: 0 },
  { id: 'c_health', name: '医疗', icon: 'health', kind: 'expense', isBuiltin: 1, isArchived: 0 },
  { id: 'c_study', name: '学习', icon: 'study', kind: 'expense', isBuiltin: 1, isArchived: 0 },
  { id: 'c_social', name: '人情', icon: 'social', kind: 'expense', isBuiltin: 1, isArchived: 0 },
  { id: 'c_pet', name: '宠物', icon: 'pet', kind: 'expense', isBuiltin: 1, isArchived: 0 },
  { id: 'c_other', name: '其他', icon: 'other', kind: 'expense', isBuiltin: 1, isArchived: 0 },

  { id: 'c_salary', name: '工资', icon: 'salary', kind: 'income', isBuiltin: 1, isArchived: 0 },
  { id: 'c_bonus', name: '兼职', icon: 'bonus', kind: 'income', isBuiltin: 1, isArchived: 0 },
  { id: 'c_redpacket', name: '红包', icon: 'redpacket', kind: 'income', isBuiltin: 1, isArchived: 0 },
  { id: 'c_income_other', name: '其他', icon: 'other', kind: 'income', isBuiltin: 1, isArchived: 0 },
];

/**
 * 首次启动时写入内置分类。
 * 用 bulkAdd + 忽略主键冲突，所以重复调用是安全的，也不会覆盖用户改过的名字。
 */
export async function seedIfEmpty(): Promise<void> {
  const count = await db.categories.count();
  if (count > 0) return;

  await db.categories.bulkAdd(BUILTIN.map((c, index) => ({ ...c, sortOrder: index })));
}
