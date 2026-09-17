import { Dialog } from '@ark-ui/react';
import { PanelIcon } from 'lucide-react';
export function Drawer(label) {
  return `drawer:${Dialog(label)}:${PanelIcon()}`;
}
