import { createPortal } from 'react-dom';
import clsx from 'clsx';
import sheetStyles from '../list/EditSheet.module.css';
import styles from './ReminderGuide.module.css';

const NOTIFICATION_TEXT = '汪！今天的账记了吗？';

const STEPS = [
  '打开 iPhone 自带的「快捷指令」App',
  '底部选「自动化」→ 右上角「＋」',
  '触发条件选「时间」，设为每天 21:30（或你习惯的时间）',
  '选「立即运行」，并把「运行时通知我」关掉 —— 否则每天会多一条系统提示',
  '点「新建空白自动化」→ 添加动作「显示通知」',
  '标题填「小狗账单」，正文填下面这句话',
  '右上角「完成」',
];

/**
 * 每日提醒的配置引导。
 *
 * iOS 的 PWA 无法自己定时弹通知（没有本地定时通知 API，Web Push 需要服务器），
 * 所以真正的每日提醒只能借助系统的快捷指令自动化。配置一次即可。
 */
export function ReminderGuide({ onClose, onCopy }: { onClose: () => void; onCopy: () => void }) {
  return createPortal(
    <>
      <div className={sheetStyles.backdrop} onClick={onClose} />
      <div className={sheetStyles.sheet} role="dialog" aria-label="设置每日提醒">
        <div className={sheetStyles.header}>
          <button className={sheetStyles.headerBtn} onClick={onClose}>
            关闭
          </button>
          <span className={sheetStyles.headerTitle}>每日提醒</span>
          <span className={sheetStyles.headerBtn} />
        </div>

        <div className={clsx(sheetStyles.body, styles.body)}>
          <p className={styles.intro}>
            小狗账单是网页 App，iOS 不允许它自己定时弹通知。
            但你可以用系统自带的「快捷指令」做一个每天的提醒，<b>设置一次就够了</b>。
          </p>

          <ol className={styles.steps}>
            {STEPS.map((step, i) => (
              <li key={i} className={styles.step}>
                <span className={styles.stepNum}>{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>

          <div className={styles.copyBox}>
            <span className={styles.copyText}>{NOTIFICATION_TEXT}</span>
            <button
              className={styles.copyBtn}
              onClick={async () => {
                await navigator.clipboard.writeText(NOTIFICATION_TEXT);
                onCopy();
              }}
            >
              复制
            </button>
          </div>

          <div className={styles.warning}>
            <b>⚠️ 千万不要添加「打开 URL」动作。</b>
            <br />
            那会用 Safari 打开小狗账单，而 Safari 和主屏图标的数据是<b>分开存储</b>的，
            你会看到一个空账本。收到提醒后请直接点主屏幕上的小狗图标。
          </div>

          <p className={styles.verify}>
            想验证有没有配好：把自动化的时间改成两分钟后，锁屏等一下，
            通知应该会从锁屏弹出来。确认后再改回你想要的时间。
          </p>
        </div>
      </div>
    </>,
    document.body,
  );
}
