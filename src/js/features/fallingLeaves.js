// Falling autumn leaves over the whole page (falling-leaves 0.1.0, MIT, vendored in src/vendor).
// Clicks pass through the layer, and it stays still when the system asks for reduced motion.
import { FallingLeaves } from "../../vendor/falling-leaves/index.js";

export function initFallingLeaves() {
  return new FallingLeaves({
    count: 10,
    wind: 0.2,
    speed: 0.8,
    size: [20, 35],
    shapes: ["maple", "oak", "birch"],
  });
}
