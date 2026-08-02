import { navigate, type Route } from '../lib/router';
import styles from './TabBar.module.css';

const TABS: { route: Route; icon: string; label: string }[] = [
  { route: '/', icon: '🐾', label: '记一笔' },
  { route: '/list', icon: '📒', label: '账单' },
  { route: '/budget', icon: '🎯', label: '预算' },
  { route: '/settings', icon: '🐶', label: '我的' },
];

export function TabBar({ current }: { current: Route }) {
  return (
    <nav className={styles.bar}>
      {TABS.map(({ route, icon, label }) => (
        <button
          key={route}
          className={styles.tab}
          aria-current={current === route ? 'page' : undefined}
          onClick={() => navigate(route)}
        >
          <span className={styles.icon} aria-hidden="true">
            {icon}
          </span>
          <span className={styles.label}>{label}</span>
        </button>
      ))}
    </nav>
  );
}
