let guiActive = false;

/** set whether a GUI control is currently being interacted with. */
export function setGuiActive(active: boolean): void {
  guiActive = active;
}

/** whether a GUI control is currently being interacted with. */
export function getGuiActive(): boolean {
  return guiActive;
}
