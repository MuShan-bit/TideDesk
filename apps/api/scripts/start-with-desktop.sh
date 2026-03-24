#!/bin/sh

set -eu

if [ "${ENABLE_X_BROWSER_REMOTE_DESKTOP:-1}" = "1" ]; then
  export DISPLAY="${DISPLAY:-:99}"
  export X_BROWSER_REMOTE_DESKTOP_PORT="${X_BROWSER_REMOTE_DESKTOP_PORT:-6080}"
  export X_BROWSER_VNC_PORT="${X_BROWSER_VNC_PORT:-5900}"
  export X_BROWSER_DESKTOP_GEOMETRY="${X_BROWSER_DESKTOP_GEOMETRY:-1440x1024x24}"
  DISPLAY_NUMBER="${DISPLAY#:}"
  X_LOCK_FILE="/tmp/.X${DISPLAY_NUMBER}-lock"
  X_SOCKET_FILE="/tmp/.X11-unix/X${DISPLAY_NUMBER}"

  if [ -e "$X_LOCK_FILE" ] || [ -e "$X_SOCKET_FILE" ]; then
    if ! ps -ef | grep "[X]vfb $DISPLAY" >/dev/null 2>&1; then
      echo "[browser-desktop] removing stale Xvfb lock for $DISPLAY"
      rm -f "$X_LOCK_FILE" "$X_SOCKET_FILE"
    fi
  fi

  Xvfb "$DISPLAY" -screen 0 "$X_BROWSER_DESKTOP_GEOMETRY" -ac +extension RANDR >/tmp/xvfb.log 2>&1 &
  XVFB_PID=$!

  sleep 1

  if ! kill -0 "$XVFB_PID" 2>/dev/null; then
    echo "[browser-desktop] Xvfb failed to start for $DISPLAY"
    cat /tmp/xvfb.log || true
    exit 1
  fi

  if [ ! -S "$X_SOCKET_FILE" ]; then
    echo "[browser-desktop] Xvfb did not create socket $X_SOCKET_FILE"
    cat /tmp/xvfb.log || true
    kill "$XVFB_PID" 2>/dev/null || true
    exit 1
  fi

  fluxbox >/tmp/fluxbox.log 2>&1 &
  FLUXBOX_PID=$!

  x11vnc \
    -display "$DISPLAY" \
    -forever \
    -shared \
    -nopw \
    -xkb \
    -noxdamage \
    -rfbport "$X_BROWSER_VNC_PORT" \
    >/tmp/x11vnc.log 2>&1 &
  X11VNC_PID=$!

  websockify \
    --web=/usr/share/novnc/ \
    "$X_BROWSER_REMOTE_DESKTOP_PORT" \
    "127.0.0.1:$X_BROWSER_VNC_PORT" \
    >/tmp/websockify.log 2>&1 &
  WEBSOCKIFY_PID=$!

  cleanup() {
    kill "$WEBSOCKIFY_PID" "$X11VNC_PID" "$FLUXBOX_PID" "$XVFB_PID" 2>/dev/null || true
  }

  trap cleanup EXIT INT TERM

  echo "[browser-desktop] DISPLAY=$DISPLAY"
  echo "[browser-desktop] noVNC listening on 0.0.0.0:${X_BROWSER_REMOTE_DESKTOP_PORT}"
fi

pnpm db:migrate:deploy
exec pnpm --filter api start:prod
