/**
 * @ignore
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
export function UniformBufferSlot() {
    this.blockIndex = -1;
    this.bindingPoint = -1;
    this.buffer = null;
    this.name = null;   // for debugging
}