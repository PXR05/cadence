function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

class PlayerDetailMotionState {
  translateY = $state(1);
  closedPosition = $state(1);
  isDragging = $state(false);
  isAnimating = $state(false);

  get closedProgress() {
    if (this.closedPosition <= 0) {
      return 0;
    }

    return clamp(this.translateY / this.closedPosition, 0, 1);
  }

  get openProgress() {
    return 1 - this.closedProgress;
  }

  setMotion(translateY: number, closedPosition: number) {
    const safeClosedPosition = Math.max(closedPosition, 1);
    this.closedPosition = safeClosedPosition;
    this.translateY = clamp(translateY, 0, safeClosedPosition);
  }

  setDragging(isDragging: boolean) {
    this.isDragging = isDragging;
  }

  setAnimating(isAnimating: boolean) {
    this.isAnimating = isAnimating;
  }

  reset() {
    this.translateY = 1;
    this.closedPosition = 1;
    this.isDragging = false;
    this.isAnimating = false;
  }
}

export const playerDetailMotionStore = new PlayerDetailMotionState();
