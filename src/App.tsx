import { useEffect, useState } from 'react';
import { useRoute } from './lib/router';
import { TabBar } from './ui/TabBar';
import { Toast, type ToastData } from './ui/Toast';
import { RecordScreen } from './features/record/RecordScreen';
import { ListScreen } from './features/list/ListScreen';
import { BudgetScreen } from './features/budget/BudgetScreen';
import { SettingsScreen } from './features/settings/SettingsScreen';
import { seedIfEmpty } from './db/seed';
import { getMonthBudgetView } from './db/budgets';
import { currentMonthKey } from './lib/dates';
import { syncBadge } from './lib/badge';

export function App() {
  const route = useRoute();
  const [toast, setToast] = useState<ToastData | null>(null);
  const [ready, setReady] = useState(false);

  // 首次启动写入内置分类
  useEffect(() => {
    void seedIfEmpty().finally(() => setReady(true));
  }, []);

  // 角标只能在 app 运行时更新，所以在切到后台前写入最新的超支数 ——
  // 之后它会一直停在主屏图标上，直到下次打开 app。
  useEffect(() => {
    const update = () =>
      void getMonthBudgetView(currentMonthKey()).then((view) => syncBadge(view.overCount));

    const onHide = () => {
      if (document.visibilityState === 'hidden') update();
    };
    document.addEventListener('visibilitychange', onHide);
    update();
    return () => document.removeEventListener('visibilitychange', onHide);
  }, []);

  if (!ready) return null;

  return (
    <div className="app-shell">
      <main className="app-main">
        {route === '/' && <RecordScreen onToast={setToast} />}
        {route === '/list' && <ListScreen onToast={setToast} />}
        {route === '/budget' && <BudgetScreen />}
        {route === '/settings' && <SettingsScreen onToast={setToast} />}
      </main>
      <TabBar current={route} />
      {toast && <Toast key={toast.id} data={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
