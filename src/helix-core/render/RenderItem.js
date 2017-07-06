/**
 *
 * @constructor
 */
export function RenderItem()
{
    this.worldMatrix = null;
    this.meshInstance = null;
    this.skeleton = null;
    this.skeletonMatrices = null;
    this.material = null;
    this.camera = null;
    this.renderOrderHint = 0;

    // to store this in a linked list for pooling
    this.next = null;
}