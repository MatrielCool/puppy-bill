import type { CapacitorConfig } from '@capacitor/cli';
import type {} from '@capacitor/local-notifications';

const config: CapacitorConfig = {
  // 开发用标识；首次真机安装前可改成自己的反向域名，之后保持稳定。
  appId: 'com.puppybill.app',
  appName: '小狗账单',
  webDir: 'dist-native',
  ios: { contentInset: 'never' },
  plugins: {
    LocalNotifications: { presentationOptions: ['banner', 'list', 'sound'] },
  },
};

export default config;
