// 所有物件的座標與尺寸集中管理。單位:公尺。原點 = 學生站立處(地面),學生面向 −Z,+X 為右手邊。

export const ROOM = { xMin: -3.25, xMax: 3.25, zMin: -3.8, zMax: 3.7, height: 3.0, wainscot: 1.0 };

export const WORKBENCH = {
  top: { w: 1.6, d: 0.9, t: 0.05 },
  height: 0.85,           // 桌面上緣高度
  center: [0, 0.85, -0.6],
  mount: { center: [0, 0.85, -0.6], size: 0.8 }, // 教具掛載區(完全淨空)
  leg: 0.06,
};
export const OTHER_BENCHES = [[-1.9, 0.85, -1.6], [-1.9, 0.85, 0.8]];
export const STOOL = { seatR: 0.16, seatT: 0.035, height: 0.46 };
// [x, y, z, 偏航(弧度)]:各自隨機偏轉 ±5–15°;左前那張被拉開到桌外
export const STOOLS = [[0.38, 0, -0.5, 0.17], [-1.5, 0, -0.88, -0.21], [-2.2, 0, 1.0, 0.12]];

export const BOARD = {
  center: [0, 1.65, -3.76], w: 4.0, h: 1.2,
  zones: { left: { x0: -2.0, w: 1.0 }, center: { x0: -1.0, w: 1.8 }, right: { x0: 0.8, w: 1.2 } },
};
export const CLOCK = { center: [0, 2.6, -3.77], r: 0.16 };
export const TEACHER_DESK = { center: [0, 0, -2.9], w: 1.2, d: 0.6, h: 1.0 };

export const WINDOWS = {
  x: -3.25, w: 1.8, h: 1.6, sill: 0.9, centersZ: [-2.4, -0.2, 2.0],
};
export const OUTDOOR = {
  corridorW: 1.6, floorDrop: 4.0,  // 二樓:操場在下方 4 m
  backdropR: 70,
};

export const PEGBOARD = { x: 3.25, zc: -1.0, w: 2.4, h: 1.2, y0: 1.0 };
export const APRON_RACK = { x: 3.25, zc: 0.62, y: 1.75, count: 4, spacing: 0.27 };
export const DRILL_PRESS = { base: [2.65, 0, 1.3], h: 1.6 };
export const BAND_SAW = { base: [2.6, 0, 2.6], h: 1.65 };

export const LUMBER_RACK = { x0: -3.05, x1: -0.9, z: 3.7, depth: 0.62, levels: [0.12, 0.95, 1.65] };
export const MDF = { w: 2.44, d: 1.22, count: 14 };
export const TIMBER = { x: -0.55, count: 5, len: 2.4 };
export const TRASH_BIN = { pos: [-0.12, 0, 3.38], r: 0.24, h: 0.72 };
export const CABINET = { x0: 0.35, x1: 2.15, z: 3.7, depth: 0.42, h: 1.8, shelves: [0.45, 0.95, 1.4] };
export const DOOR = { xc: 2.7, w: 0.9, h: 2.1 };

export const CEILING_LIGHTS = { xs: [-1.6, 1.6], zs: [-2.4, 0, 2.4], w: 0.6, d: 1.2 };
export const FANS = [[0, 3.0, -1.6], [0, 3.0, 1.8]];

export const VIEWPOINTS = {
  bench: { position: [0, 0, 0], yaw: 0 },        // 面向 −Z(工作桌與黑板)
  board: { position: [0, 0, -1.76], yaw: 0 },    // 講桌前方,正對黑板;距黑板板面 2.0 m(最小字高 4 cm 的可讀距離)
};
export const DESKTOP_VIEWS = {
  bench: { eye: [0, 1.58, 0.62], target: [0, 0.9, -0.75] },
  board: { eye: [0, 1.6, -1.15], target: [0, 1.65, -3.76] },   // 電腦版:退到 2.6 m 才看得到整面黑板(VR 站位仍是 2.0 m)
};
