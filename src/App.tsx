import { useRoute } from './lib/router';
import { TabBar } from './ui/TabBar';
import { StatusPanel } from './features/status/StatusPanel';
import styles from './App.module.css';

/** Phase 0 占位页。功能会从 Phase 1 起逐个替换掉它们。 */
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

  return (
    <div className="app-shell">
      <main className="app-main">
        {route === '/' && (
          <Placeholder woof="汪！" sub="管线已经通了。下一步给我装上数字键盘，就能开始记账啦。" />
        )}
        {route === '/list' && (
          <Placeholder woof="账单还是空的" sub="Phase 3 会做月份切换、搜索和筛选。" />
        )}
        {route === '/budget' && (
          <Placeholder woof="还没设预算" sub="Phase 4 会做预算环和每日可用额度。" />
        )}
        {route === '/settings' && <StatusPanel />}
      </main>
      <TabBar current={route} />
    </div>
  );
}
