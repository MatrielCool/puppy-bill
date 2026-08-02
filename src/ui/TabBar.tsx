import { navigate, type Route } from '../lib/router';
import { Icon, type IconName } from './Icon';
import styles from './TabBar.module.css';

const TABS: { route: Route; icon: IconName; label: string }[] = [
  { route: '/', icon: 'record', label: '记一笔' },
  { route: '/list', icon: 'list', label: '账单' },
  { route: '/budget', icon: 'budget', label: '预算' },
  { route: '/settings', icon: 'profile', label: '我的' },
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
          <Icon name={icon} size={23} strokeWidth={current === route ? 2.1 : 1.7} />
          <span className={styles.label}>{label}</span>
        </button>
      ))}
    </nav>
  );
}
