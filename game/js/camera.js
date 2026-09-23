// ============================================================================
// FUMIGA-GOAT — câmera com zoom e shake
// ============================================================================
import { VIEW_W, VIEW_H, WORLD_W, WORLD_H } from "./config.js";
import { clamp, rand, TAU } from "./utils.js";
import { G } from "./state.js";

export const cam = {
  x: WORLD_W / 2, y: WORLD_H / 2,
  zoom: 1.15, minZoom: 0.55, maxZoom: 2.0,
  trauma: 0, offsetX: 0, offsetY: 0,
};

export function camReset() {
  cam.x = WORLD_W / 2; cam.y = WORLD_H / 2;
  cam.zoom = 1.15; cam.trauma = 0; cam.offsetX = cam.offsetY = 0;
}

export function shake(amount) { cam.trauma = Math.min(1.2, cam.trauma + amount); }

export function updateCam(dt, moveX, moveY) {
  const spd = 620 / cam.zoom;
  cam.x += moveX * spd * dt;
  cam.y += moveY * spd * dt;
  clampCam();
  if (cam.trauma > 0.001) {
    cam.trauma = Math.max(0, cam.trauma - dt * 1.6);
    // OPÇÕES → VÍDEO → TREMOR DE TELA: desligado = trauma decai mas a
    // câmera não balança (antes a opção existia e não fazia nada).
    if (G.save && G.save.settings && G.save.settings.screenshake === false) {
      cam.offsetX = cam.offsetY = 0;
      return;
    }
    const m = cam.trauma * cam.trauma * 9;
    cam.offsetX = rand(-m, m);
    cam.offsetY = rand(-m, m);
  } else { cam.offsetX = cam.offsetY = 0; }
}

export function zoomCam(dir, mx, my) {
  const before = screenToWorld(mx, my);
  cam.zoom = clamp(cam.zoom * (dir > 0 ? 0.867 : 1.153), cam.minZoom, cam.maxZoom);
  const after = screenToWorld(mx, my);
  cam.x += before.x - after.x;
  cam.y += before.y - after.y;
  clampCam();
}

/** Pan manual (arrastar com o mouse). */
export function panCam(dx, dy) {
  cam.x += dx;
  cam.y += dy;
  clampCam();
}

function clampCam() {
  const vw = VIEW_W / 2 / cam.zoom, vh = VIEW_H / 2 / cam.zoom;
  cam.x = clamp(cam.x, vw - 160, WORLD_W - vw + 160);
  cam.y = clamp(cam.y, vh - 160, WORLD_H - vh + 160);
}

export function screenToWorld(sx, sy) {
  return {
    x: cam.x + (sx - VIEW_W / 2) / cam.zoom,
    y: cam.y + (sy - VIEW_H / 2) / cam.zoom,
  };
}

export function worldToScreen(wx, wy) {
  return {
    x: (wx - cam.x) * cam.zoom + VIEW_W / 2 + cam.offsetX,
    y: (wy - cam.y) * cam.zoom + VIEW_H / 2 + cam.offsetY,
  };
}

export function visibleWorldRect(margin = 64) {
  const vw = VIEW_W / cam.zoom, vh = VIEW_H / cam.zoom;
  return {
    x0: cam.x - vw / 2 - margin, y0: cam.y - vh / 2 - margin,
    x1: cam.x + vw / 2 + margin, y1: cam.y + vh / 2 + margin,
  };
}
