import { navigate, type Route } from '../lib/router';
import { Icon, type IconName } from './Icon';
import styles from './TabBar.module.css';

const TABS: { route: Route; icon: IconName; label: string }[] = [
  { route: '/', icon: 'record', label: '记一笔' },
  { route: '/list', icon: 'list', label: '账单' },
  { route: '/pending', icon: 'pending', label: '待入账' },
  { route: '/budget', icon: 'budget', label: '预算' },
  { route: '/settings', icon: 'profile', label: '我的' },
];

export function TabBar({
  current,
  badges,
}: {
  current: Route;
  /**
   * 各标签的红点数字。刻意由外部传入而不是在这里查数据库 ——
   * TabBar 是纯展示组件，不该跟 Dexie 耦合。
   */
  badges?: Partial<Record<Route, number>>;
}) {
  return (
    <nav className={styles.bar}>
      {TABS.map(({ route, icon, label }) => {
        const count = badges?.[route] ?? 0;
        return (
          <button
            key={route}
            className={styles.tab}
            aria-current={current === route ? 'page' : undefined}
            onClick={() => navigate(route)}
          >
            <span className={styles.iconWrap}>
              <Icon name={icon} size={28} />
              {count > 0 && (
                <span className={styles.badge} aria-label={`${count} 项待处理`}>
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </span>
            <span className={styles.label}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
