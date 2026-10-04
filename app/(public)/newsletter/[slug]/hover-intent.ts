interface HoverIntentOptions<T> {
  /** How long the pointer must rest on a target before showing */
  showDelay: number;
  /** Grace period after leaving, so the pointer can move into the tooltip */
  hideDelay: number;
  onShow: (target: T) => void;
  onHide: () => void;
}

/**
 * Delayed show / grace-period hide for hover tooltips.
 * `enter` when the pointer reaches a target, `leave` when it leaves the target
 * or the tooltip, and `hold` when it enters the tooltip itself.
 */
export function createHoverIntent<T>({ showDelay, hideDelay, onShow, onHide }: HoverIntentOptions<T>) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let shown = false;

  const clear = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  return {
    enter(target: T) {
      clear();
      if (shown) {
        onShow(target);
        return;
      }
      timer = setTimeout(() => {
        shown = true;
        onShow(target);
      }, showDelay);
    },
    leave() {
      clear();
      if (!shown) return;
      timer = setTimeout(() => {
        shown = false;
        onHide();
      }, hideDelay);
    },
    hold() {
      clear();
    },
    cancel() {
      clear();
    },
  };
}
