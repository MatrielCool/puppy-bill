import { Icon } from '../../ui/Icon';
import styles from './SuccessBurst.module.css';

/** 记账成功时的爪印盖章 + 汪 + 纸屑。~620ms，不阻塞下一笔录入。 */

const DOTS = [
  { dx: '-72px', dy: '-56px', color: '#F5A25D' },
  { dx: '68px', dy: '-64px', color: '#FF8FA3' },
  { dx: '-84px', dy: '32px', color: '#FFC183' },
  { dx: '80px', dy: '40px', color: '#7BC9A0' },
  { dx: '-40px', dy: '-84px', color: '#FFD98E' },
  { dx: '44px', dy: '76px', color: '#F09148' },
];

export function SuccessBurst() {
  return (
    <div className={styles.overlay} aria-hidden="true">
      <span className={styles.paw}>
        <Icon name="pet" size={84} strokeWidth={1.6} />
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
