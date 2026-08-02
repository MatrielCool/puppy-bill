import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './Toast.module.css';

export interface ToastData {
  /** 每次 toast 唯一，用作 key 让同内容的连续 toast 也能重播动画 */
  id: number;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function Toast({ data, onDismiss }: { data: ToastData; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [data.id, onDismiss]);

  // 同 DatePicker：挂到 body，避免被页面内的堆叠上下文压在下面
  return createPortal(
    <div className={styles.wrap} role="status">
      <span className={styles.text}>{data.text}</span>
      {data.actionLabel && (
        <button
          className={styles.action}
          onClick={() => {
            data.onAction?.();
            onDismiss();
          }}
        >
          {data.actionLabel}
        </button>
      )}
    </div>,
    document.body,
  );
}
