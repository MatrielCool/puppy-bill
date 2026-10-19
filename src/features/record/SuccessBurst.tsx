import { Icon } from '../../ui/Icon';
import styles from './SuccessBurst.module.css';

/** 记账成功时的爪印盖章 + 汪 + 纸屑。~620ms，不阻塞下一笔录入。 */

const DOTS = [
  { dx: '-72px', dy: '-56px', color: 'var(--brand)' },
  { dx: '68px', dy: '-64px', color: 'var(--rose)' },
  { dx: '-84px', dy: '32px', color: 'var(--lavender)' },
  { dx: '80px', dy: '40px', color: 'var(--sage)' },
  { dx: '-40px', dy: '-84px', color: 'var(--brand-soft)' },
  { dx: '44px', dy: '76px', color: 'var(--ic-coral)' },
];

export function SuccessBurst() {
  return (
    <div className={styles.overlay} aria-hidden="true">
      <span className={styles.paw}>
        <Icon name="pet" size={92} />
      </span>
      <span className={styles.bubble}>汪!</span>
      {DOTS.map((d, i) => (
        <span
          key={i}
          className={styles.dot}
          style={
            { '--dx': d.dx, '--dy': d.dy, background: d.color } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
