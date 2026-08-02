import { useSyncExternalStore } from 'react';

/**
 * 极简哈希路由。
 *
 * 用哈希而非 history API，是因为 GitHub Pages 的项目页对深链会返回 404，
 * 而常见的 404.html 转发 hack 又会和 Service Worker 的 navigateFallback 相互干扰。
 * 哈希路由让每个页面都是同一个文档，零成本消除整类问题。
 *
 * 只有 4 个标签页、没有嵌套路由和数据加载，因此不需要 react-router。
 */

export type Route = '/' | '/list' | '/budget' | '/settings';

const subscribe = (onChange: () => void) => {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
};

const getSnapshot = (): string => window.location.hash.slice(1) || '/';

export function useRoute(): Route {
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => '/');
  return isRoute(raw) ? raw : '/';
}

export function navigate(to: Route): void {
  window.location.hash = to;
}

const ROUTES: readonly string[] = ['/', '/list', '/budget', '/settings'];

function isRoute(value: string): value is Route {
  return ROUTES.includes(value);
}
