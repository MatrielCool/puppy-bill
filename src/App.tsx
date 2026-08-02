import { useEffect, useState } from 'react';
import { useRoute } from './lib/router';
import { TabBar } from './ui/TabBar';
import { Toast, type ToastData } from './ui/Toast';
import { RecordScreen } from './features/record/RecordScreen';
import { ListScreen } from './features/list/ListScreen';
import { StatusPanel } from './features/status/StatusPanel';
import { seedIfEmpty } from './db/seed';
import styles from './App.module.css';

function Placeholder({ woof, sub }: { woof: string; sub: string }) {
  return (
    <div className={styles.placeholder}>
      <img className={styles.puppy} src={`${import.meta.env.BASE_URL}pwa-192x192.png`} alt="小狗" />
      <p className={styles.woof}>{woof}</p>
      <p className={styles.sub}>{sub}</p>
    </div>
  );
}

export function App() {
  const route = useRoute();
  const [toast, setToast] = useState<ToastData | null>(null);
  const [ready, setReady] = useState(false);

  // 首次启动写入内置分类
  useEffect(() => {
    void seedIfEmpty().finally(() => setReady(true));
  }, []);

  if (!ready) return null;

  return (
    <div className="app-shell">
      <main className="app-main">
        {route === '/' && <RecordScreen onToast={setToast} />}
        {route === '/list' && <ListScreen onToast={setToast} />}
        {route === '/budget' && (
          <Placeholder woof="还没设预算" sub="Phase 4 会做预算环和每日可用额度。" />
        )}
        {route === '/settings' && <StatusPanel />}
      </main>
      <TabBar current={route} />
      {toast && <Toast key={toast.id} data={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
