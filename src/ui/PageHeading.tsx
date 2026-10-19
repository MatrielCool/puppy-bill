import type { ReactNode } from 'react';
import { Icon } from './Icon';

/** 统一标题的中英文字距与层级，操作保留在各页面。 */
export function PageHeading({ title, eyebrow, children }: {
  title: string;
  eyebrow: string;
  children?: ReactNode;
}) {
  return <header className="page-heading">
    <div>
      <p className="page-eyebrow">{eyebrow}</p>
      <h1 className="page-title">{title}</h1>
    </div>
    {children ?? <span className="page-mascot"><Icon name="profile" size={30} /></span>}
  </header>;
}
