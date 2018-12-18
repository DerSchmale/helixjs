/**
 * @ignore
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
export function RenderItem()
{
    this.worldMatrix = null;
    this.prevWorldMatrix = null;
    this.meshInstance = null;
    this.skeleton = null;
    this.skeletonMatrices = null;
    this.material = null;
    this.renderOrderHint = 0;
    this.worldBounds = null;

    // to store this in a linked list for pooling
    this.next = null;
}