const DEFAULT_EASING = "cubic-bezier(0.22, 0.61, 0.36, 1)";

export function movePlaceholderNode(placeholder, target, fromIndex, toIndex) {
  const parent = placeholder?.parentNode;
  if (!parent || parent !== target?.parentNode) return;
  if (fromIndex < toIndex) {
    parent.insertBefore(placeholder, target.nextSibling);
    return;
  }
  parent.insertBefore(placeholder, target);
}

export function getAdjacentByDirection(node, direction, accept) {
  let current = node;
  while (current) {
    current = direction > 0 ? current.nextElementSibling : current.previousElementSibling;
    if (!current) return null;
    if (!(current instanceof HTMLElement)) continue;
    if (!accept(current)) continue;
    return current;
  }
  return null;
}

export function animateNeighborShift({
  node,
  beforeRect,
  animations,
  duration = 170,
  easing = DEFAULT_EASING,
}) {
  if (!(node instanceof HTMLElement) || !beforeRect || !(animations instanceof WeakMap)) return;
  const afterRect = node.getBoundingClientRect();
  const dx = beforeRect.left - afterRect.left;
  const dy = beforeRect.top - afterRect.top;
  if (!dx && !dy) return;

  const previous = animations.get(node);
  if (previous) previous.cancel();

  const animation = node.animate(
    [
      { transform: `translate3d(${dx}px, ${dy}px, 0)` },
      { transform: "translate3d(0, 0, 0)" },
    ],
    { duration, easing }
  );

  const cleanup = () => {
    if (animations.get(node) === animation) {
      animations.delete(node);
    }
  };
  animation.onfinish = cleanup;
  animation.oncancel = cleanup;
  animations.set(node, animation);
}

export function stopNeighborAnimations(nodes, animations) {
  if (!(animations instanceof WeakMap) || !Array.isArray(nodes)) return;
  nodes.forEach((node) => {
    const animation = animations.get(node);
    if (animation) animation.cancel();
  });
}
