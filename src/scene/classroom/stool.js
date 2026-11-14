import { C } from '../../materials/palette.js';
import { woodMat } from '../../materials/wood.js';
import { cyl, rbox } from './util/geo.js';
import { instanced, group } from './util/geo.js';
import { STOOL } from './layout.js';

// 圓木凳:圓座面 + 四支略外斜的腳 + 腳間橫撐。多張凳子以 InstancedMesh 繪製(每個部件一個 InstancedMesh)。
export function createStools(parent, positions) {
  const g = group(parent, 'stools');
  const seatMat = woodMat(C.woodMid, 'grain', 41), legMat = woodMat(C.woodFrame, 'grain', 43);
  const H = STOOL.height, legLen = H - STOOL.seatT;
  const seats = [], legs = [], rails = [];
  positions.forEach(([x, , z, yaw = 0]) => {
    const ry = yaw;
    seats.push({ pos: [x, H - STOOL.seatT / 2, z], rot: [0, ry, 0] });
    for (let k = 0; k < 4; k++) {
      const a = ry + Math.PI / 4 + k * Math.PI / 2, r = 0.115;
      const lx = x + Math.cos(a) * r, lz = z + Math.sin(a) * r;
      legs.push({ pos: [lx, legLen / 2, lz], rot: [Math.sin(a) * 0.06, 0, -Math.cos(a) * 0.06] });
      const b = a + Math.PI / 4, rr = 0.09;
      rails.push({ pos: [x + Math.cos(b) * rr, 0.16, z + Math.sin(b) * rr], rot: [0, -b + Math.PI / 2, 0] });
    }
  });
  instanced(g, cyl(STOOL.seatR, STOOL.seatR - 0.008, STOOL.seatT, 28), seatMat, seats, { cast: true, receive: true, name: 'stoolSeat' });
  instanced(g, cyl(0.016, 0.019, legLen, 10), legMat, legs, { cast: true, receive: true, name: 'stoolLeg' });
  instanced(g, rbox(0.17, 0.022, 0.022, 0.006), legMat, rails, { cast: false, receive: true, name: 'stoolRail' });
  return g;
}
