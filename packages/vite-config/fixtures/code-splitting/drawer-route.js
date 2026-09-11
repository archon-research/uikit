// Design-system code reachable only from a lazy route. The consumer symptom
// this fixture reproduces is this module landing in the entry's static graph.
import { Drawer } from '@archon-research/design-system/drawer';

globalThis.drawerRoute = () => Drawer('lazy');
