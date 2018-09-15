/**
 * @ignore
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
import {Matrix4x4} from "../math/Matrix4x4";

export function RenderItem()
{
    this.worldMatrix = null;
    this.proxyMatrix = new Matrix4x4();    // assigned if worldMatrix = null
    this.meshInstance = null;
    this.skeleton = null;
    this.skeletonMatrices = null;
    this.material = null;
    this.renderOrderHint = 0;
    this.worldBounds = null;

    // to store this in a linked list for pooling
    this.next = null;
}