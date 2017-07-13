import {RenderItem} from "./RenderItem";

/**
 * @ignore
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
export function RenderItemPool()
{
    var head = null;
    var pool = null;

    this.getItem = function()
    {
        var item;

        if (head) {
            item = head;
            head = head.next;
        }
        else {
            item = new RenderItem();
            item.next = pool;
            pool = item;
        }

        return item;
    };

    this.reset = function()
    {
        head = pool;
    };
}